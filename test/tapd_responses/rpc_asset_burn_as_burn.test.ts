import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAssetBurnAsBurn} from '../../src/tapd_responses/index.js';
import {assetResponses} from '../fixtures/tapd_asset_responses.js';

const [rpcBurn] = assetResponses.listBurns.burns;

test('A real tapd burn is mapped, with the transaction id in display order', () => {
  deepStrictEqual(rpcAssetBurnAsBurn(rpcBurn), {
    amount: '5',
    asset_id:
      '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2',
    group_key: undefined,
    is_collectible: false,
    note: 'fork test burn',
    transaction_id:
      '2272ef668566570cf57ec502d2fb6302ee439bb33ce8d856d03e6f00bb31c661',
  });
});

test('The anchor transaction id buffer is not changed', () => {
  const before = rpcBurn.anchor_txid.toString('hex');

  rpcAssetBurnAsBurn(rpcBurn);

  deepStrictEqual(rpcBurn.anchor_txid.toString('hex'), before);
});

const errors = [
  {args: null, error: 'ExpectedRpcAssetBurnDetails'},
  {
    args: {...rpcBurn, amount: undefined},
    error: 'ExpectedAmountInRpcAssetBurn',
  },
  {
    args: {...rpcBurn, anchor_txid: Buffer.alloc(31)},
    error: 'ExpectedAnchorTransactionIdInRpcAssetBurn',
  },
  {
    args: {...rpcBurn, asset_id: Buffer.alloc(0)},
    error: 'ExpectedAssetIdInRpcAssetBurn',
  },
];

errors.forEach(({args, error}) => {
  return test(`A bad burn is ${error}`, () => {
    throws(() => rpcAssetBurnAsBurn(args), new Error(error));
  });
});
