import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAddrAsAddress} from '../../src/tapd_responses/index.js';
import {rpcReceiveEventAsReceiveUpdate} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_responses.js';

const [addr] = responses.queryAddrs.addrs;
const transactionId = 'ab'.repeat(32);

const makeEvent = (overrides?: object): any => ({
  address: addr,
  confirmation_height: 0,
  error: '',
  outpoint: `${transactionId}:0`,
  status: 'ADDR_EVENT_STATUS_TRANSACTION_DETECTED',
  timestamp: '1700000000123456',
  ...overrides,
});

const tests = [
  {
    args: undefined,
    description: 'Details are expected',
    error: 'ExpectedRpcReceiveEventDetails',
  },
  {
    args: makeEvent({status: 'ADDR_EVENT_STATUS_NEW'}),
    description: 'A known status is expected',
    error: 'ExpectedKnownStatusInRpcReceiveEvent',
  },
  {
    args: makeEvent({timestamp: 1}),
    description: 'A timestamp is expected',
    error: 'ExpectedTimestampInRpcReceiveEvent',
  },
  {
    args: makeEvent({address: null}),
    description: 'An address is expected',
    error: 'ExpectedRpcAddressDetails',
  },
  {
    args: makeEvent(),
    description: 'A receive event in microseconds is mapped',
    expected: {
      address: rpcAddrAsAddress(addr),
      confirmation_height: undefined,
      error: undefined,
      status: 'transaction_detected',
      transaction_id: transactionId,
      transaction_vout: 0,
      updated_at: '2023-11-14T22:13:20.123Z',
    },
  },
  {
    args: makeEvent({
      confirmation_height: 120,
      error: 'proof courier failed',
      outpoint: '',
      status: 'ADDR_EVENT_STATUS_PROOF_RECEIVED',
    }),
    description: 'A receive event with an error and no outpoint is mapped',
    expected: {
      address: rpcAddrAsAddress(addr),
      confirmation_height: 120,
      error: 'proof courier failed',
      status: 'proof_received',
      updated_at: '2023-11-14T22:13:20.123Z',
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcReceiveEventAsReceiveUpdate(args), new Error(error));
    } else {
      deepStrictEqual(rpcReceiveEventAsReceiveUpdate(args), expected);
    }

    return;
  });
});
