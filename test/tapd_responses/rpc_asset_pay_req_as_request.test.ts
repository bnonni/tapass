import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAssetPayReqAsRequest} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_channel_responses.js';

const res = responses.decodeAssetPayReq;

const errors = [
  {args: null, error: 'ExpectedRpcAssetPayReqDetails'},
  {
    args: {...res, asset_amount: 1},
    error: 'ExpectedAssetAmountInRpcAssetPayReq',
  },
  {
    args: {...res, genesis_info: null},
    error: 'ExpectedGenesisInfoInRpcAssetPayReq',
  },
  {
    args: {...res, genesis_info: {...res.genesis_info, meta_hash: null}},
    error: 'ExpectedMetaHashInRpcAssetPayReq',
  },
  {args: {...res, pay_req: null}, error: 'ExpectedPayReqInRpcAssetPayReq'},
];

errors.forEach(({args, error}) => {
  return test(`${error} is returned`, () => {
    throws(() => rpcAssetPayReqAsRequest(args), new Error(error));
  });
});

test('A real tapd decoded payment request is mapped', () => {
  const decoded = rpcAssetPayReqAsRequest(res);

  deepStrictEqual(decoded.asset, {
    amount: '5000',
    decimal_display: undefined,
    group_key: undefined,
    id: '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2',
    is_collectible: false,
    meta_hash:
      'f19bbf25df2e3f02ef33bd8edfdea2a176f38f608065f920aeef077644a268bd',
    name: 'smoke-coin',
  });

  equal(decoded.description, 'smoke', 'Got the lnd description');
  equal(
    decoded.id,
    '47dc192123551b37f18beccf1793a7dbe13451ae6783c2779757132f44a5cbe3',
  );
  equal(decoded.tokens, 5000, 'Got the lnd amount');
});
