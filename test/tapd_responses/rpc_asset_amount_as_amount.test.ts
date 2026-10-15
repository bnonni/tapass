import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAssetAmountAsAmount} from '../../src/tapd_responses/index.js';

const tests = [
  {
    args: null,
    description: 'Details are expected',
    error: 'ExpectedRpcAssetAmountDetails',
  },
  {
    args: {amount: 1, asset_id: Buffer.alloc(32), group_key: Buffer.alloc(0)},
    description: 'A numeric amount is expected',
    error: 'ExpectedAmountInRpcAssetAmount',
  },
  {
    args: {amount: '1', asset_id: Buffer.alloc(0), group_key: Buffer.alloc(0)},
    description: 'An asset id is expected',
    error: 'ExpectedAssetIdInRpcAssetAmount',
  },
  {
    args: {
      amount: '25',
      asset_id: Buffer.alloc(32, 1),
      group_key: Buffer.alloc(0),
    },
    description: 'An asset amount is mapped',
    expected: {
      amount: '25',
      asset_id: Buffer.alloc(32, 1).toString('hex'),
      group_key: undefined,
    },
  },
  {
    args: {
      amount: '25',
      asset_id: Buffer.alloc(32, 1),
      group_key: Buffer.alloc(33, 2),
    },
    description: 'A group key is mapped',
    expected: {
      amount: '25',
      asset_id: Buffer.alloc(32, 1).toString('hex'),
      group_key: Buffer.alloc(33, 2).toString('hex'),
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcAssetAmountAsAmount(args as any), new Error(error));
    } else {
      deepStrictEqual(rpcAssetAmountAsAmount(args as any), expected);
    }

    return;
  });
});
