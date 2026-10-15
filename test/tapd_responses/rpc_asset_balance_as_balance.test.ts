import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAssetBalanceAsBalance} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_responses.js';

const [rpcBalance] = Object.values(
  responses.listBalances.asset_balances,
) as any[];

test('A real tapd balance is mapped', () => {
  deepStrictEqual(rpcAssetBalanceAsBalance(rpcBalance), {
    asset_id:
      '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2',
    balance: '1000000',
    group_key: undefined,
    is_collectible: false,
    meta_hash:
      'f19bbf25df2e3f02ef33bd8edfdea2a176f38f608065f920aeef077644a268bd',
    name: 'smoke-coin',
  });
});

const errors = [
  {args: null, error: 'ExpectedRpcAssetBalanceDetails'},
  {
    args: {...rpcBalance, balance: 1},
    error: 'ExpectedBalanceInRpcAssetBalance',
  },
  {
    args: {...rpcBalance, asset_genesis: null},
    error: 'ExpectedAssetGenesisInRpcAssetBalance',
  },
  {
    args: {
      ...rpcBalance,
      asset_genesis: {...rpcBalance.asset_genesis, meta_hash: ''},
    },
    error: 'ExpectedMetaHashInRpcAssetBalance',
  },
];

errors.forEach(({args, error}) => {
  return test(`A bad balance is ${error}`, () => {
    throws(() => rpcAssetBalanceAsBalance(args), new Error(error));
  });
});
