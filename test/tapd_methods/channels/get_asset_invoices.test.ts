import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetInvoices} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcAssetInvoiceAsInvoice} from '../../../src/tapd_responses/index.js';
import {overTheWireResponse} from '../../fixtures/tapd_channel_responses.js';
import {rpcAssetInvoice} from '../../fixtures/tapd_channel_responses.js';

const page = (firstIndexOffset: string) => {
  return overTheWireResponse('ListInvoices', {
    first_index_offset: firstIndexOffset,
    invoices: [rpcAssetInvoice],
    last_index_offset: '9',
  });
};

const tapdWith = (listInvoices: (req: any, cbk: Function) => void) => {
  return {tapchannel: {listInvoices}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, page('5')));

const failWith = (err: object) => tapdWith((_, cbk) => cbk(err));

const tests = [
  {
    args: {created_after: 'date', tapd},
    description: 'A valid created after date is expected',
    error: [400, 'ExpectedCreatedAfterDateToGetAssetInvoices'],
  },
  {
    args: {created_before: 'date', tapd},
    description: 'A valid created before date is expected',
    error: [400, 'ExpectedCreatedBeforeDateToGetAssetInvoices'],
  },
  {
    args: {limit: 0, tapd},
    description: 'A positive limit is expected',
    error: [400, 'ExpectedPositiveLimitToGetAssetInvoices'],
  },
  {
    args: {limit: 1, tapd, token: '{}'},
    description: 'A limit is not expected with a token',
    error: [400, 'UnexpectedLimitWhenPagingAssetInvoices'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetInvoices'],
  },
  {
    args: {tapd, token: 'token'},
    description: 'A JSON paging token is expected',
    error: [400, 'ExpectedValidPagingTokenForInvoices'],
  },
  {
    args: {tapd, token: '{"after":0,"before":0,"limit":0,"offset":0}'},
    description: 'A paging token with a limit is expected',
    error: [400, 'ExpectedValidPagingTokenForInvoices'],
  },
  {
    args: {tapd: failWith({code: 14, details: 'x'})},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetInvoices'],
  },
  {
    args: {tapd: failWith({details: 'permission denied'})},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetInvoices'],
  },
  {
    args: {tapd: failWith({code: 2, details: 'unknown request'})},
    description: 'An older tapd is returned as not supported',
    error: [501, 'ExpectedNewerTapdToGetAssetInvoices'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetInvoices', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of invoices is expected',
    error: [503, 'ExpectedAssetInvoicesInListResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {invoices: []}))},
    description: 'A first index offset is expected',
    error: [503, 'ExpectedFirstIndexOffsetInAssetInvoices'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) =>
        cbk(null, {first_index_offset: '1', invoices: [{}]}),
      ),
    },
    description: 'Valid invoices are expected',
    error: [503, 'ExpectedAssetAmountsInRpcAssetInvoice'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetInvoices(args), error, 'Got expected error');

    return;
  });
});

test('A page of invoices has a next token', async () => {
  deepStrictEqual(await getAssetInvoices({limit: 10, tapd}), {
    invoices: [rpcAssetInvoiceAsInvoice(rpcAssetInvoice)],
    next: '{"after":0,"before":0,"limit":10,"offset":5}',
  });
});

test('The last page has no next token', async () => {
  const {next} = await getAssetInvoices({
    tapd: tapdWith((_, cbk) => cbk(null, page('1'))),
  });

  deepStrictEqual(next, undefined);
});

test('The request has the filters and the page', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, page('0'));
  });

  await getAssetInvoices({
    created_after: '2023-11-14T22:13:20.000Z',
    created_before: '2027-01-15T08:00:00.000Z',
    is_unconfirmed: true,
    tapd,
  });

  await getAssetInvoices({
    tapd,
    token: '{"after":1,"before":2,"limit":3,"offset":4}',
  });

  deepStrictEqual(requests, [
    {
      request: {
        creation_date_end: 1800000000,
        creation_date_start: 1700000000,
        index_offset: 0,
        num_max_invoices: 100,
        pending_only: true,
        reversed: true,
      },
    },
    {
      request: {
        creation_date_end: 2,
        creation_date_start: 1,
        index_offset: 4,
        num_max_invoices: 3,
        pending_only: false,
        reversed: true,
      },
    },
  ]);
});
