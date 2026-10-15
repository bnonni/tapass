import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {setTapdDebugLevel} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';

const tapdWith = (debugLevel: (req: any, cbk: Function) => void) => {
  return {default: {debugLevel}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, {sub_systems: ''}));

const tests = [
  {
    args: {level: '', tapd},
    description: 'A level is expected',
    error: [400, 'ExpectedLogLevelToSetTapdDebugLevel'],
  },
  {
    args: {level: 'debug info', tapd},
    description: 'A level without spaces is expected',
    error: [400, 'ExpectedLogLevelToSetTapdDebugLevel'],
  },
  {
    args: {level: 'debug', tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToSetTapdDebugLevel'],
  },
  {
    args: {
      level: 'debug',
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToSetTapdDebugLevel'],
  },
  {
    args: {
      level: 'debug',
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToSetTapdDebugLevel'],
  },
  {
    args: {level: 'loud', tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'A level that tapd does not accept is returned',
    error: [400, 'FailedToSetTapdDebugLevel', {err: 'err'}],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(setTapdDebugLevel(args), error, 'Got expected error');
  });
});

test('The debug level is set', async () => {
  let request: any;

  const tapd = tapdWith((req, cbk) => {
    request = req;

    return cbk(null, {sub_systems: ''});
  });

  deepStrictEqual(
    await setTapdDebugLevel({level: 'TADB=trace,FRTR=info', tapd}),
    undefined,
  );
  deepStrictEqual(request, {level_spec: 'TADB=trace,FRTR=info', show: false});
});
