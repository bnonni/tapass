import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {confirmedFromPayment} from 'lightning/lnd_responses/index.js';

import {payAssetInvoice} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {fakeStream} from '../../fixtures/tapd_channel_responses.js';
import {makeLndPayment} from '../../fixtures/tapd_channel_responses.js';
import {overTheWireResponse} from '../../fixtures/tapd_channel_responses.js';
import {responses} from '../../fixtures/tapd_channel_responses.js';
import {rpcSellQuote} from '../../fixtures/rfq_wire.js';
import {sellQuote} from '../../fixtures/rfq_wire.js';

const assetId = '01'.repeat(32);
const {request} = responses.knownPreimageRequest;

// Updates the way the client reads them from the SendPayment stream
const update = (result: object) => overTheWireResponse('SendPayment', result);
const quoteUpdate = update({accepted_sell_order: rpcSellQuote});
const quotesUpdate = update({
  accepted_sell_orders: {accepted_sell_orders: [rpcSellQuote]},
});
const paymentUpdate = (status: string) => {
  return update({payment_result: makeLndPayment({status})});
};

const tapdWith = (events: [string, unknown][]) => {
  const sendPayment = () => fakeStream(events);

  return {tapchannel: {sendPayment}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith([
  ['data', quoteUpdate],
  ['data', quotesUpdate],
  ['data', paymentUpdate('IN_FLIGHT')],
  ['data', paymentUpdate('SUCCEEDED')],
  ['end', undefined],
]);

const args = {asset_id: assetId, request, tapd};

const tests = [
  {
    args: {...args, asset_id: undefined},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToPayAssetInvoice'],
  },
  {
    args: {...args, group_key: `02${'aa'.repeat(32)}`},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'UnexpectedAssetIdAndGroupKeyToPayAssetInvoice'],
  },
  {
    args: {...args, asset_id: 'id'},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToPayAssetInvoice'],
  },
  {
    args: {...args, asset_id: undefined, group_key: 'key'},
    description: 'A group key is expected',
    error: [400, 'ExpectedGroupKeyHexToPayAssetInvoice'],
  },
  {
    args: {...args, max_fee: 1, max_fee_mtokens: '1000'},
    description: 'Only one fee limit is expected',
    error: [400, 'ExpectedEitherMaxFeeOrMaxFeeMtokensToPayAssetInvoice'],
  },
  {
    args: {...args, max_fee: -1},
    description: 'A max fee is not negative',
    error: [400, 'ExpectedMaxFeeTokensToPayAssetInvoice'],
  },
  {
    args: {...args, max_fee_mtokens: '1.5'},
    description: 'A max fee in millitokens is numeric',
    error: [400, 'ExpectedMaxFeeMillitokensToPayAssetInvoice'],
  },
  {
    args: {...args, max_paths: 0},
    description: 'A max paths count is positive',
    error: [400, 'ExpectedMaxPathsCountToPayAssetInvoice'],
  },
  {
    args: {...args, pathfinding_timeout: -1},
    description: 'A pathfinding timeout is not negative',
    error: [400, 'ExpectedPathfindingTimeoutMillisecondsToPayAssetInvoice'],
  },
  {
    args: {...args, peer_public_key: 'key'},
    description: 'A peer public key is expected',
    error: [400, 'ExpectedPeerPublicKeyHexToPayAssetInvoice'],
  },
  {
    args: {...args, price_oracle_metadata: 'x'.repeat(32769)},
    description: 'Price oracle metadata has a maximum size',
    error: [400, 'ExpectedShorterPriceOracleMetadataToPayAssetInvoice'],
  },
  {
    args: {...args, request: ''},
    description: 'A payment request is expected',
    error: [400, 'ExpectedPaymentRequestToPayAssetInvoice'],
  },
  {
    args: {...args, rfq_id: 'id'},
    description: 'A hex RFQ id is expected',
    error: [400, 'ExpectedRfqIdHexToPayAssetInvoice'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToPayAssetInvoice'],
  },
  {
    args: {...args, tapd: tapdWith([['error', {code: 14, details: 'x'}]])},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToPayAssetInvoice'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith([['error', {details: 'permission denied'}]]),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToPayAssetInvoice'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith([
        ['error', {details: 'error finding asset channel to use: x'}],
      ]),
    },
    description: 'A missing asset channel is returned',
    error: [503, 'NoAssetChannelToUse'],
  },
  {
    args: {...args, tapd: tapdWith([['error', 'err']])},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorInPayAssetInvoice', {err: 'err'}],
  },
  {
    args: {
      ...args,
      tapd: tapdWith([
        ['data', paymentUpdate('FAILED')],
        ['error', {details: 'payment failed: FAILURE_REASON_NO_ROUTE'}],
      ]),
    },
    description: 'A failed payment is returned as a lightning payment error',
    error: [503, 'PaymentPathfindingFailedToFindPossibleRoute'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith([
        [
          'error',
          {details: 'payment failed: FAILURE_REASON_INSUFFICIENT_BALANCE'},
        ],
      ]),
    },
    description: 'A payment failure in the stream error is mapped',
    error: [503, 'InsufficientBalanceToAttemptPayment'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith([
        ['error', {details: 'payment failed: FAILURE_REASON_X'}],
      ]),
    },
    description: 'An unknown payment failure is mapped',
    error: [503, 'FailedToFindPayableRouteToDestination'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith([
        ['data', paymentUpdate('IN_FLIGHT')],
        ['end', undefined],
      ]),
    },
    description: 'The stream must not end before the payment is final',
    error: [503, 'UnexpectedEndOfPaymentUpdatesToPayAssetInvoice'],
  },
  {
    args: {...args, tapd: tapdWith([['data', {accepted_sell_order: {}}]])},
    description: 'A valid quote is expected',
    error: [503, 'ExpectedAssetAmountInRpcSellQuote'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(payAssetInvoice(args), error, 'Got expected error');

    return;
  });
});

test('A paid invoice returns the payment and the quotes', async () => {
  const paid = await payAssetInvoice(args);

  const {payment_result} = paymentUpdate('SUCCEEDED');

  deepStrictEqual(paid, {
    ...confirmedFromPayment(payment_result),
    quotes: [sellQuote],
  });
  equal(paid.secret, '08'.repeat(32), 'Got the preimage');
  equal(paid.confirmed_at, '2023-11-14T22:13:20.200Z', 'Got the confirm date');
  equal(paid.index, '3', 'Got the payment index');
  equal(paid.paths.length, 1, 'Got the payment paths');
});

test('The payment request has the payment details', async () => {
  let sent: any;

  const tapd = {
    tapchannel: {
      sendPayment: (req: any) => {
        sent = req;

        return fakeStream([['data', paymentUpdate('SUCCEEDED')]]);
      },
    },
  } as unknown as AuthenticatedTapd;

  await payAssetInvoice({
    tapd,
    request,
    group_key: `02${'aa'.repeat(32)}`,
    is_overpay_allowed: true,
    max_fee: 10,
    max_paths: 2,
    pathfinding_timeout: 60000,
    peer_public_key: `03${'bb'.repeat(32)}`,
    price_oracle_metadata: '{}',
    rfq_id: '04'.repeat(32),
  });

  deepStrictEqual(sent, {
    allow_overpay: true,
    asset_id: Buffer.alloc(0),
    group_key: Buffer.from(`02${'aa'.repeat(32)}`, 'hex'),
    payment_request: {
      fee_limit_msat: undefined,
      fee_limit_sat: 10,
      max_parts: 2,
      no_inflight_updates: false,
      payment_request: request,
      timeout_seconds: 60,
    },
    peer_pubkey: Buffer.from(`03${'bb'.repeat(32)}`, 'hex'),
    price_oracle_metadata: '{}',
    rfq_id: Buffer.alloc(32, 4),
  });
});
