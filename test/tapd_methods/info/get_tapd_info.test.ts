import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getTapdInfo} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const tapdWith = (getInfo: (req: any, cbk: Function) => void) => {
  return {default: {getInfo}} as unknown as AuthenticatedTapd;
};

const {getInfo} = responses;

const tests = [
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetTapdInfo'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetTapdInfo'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetTapdInfo'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingTapdInfo', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A version is expected',
    error: [503, 'ExpectedVersionInTapdInfoResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {...getInfo, block_hash: ''}))},
    description: 'A block hash is expected',
    error: [503, 'ExpectedBlockHashInTapdInfoResponse'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) =>
        cbk(null, {...getInfo, lnd_identity_pubkey: 'key'}),
      ),
    },
    description: 'An lnd public key is expected',
    error: [503, 'ExpectedLndPublicKeyInTapdInfoResponse'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getTapdInfo(args), error, 'Got expected error');

    return;
  });
});

test('Real tapd info is returned', async () => {
  const tapd = tapdWith((_, cbk) => cbk(null, getInfo));

  deepStrictEqual(await getTapdInfo({tapd}), {
    alias: 'bob',
    current_block_hash:
      '1b806a673ad16b34a5d9392148af7d6f05ca3905b56319b7aecd106daf210e64',
    current_block_height: 108,
    is_synced_to_chain: true,
    lnd_version: '0.20.0-beta',
    network: 'regtest',
    public_key:
      '028548081b6e8c4026ac92beaec35d3b86aab214563a167bd64365e3676c190ff8',
    version: '0.7.0-alpha commit=v0.7.0',
  });
});
