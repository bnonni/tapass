import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {sendAsset} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_send_responses.js';

const addresses = [{address: 'taprt1address'}];

const tapdWith = (sendAsset: (req: any, cbk: Function) => void) => {
  return {default: {sendAsset}} as unknown as AuthenticatedTapd;
};

const failWith = (details: string) =>
  tapdWith((_, cbk) => cbk({code: 2, details}));

const tapd = tapdWith((_, cbk) => cbk(null, responses.sendAsset));

const tests = [
  {
    args: {addresses: [], tapd},
    description: 'Addresses are expected',
    error: [400, 'ExpectedAddressesToSendAsset'],
  },
  {
    args: {addresses: [{address: ''}], tapd},
    description: 'An address is expected for each recipient',
    error: [400, 'ExpectedAddressForEachSendAssetRecipient'],
  },
  {
    args: {addresses: [{address: 'taprt1address', amount: '1.5'}], tapd},
    description: 'A numeric amount is expected',
    error: [400, 'ExpectedNumericAmountToSendAsset'],
  },
  {
    args: {addresses, fee_tokens_per_vbyte: 0, tapd},
    description: 'A positive fee rate is expected',
    error: [400, 'ExpectedPositiveFeeRateToSendAsset'],
  },
  {
    args: {addresses, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToSendAsset'],
  },
  {
    args: {
      addresses,
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToSendAsset'],
  },
  {
    args: {addresses, tapd: failWith('permission denied')},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToSendAsset'],
  },
  {
    args: {
      addresses,
      tapd: failWith('error parsing addresses: invalid character'),
    },
    description: 'An address that is not valid is returned',
    error: [
      400,
      'ExpectedValidAddressesToSendAsset',
      {err: {code: 2, details: 'error parsing addresses: invalid character'}},
    ],
  },
  {
    args: {
      addresses,
      tapd: failWith('manual fee rate below floor: (fee_rate=250 sat/kw)'),
    },
    description: 'A fee rate below the floor is returned',
    error: [
      400,
      'ExpectedHigherFeeRateToSendAsset',
      {
        err: {
          code: 2,
          details: 'manual fee rate below floor: (fee_rate=250 sat/kw)',
        },
      },
    ],
  },
  {
    args: {
      addresses,
      tapd: failWith(
        'unable to select coins: failed to find coin(s) that satisfy given constraints',
      ),
    },
    description: 'Insufficient assets are returned',
    error: [400, 'InsufficientAssetsToSendAsset'],
  },
  {
    args: {addresses, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorSendingAsset', {err: 'err'}],
  },
  {
    args: {addresses, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToSendAssetRequest'],
  },
  {
    args: {addresses, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A transfer is expected',
    error: [503, 'ExpectedRpcTransferDetails'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(sendAsset(args), error, 'Got expected error');
  });
});

test('A real send is returned as a transfer', async () => {
  const transfer = await sendAsset({addresses, tapd});

  equal(transfer.fee, 6362);
  equal(transfer.outputs.length, 2);
  equal(
    transfer.transaction_id,
    'c94adff6655fcbadf9d5acefa3a552c573b305846a9397927a73f7603b276964',
  );
});

test('The request has the addresses, the fee rate, and the label', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, responses.sendAsset);
  });

  await sendAsset({addresses, tapd});

  await sendAsset({
    addresses: [{address: 'taprt1a', amount: '5'}, {address: 'taprt1b'}],
    fee_tokens_per_vbyte: 1.5,
    is_courier_ping_skipped: true,
    label: 'label',
    tapd,
  });

  deepStrictEqual(requests, [
    {
      addresses_with_amounts: [],
      fee_rate: 0,
      label: '',
      skip_proof_courier_ping_check: false,
      tap_addrs: ['taprt1address'],
    },
    {
      addresses_with_amounts: [
        {amount: '5', tap_addr: 'taprt1a'},
        {amount: '0', tap_addr: 'taprt1b'},
      ],
      fee_rate: 375,
      label: 'label',
      skip_proof_courier_ping_check: true,
      tap_addrs: [],
    },
  ]);
});
