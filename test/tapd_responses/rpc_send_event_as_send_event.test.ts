import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcSendEventAsSendEvent} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_send_responses.js';

const [first, withTransfer, last] = responses.sendEvents;

const tests = [
  {args: null, error: 'ExpectedRpcSendEventDetails'},
  {
    args: {...first, addresses: null},
    error: 'ExpectedArrayOfAddressesInRpcSendEvent',
  },
  {
    args: {...first, parcel_type: 'PARCEL_TYPE_X'},
    error: 'ExpectedKnownParcelTypeInRpcSendEvent',
  },
  {args: {...first, send_state: ''}, error: 'ExpectedSendStateInRpcSendEvent'},
  {args: {...first, timestamp: 1}, error: 'ExpectedTimestampInRpcSendEvent'},
  {
    args: {...first, virtual_packets: null},
    error: 'ExpectedArrayOfVirtualPacketsInRpcSendEvent',
  },
  {
    args: {...first, passive_virtual_packets: null},
    error: 'ExpectedArrayOfPassivePacketsInRpcSendEvent',
  },
  {
    args: {
      ...withTransfer,
      anchor_transaction: {...withTransfer.anchor_transaction, anchor_psbt: ''},
    },
    error: 'ExpectedAnchorPsbtInRpcSendEvent',
  },
  {
    args: {
      ...withTransfer,
      anchor_transaction: {
        ...withTransfer.anchor_transaction,
        chain_fees_sats: 1,
      },
    },
    error: 'ExpectedChainFeesInRpcSendEvent',
  },
  {
    args: {
      ...withTransfer,
      anchor_transaction: {
        ...withTransfer.anchor_transaction,
        lnd_locked_utxos: null,
      },
    },
    error: 'ExpectedArrayOfLockedUtxosInRpcSendEvent',
  },
  {
    args: {...withTransfer, transfer: {}},
    error: 'ExpectedChainFeesInRpcTransfer',
  },
];

tests.forEach(({args, error}) => {
  return test(`A send event that is not valid throws ${error}`, () => {
    throws(() => rpcSendEventAsSendEvent(args), new Error(error));
  });
});

test('The first real send event is mapped', () => {
  deepStrictEqual(rpcSendEventAsSendEvent(first), {
    addresses: [],
    anchor: undefined,
    at: '2026-10-15T21:48:17.646Z',
    error: undefined,
    label: 'fork-send-1792100897086',
    next_state: 'virtual_commitment_select',
    parcel_type: 'address',
    passive_virtual_packets: [],
    state: 'start_handle_addr_parcel',
    transfer: undefined,
    virtual_packets: [],
  });
});

test('A real send event with the anchor and the transfer is mapped', () => {
  const event = rpcSendEventAsSendEvent(withTransfer);

  deepStrictEqual(event.anchor, {
    change_output_index: 2,
    fee: 6362,
    fee_tokens_per_vbyte: 25,
    locked_utxos: [
      {
        transaction_id:
          '1e7b90aa26dff7fa8bb2f86b2c0b8f1dc426c696a677635e84dd58f8e8dcbe8a',
        transaction_vout: 0,
      },
    ],
    psbt: withTransfer.anchor_transaction.anchor_psbt.toString('hex'),
    transaction: withTransfer.anchor_transaction.final_tx.toString('hex'),
  });

  equal(event.next_state, 'broadcast');
  equal(event.state, 'store_pre_broadcast');
  equal(event.transfer?.label, 'fork-send-1792100897086');
  equal(event.transfer?.outputs.length, 2);
  equal(event.virtual_packets.length, 1);
});

test('The last real send event is complete', () => {
  const event = rpcSendEventAsSendEvent(last);

  equal(event.state, 'complete');
  equal(
    event.transfer?.transaction_id,
    event.transfer?.outputs[0]?.anchor.transaction_id,
  );
});

test('A send error, no change output, and an unknown state are mapped', () => {
  const event = rpcSendEventAsSendEvent({
    ...withTransfer,
    anchor_transaction: {
      ...withTransfer.anchor_transaction,
      change_output_index: -1,
    },
    error: 'failed',
    next_send_state: '',
    send_state: 'NewState',
  });

  equal(event.anchor?.change_output_index, undefined);
  equal(event.error, 'failed');
  equal(event.next_state, undefined);
  equal(event.state, 'NewState');
});
