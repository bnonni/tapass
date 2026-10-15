import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetPayments} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcAssetPaymentAsPayment} from '../../../src/tapd_responses/index.js';
import {makeLndPayment} from '../../fixtures/tapd_channel_responses.js';
import {overTheWireResponse} from '../../fixtures/tapd_channel_responses.js';
import {assetAmount} from '../../fixtures/tapd_channel_responses.js';

const page = (firstIndexOffset: string) => {
  return overTheWireResponse('ListPayments', {
    first_index_offset: firstIndexOffset,
    last_index_offset: '9',
    payments: [
      {
        asset_amounts: [assetAmount],
        payment: makeLndPayment({status: 'SUCCEEDED'}),
      },
    ],
  });
};

const tapdWith = (listPayments: (req: any, cbk: Function) => void) => {
  return {tapchannel: {listPayments}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, page('5')));

const failWith = (err: object) => tapdWith((_, cbk) => cbk(err));

const tests = [
  {
    args: {created_after: 'date', tapd},
    description: 'A valid created after date is expected',
    error: [400, 'ExpectedCreatedAfterDateToGetAssetPayments'],
  },
  {
    args: {limit: 1, tapd, token: '{}'},
    description: 'A limit is not expected with a token',
    error: [400, 'UnexpectedLimitWhenPagingAssetPayments'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetPayments'],
  },
  {
    args: {tapd, token: 'token'},
    description: 'A JSON paging token is expected',
    error: [400, 'ExpectedValidPagingTokenForPayments'],
  },
  {
    args: {tapd: failWith({details: 'permission denied'})},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetPayments'],
  },
  {
    args: {tapd: failWith({code: 12, details: 'unknown service'})},
    description: 'An older tapd is returned as not supported',
    error: [501, 'ExpectedNewerTapdToGetAssetPayments'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetPayments', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of payments is expected',
    error: [503, 'ExpectedAssetPaymentsInListResponse'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetPayments(args), error, 'Got expected error');

    return;
  });
});

test('A page of payments has a next token', async () => {
  const [rpcPayment] = page('5').payments;

  deepStrictEqual(await getAssetPayments({tapd}), {
    next: '{"after":0,"before":0,"limit":250,"offset":5}',
    payments: [rpcAssetPaymentAsPayment(rpcPayment)],
  });
});

test('The request asks for complete payments, newest first', async () => {
  let sent: any;

  await getAssetPayments({
    tapd: tapdWith((req, cbk) => {
      sent = req;

      return cbk(null, page('1'));
    }),
  });

  deepStrictEqual(sent, {
    request: {
      creation_date_end: 0,
      creation_date_start: 0,
      include_incomplete: false,
      index_offset: 0,
      max_payments: 250,
      reversed: true,
    },
  });
});
