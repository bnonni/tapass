import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcForwardAsAssetForward} from '../../src/tapd_responses/index.js';
import {overTheWireResponse} from '../fixtures/rfq_wire.js';

const peer = `03${'bb'.repeat(32)}`;

const [rpcForward] = overTheWireResponse('ForwardingHistory', {
  forwards: [
    {
      amt_in_msat: '1000000',
      amt_out_msat: '999000',
      asset_amt: '250',
      asset_spec: {group_pub_key: Buffer.alloc(0), id: Buffer.alloc(32, 7)},
      chan_id_in: '879609302319104001',
      chan_id_out: '1099511693313',
      failed_at: '0',
      htlc_id: '12',
      opened_at: '1700000000',
      peer,
      policy_type: 'RFQ_POLICY_TYPE_PURCHASE',
      rate: {coefficient: '25000000', scale: 3},
      rfq_id: Buffer.alloc(32, 8),
      settled_at: '1700000060',
    },
  ],
  total_count: '1',
}).forwards;

const errors = [
  {args: null, error: 'ExpectedRpcForwardingEvent'},
  {
    args: {...rpcForward, amt_in_msat: ''},
    error: 'ExpectedMsatAmountsInRpcForwardingEvent',
  },
  {
    args: {...rpcForward, asset_amt: 1},
    error: 'ExpectedAssetAmountInRpcForwardingEvent',
  },
  {
    args: {...rpcForward, htlc_id: null},
    error: 'ExpectedHtlcIdInRpcForwardingEvent',
  },
  {
    args: {...rpcForward, opened_at: 'x'},
    error: 'ExpectedOpenedAtInRpcForwardingEvent',
  },
  {
    args: {...rpcForward, policy_type: 'X'},
    error: 'ExpectedKnownPolicyTypeInRpcForwardingEvent',
  },
  {
    args: {...rpcForward, rfq_id: Buffer.alloc(0)},
    error: 'ExpectedRfqIdInRpcForwardingEvent',
  },
];

errors.forEach(({args, error}) => {
  return test(`A forward error is ${error}`, () => {
    throws(() => rpcForwardAsAssetForward(args), new Error(error));
  });
});

test('A forward is mapped', () => {
  deepStrictEqual(rpcForwardAsAssetForward(rpcForward), {
    amount: '250',
    asset_id: Buffer.alloc(32, 7).toString('hex'),
    failed_at: undefined,
    group_key: undefined,
    htlc_index: '12',
    incoming_channel: '800000x1500x1',
    incoming_mtokens: '1000000',
    opened_at: '2023-11-14T22:13:20.000Z',
    outgoing_channel: '1x1x1',
    outgoing_mtokens: '999000',
    peer_public_key: peer,
    rate: '25000.000',
    rfq_id: Buffer.alloc(32, 8).toString('hex'),
    settled_at: '2023-11-14T22:14:20.000Z',
    type: 'purchase',
  });
});

test('A failed sale forward is mapped', () => {
  const forward = rpcForwardAsAssetForward({
    ...rpcForward,
    failed_at: '1700000030',
    peer: '',
    policy_type: 'RFQ_POLICY_TYPE_SALE',
    rate: null,
    settled_at: '0',
  });

  deepStrictEqual(forward.failed_at, '2023-11-14T22:13:50.000Z');
  deepStrictEqual(forward.peer_public_key, undefined);
  deepStrictEqual(forward.rate, undefined);
  deepStrictEqual(forward.settled_at, undefined);
  deepStrictEqual(forward.type, 'sale');
});
