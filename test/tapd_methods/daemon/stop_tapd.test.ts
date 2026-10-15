import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {stopTapd} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';

const tapdWith = (stopDaemon: (req: any, cbk: Function) => void) => {
  return {default: {stopDaemon}} as unknown as AuthenticatedTapd;
};

const tests = [
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToStopTapd'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToStopTapd'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToStopTapd'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorStoppingTapd', {err: 'err'}],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(stopTapd(args), error, 'Got expected error');
  });
});

test('tapd is stopped', async () => {
  let request: any;

  const tapd = tapdWith((req, cbk) => {
    request = req;

    return cbk(null, {});
  });

  deepStrictEqual(await stopTapd({tapd}), undefined);
  deepStrictEqual(request, {});
});
