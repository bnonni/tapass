import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetGroups} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const keyA = `02${'aa'.repeat(32)}`;
const keyB = `03${'00'.repeat(32)}`;

const asset = {
  amount: '7',
  id: Buffer.alloc(32, 1),
  lock_time: 0,
  meta_hash: Buffer.alloc(32, 2),
  relative_lock_time: 0,
  tag: 'coin',
  type: 'NORMAL',
  version: 'ASSET_VERSION_V0',
};

const tapdWith = (listGroups: (req: any, cbk: Function) => void) => {
  return {default: {listGroups}} as unknown as AuthenticatedTapd;
};

const tests = [
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetGroups'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetGroups'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetGroups'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetGroups', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'Groups are expected',
    error: [503, 'ExpectedGroupsInAssetGroupsResponse'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk(null, {groups: {key: {assets: []}}})),
    },
    description: 'Valid groups are expected',
    error: [503, 'ExpectedGroupKeyForRpcGroupedAssets'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetGroups(args), error, 'Got expected error');

    return;
  });
});

test('Real tapd groups are returned', async () => {
  const tapd = tapdWith((_, cbk) => cbk(null, responses.listGroups));

  deepStrictEqual(await getAssetGroups({tapd}), {groups: []});
});

test('Groups are returned, sorted by key', async () => {
  const tapd = tapdWith((_, cbk) => {
    return cbk(null, {
      groups: {[keyB]: {assets: []}, [keyA]: {assets: [asset]}},
    });
  });

  const {groups} = await getAssetGroups({tapd});

  deepStrictEqual(
    groups.map(n => n.key),
    [keyA, keyB],
  );

  deepStrictEqual(groups[0]?.assets[0]?.name, 'coin');
});
