import {deepStrictEqual} from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {equal} from 'node:assert/strict';
import test from 'node:test';

import * as tapass from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {longKeyAsNumber} from '../../../src/tapd_responses/index.js';
import {overTheWireRequest} from '../../fixtures/tapd_channel_responses.js';
import {responses} from '../../fixtures/tapd_channel_responses.js';

const assetId = '01'.repeat(32);
const peer = `02${'aa'.repeat(32)}`;
const requests: Record<string, any> = {};

// Each fake RPC keeps its request and then fails, so each method stops there
const rpcs: Record<string, string> = {
  addInvoice: 'AddInvoice',
  decodeAssetPayReq: 'DecodeAssetPayReq',
  encodeCustomRecords: 'EncodeCustomRecords',
  fundChannel: 'FundChannel',
  listInvoices: 'ListInvoices',
  listPayments: 'ListPayments',
  sendPayment: 'SendPayment',
  subscribeInvoices: 'SubscribeInvoices',
  subscribePayments: 'SubscribePayments',
  trackPayment: 'TrackPayment',
};

const tapchannel = Object.fromEntries(
  Object.entries(rpcs).map(([method, rpc]) => [
    method,
    (req: object, cbk?: Function) => {
      (requests[rpc] = requests[rpc] || []).push(req);

      if (!!cbk) {
        return cbk('stop');
      }

      const stream = Object.assign(new EventEmitter(), {cancel: () => {}});

      setImmediate(() => stream.emit('error', 'stop'));

      return stream;
    },
  ]),
);

const tapd = {tapchannel} as unknown as AuthenticatedTapd;

const ignore = (promise: Promise<unknown>) => promise.catch(() => {});

test('Each request encodes with the tapchannel protos', async () => {
  const {request} = responses.knownPreimageRequest;

  await ignore(
    tapass.openAssetChannel({
      tapd,
      amount: '100',
      asset_id: assetId,
      chain_fee_tokens_per_vbyte: 2,
      give_tokens: 1000,
      partner_public_key: peer,
    }),
  );

  await ignore(
    tapass.encodeAssetCustomRecords({
      tapd,
      assets: [{amount: '300', asset_id: assetId}],
      rfq_id: '03'.repeat(32),
    }),
  );

  await ignore(
    tapass.payAssetInvoice({tapd, asset_id: assetId, max_fee: 5, request}),
  );

  await ignore(
    tapass.sendAssetKeysend({
      tapd,
      amount: '10',
      asset_id: assetId,
      destination: peer,
      secret: '05'.repeat(32),
    }),
  );

  await ignore(
    tapass.createAssetInvoice({
      tapd,
      amount: '100',
      asset_id: assetId,
      description: 'invoice',
      min_amount: '0',
      min_rate: '12.5',
    }),
  );

  await ignore(
    tapass.createAssetInvoice({tapd, asset_id: assetId, tokens: 2000}),
  );

  await ignore(
    tapass.decodeAssetPaymentRequest({tapd, asset_id: assetId, request}),
  );

  await ignore(tapass.getAssetInvoices({tapd, limit: 5}));

  await ignore(tapass.getAssetPayments({tapd, limit: 5}));

  tapass.subscribeToAssetInvoices({added_after: 1, tapd}).on('error', () => {});
  tapass.subscribeToAssetPayments({tapd}).on('error', () => {});
  tapass
    .subscribeToPastAssetPayment({id: '07'.repeat(32), tapd})
    .on('error', () => {});

  equal(Object.keys(requests).length, 10, 'Got a request for each RPC');

  const wire = Object.fromEntries(
    Object.entries(requests).map(([rpc, reqs]) => [
      rpc,
      reqs.map((req: object) => overTheWireRequest(rpc, req)),
    ]),
  );

  const [fund] = wire.FundChannel;

  equal(fund.asset_amount, '100');
  equal(fund.fee_rate_sat_per_vbyte, 2);
  deepStrictEqual(fund.peer_pubkey, Buffer.from(peer, 'hex'));
  equal(fund.push_sat, '1000');

  const [encode] = wire.EncodeCustomRecords;

  equal(encode.input, 'router_send_payment');
  deepStrictEqual(encode.router_send_payment.asset_amounts, {[assetId]: '300'});

  const [pay, keysend] = wire.SendPayment;

  equal(pay.payment_request.payment_request, request);
  equal(pay.payment_request.fee_limit_sat, '5');
  equal(pay.payment_request.timeout_seconds, 25);
  equal(keysend.asset_amount, '10');
  equal(keysend.payment_request.amt, '354');

  const [keysendRecordType] = Object.keys(
    keysend.payment_request.dest_custom_records,
  );

  equal(
    longKeyAsNumber(keysendRecordType ?? ''),
    '5482373484',
    'The keysend record type is on the wire',
  );

  const [assetInvoice, satsInvoice] = wire.AddInvoice;

  equal(assetInvoice.asset_amount, '100');
  equal(assetInvoice.asset_min_amt, '0', 'The optional minimum is sent');
  deepStrictEqual(assetInvoice.asset_rate_limit, {
    coefficient: '125',
    scale: 1,
  });
  equal(assetInvoice.invoice_request.memo, 'invoice');
  equal(assetInvoice.invoice_request.r_preimage.length, 32);
  equal(satsInvoice.asset_amount, '0');
  equal(satsInvoice.invoice_request.value, '2000');
  equal(satsInvoice.asset_min_amt, undefined, 'No minimum when not given');

  equal(wire.DecodeAssetPayReq[0].pay_req_string, request);
  equal(wire.ListInvoices[0].request.num_max_invoices, '5');
  equal(wire.ListPayments[0].request.max_payments, '5');
  equal(wire.SubscribeInvoices[0].request.add_index, '1');
  equal(wire.SubscribePayments[0].request.no_inflight_updates, false);
  deepStrictEqual(
    wire.TrackPayment[0].request.payment_hash,
    Buffer.alloc(32, 7),
  );
});
