import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetAddresses} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcAddrAsAddress} from '../../../src/tapd_responses/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const {addrs} = responses.queryAddrs;

const tapdWith = (queryAddrs: (req: any, cbk: Function) => void) => {
  return {default: {queryAddrs}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, {addrs}));

const tests = [
  {
    args: {created_after: 'date', tapd},
    description: 'A valid created after date is expected',
    error: [400, 'ExpectedValidCreatedAfterDateToGetAddresses'],
  },
  {
    args: {created_before: 'date', tapd},
    description: 'A valid created before date is expected',
    error: [400, 'ExpectedValidCreatedBeforeDateToGetAddresses'],
  },
  {
    args: {limit: 1.5, tapd},
    description: 'An integer limit is expected',
    error: [400, 'ExpectedIntegerLimitToGetAssetAddresses'],
  },
  {
    args: {limit: 0, tapd},
    description: 'A positive limit is expected',
    error: [400, 'ExpectedPositiveLimitToGetAssetAddresses'],
  },
  {
    args: {limit: 2147483648, tapd},
    description: 'A limit that fits in int32 is expected',
    error: [400, 'ExpectedSmallerLimitToGetAssetAddresses'],
  },
  {
    args: {limit: 1, tapd, token: '{}'},
    description: 'A limit is not expected with a token',
    error: [400, 'UnexpectedLimitWhenPagingAddressesWithToken'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetAddresses'],
  },
  {
    args: {tapd, token: 'token'},
    description: 'A JSON paging token is expected',
    error: [400, 'ExpectedValidPagingTokenToGetAddresses'],
  },
  {
    args: {tapd, token: '{"limit":10,"offset":-1}'},
    description: 'A paging token with an offset is expected',
    error: [400, 'ExpectedValidPagingTokenToGetAddresses'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetAddresses'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetAddresses'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetAddresses', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of addresses is expected',
    error: [503, 'ExpectedArrayOfAddressesInAddressesResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {addrs: [{}]}))},
    description: 'Valid addresses are expected',
    error: [503, 'ExpectedEncodedAddressInRpcAddress'],
  },
  {
    args: {tapd},
    description: 'Real tapd addresses are returned',
    expected: {addresses: addrs.map(rpcAddrAsAddress), next: undefined},
  },
  {
    args: {limit: addrs.length, tapd},
    description: 'A full page has a next token',
    expected: {
      addresses: addrs.map(rpcAddrAsAddress),
      next: JSON.stringify({limit: addrs.length, offset: addrs.length}),
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAssetAddresses(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAssetAddresses(args), expected, 'Got result');
    }

    return;
  });
});

test('The request has the filters and the page', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {addrs: []});
  });

  await getAssetAddresses({tapd});

  await getAssetAddresses({
    created_after: '2023-11-14T22:13:20.000Z',
    created_before: '2027-01-15T08:00:00.000Z',
    tapd,
    token: '{"limit":10,"offset":20}',
  });

  deepStrictEqual(requests, [
    {created_after: 0, created_before: 0, limit: 100, offset: 0},
    {
      created_after: 1700000000,
      created_before: 1800000000,
      limit: 10,
      offset: 20,
    },
  ]);
});
