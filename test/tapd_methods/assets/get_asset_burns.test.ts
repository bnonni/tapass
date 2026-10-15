import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetBurns} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {assetResponses} from '../../fixtures/tapd_asset_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const groupKey = `02${'aa'.repeat(32)}`;
const txId = '2272ef668566570cf57ec502d2fb6302ee439bb33ce8d856d03e6f00bb31c661';

const tapdWith = (listBurns: (req: any, cbk: Function) => void) => {
  return {default: {listBurns}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, assetResponses.listBurns));

const tests = [
  {
    args: {asset_id: 'id', tapd},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToGetAssetBurns'],
  },
  {
    args: {group_key: 'key', tapd},
    description: 'A hex group key is expected',
    error: [400, 'ExpectedGroupKeyHexToGetAssetBurns'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetBurns'],
  },
  {
    args: {tapd, transaction_id: 'tx'},
    description: 'A hex transaction id is expected',
    error: [400, 'ExpectedTransactionIdHexToGetAssetBurns'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetBurns'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetBurns'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetBurns', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of burns is expected',
    error: [503, 'ExpectedArrayOfBurnsInAssetBurnsResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {burns: [{}]}))},
    description: 'Valid burns are expected',
    error: [503, 'ExpectedAmountInRpcAssetBurn'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetBurns(args), error, 'Got expected error');

    return;
  });
});

test('Real tapd burns are returned', async () => {
  const {burns} = await getAssetBurns({tapd});

  deepStrictEqual(
    burns.map(n => n.transaction_id),
    [txId],
  );
});

test('The request has the filters, with the transaction id in internal order', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {burns: []});
  });

  await getAssetBurns({tapd});
  await getAssetBurns({
    asset_id: assetId,
    group_key: groupKey,
    tapd,
    transaction_id: txId,
  });

  deepStrictEqual(requests, [
    {
      anchor_txid: Buffer.alloc(0),
      asset_id: Buffer.alloc(0),
      tweaked_group_key: Buffer.alloc(0),
    },
    {
      anchor_txid: assetResponses.listBurns.burns[0].anchor_txid,
      asset_id: Buffer.from(assetId, 'hex'),
      tweaked_group_key: Buffer.from(groupKey, 'hex'),
    },
  ]);
});
