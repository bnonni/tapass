import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcGroupedAssetsAsGroup} from '../../src/tapd_responses/index.js';

const key = `02${'11'.repeat(32)}`;

const asset = {
  amount: '100',
  id: Buffer.alloc(32, 1),
  lock_time: 0,
  meta_hash: Buffer.alloc(32, 2),
  relative_lock_time: 5,
  tag: 'coin',
  type: 'COLLECTIBLE',
  version: 'ASSET_VERSION_V1',
};

test('A group is mapped', () => {
  deepStrictEqual(rpcGroupedAssetsAsGroup({group: {assets: [asset]}, key}), {
    assets: [
      {
        amount: '100',
        asset_id: Buffer.alloc(32, 1).toString('hex'),
        is_collectible: true,
        lock_time: undefined,
        meta_hash: Buffer.alloc(32, 2).toString('hex'),
        name: 'coin',
        relative_lock_time: 5,
        version: 1,
      },
    ],
    key,
  });
});

const errors = [
  {
    args: {group: {assets: []}, key: 'key'},
    error: 'ExpectedGroupKeyForRpcGroupedAssets',
  },
  {args: {group: null, key}, error: 'ExpectedArrayOfAssetsInRpcGroupedAssets'},
  {
    args: {group: {assets: [{...asset, amount: 1}]}, key},
    error: 'ExpectedAmountInRpcGroupedAsset',
  },
  {
    args: {group: {assets: [{...asset, id: null}]}, key},
    error: 'ExpectedAssetIdAndMetaHashInRpcGroupedAsset',
  },
];

errors.forEach(({args, error}) => {
  return test(`A bad group is ${error}`, () => {
    throws(() => rpcGroupedAssetsAsGroup(args as any), new Error(error));
  });
});
