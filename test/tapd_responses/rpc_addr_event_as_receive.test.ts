import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAddrAsAddress} from '../../src/tapd_responses/index.js';
import {rpcAddrEventAsReceive} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_responses.js';

const [addr] = responses.queryAddrs.addrs;
const transactionId = 'ab'.repeat(32);

const makeEvent = (overrides?: object): any => ({
  addr,
  confirmation_height: 110,
  creation_time_unix_seconds: '1700000000',
  has_proof: true,
  outpoint: `${transactionId}:1`,
  status: 'ADDR_EVENT_STATUS_COMPLETED',
  taproot_sibling: Buffer.alloc(0),
  utxo_amt_sat: '1000',
  ...overrides,
});

const tests = [
  {
    args: null,
    description: 'Details are expected',
    error: 'ExpectedRpcAddressEventDetails',
  },
  {
    args: makeEvent({creation_time_unix_seconds: undefined}),
    description: 'A creation time is expected',
    error: 'ExpectedCreationTimeInRpcAddressEvent',
  },
  {
    args: makeEvent({status: 'ADDR_EVENT_STATUS_NEW'}),
    description: 'A known status is expected',
    error: 'ExpectedKnownStatusInRpcAddressEvent',
  },
  {
    args: makeEvent({taproot_sibling: null}),
    description: 'A taproot sibling is expected',
    error: 'ExpectedTaprootSiblingInRpcAddressEvent',
  },
  {
    args: makeEvent({utxo_amt_sat: 1}),
    description: 'A UTXO amount is expected',
    error: 'ExpectedUtxoAmountInRpcAddressEvent',
  },
  {
    args: makeEvent({addr: null}),
    description: 'An address is expected',
    error: 'ExpectedRpcAddressDetails',
  },
  {
    args: makeEvent({outpoint: ''}),
    description: 'An outpoint is expected',
    error: 'ExpectedOutpointWithTransactionIdAndOutputIndex',
  },
  {
    args: makeEvent(),
    description: 'An address event is mapped',
    expected: {
      address: rpcAddrAsAddress(addr),
      confirmation_height: 110,
      created_at: '2023-11-14T22:13:20.000Z',
      is_proof_available: true,
      status: 'completed',
      tapscript_sibling: undefined,
      tokens: 1000,
      transaction_id: transactionId,
      transaction_vout: 1,
    },
  },
  {
    args: makeEvent({
      confirmation_height: 0,
      has_proof: false,
      status: 'ADDR_EVENT_STATUS_TRANSACTION_DETECTED',
      taproot_sibling: Buffer.alloc(32, 1),
    }),
    description: 'An unconfirmed address event is mapped',
    expected: {
      address: rpcAddrAsAddress(addr),
      confirmation_height: undefined,
      created_at: '2023-11-14T22:13:20.000Z',
      is_proof_available: false,
      status: 'transaction_detected',
      tapscript_sibling: Buffer.alloc(32, 1).toString('hex'),
      tokens: 1000,
      transaction_id: transactionId,
      transaction_vout: 1,
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcAddrEventAsReceive(args), new Error(error), 'Got error');
    } else {
      deepStrictEqual(rpcAddrEventAsReceive(args), expected, 'Got receive');
    }

    return;
  });
});
