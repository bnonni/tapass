import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetTransfers} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_send_responses.js';

const txId = 'c94adff6655fcbadf9d5acefa3a552c573b305846a9397927a73f7603b276964';

const tapdWith = (listTransfers: (req: any, cbk: Function) => void) => {
  return {default: {listTransfers}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, responses.listTransfers));

const tests = [
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetTransfers'],
  },
  {
    args: {tapd, transaction_id: 'tx'},
    description: 'A transaction id is expected',
    error: [400, 'ExpectedTransactionIdToGetAssetTransfers'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetTransfers'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetTransfers'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetTransfers', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of transfers is expected',
    error: [503, 'ExpectedArrayOfTransfersInTransfersList'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {transfers: [{}]}))},
    description: 'Valid transfers are expected',
    error: [503, 'ExpectedChainFeesInRpcTransfer'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetTransfers(args), error, 'Got expected error');
  });
});

test('Real transfers are returned', async () => {
  const {transfers} = await getAssetTransfers({tapd});

  equal(transfers.length, 1);
  equal(transfers[0]?.block_height, 109);
  equal(transfers[0]?.transaction_id, txId);
});

test('The request has the transaction id filter', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {transfers: []});
  });

  await getAssetTransfers({tapd});
  await getAssetTransfers({tapd, transaction_id: txId});

  deepStrictEqual(requests, [{anchor_txid: ''}, {anchor_txid: txId}]);
});
