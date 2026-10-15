import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetReceives} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcAddrEventAsReceive} from '../../../src/tapd_responses/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const [addr] = responses.queryAddrs.addrs;

const event = {
  addr,
  confirmation_height: 110,
  creation_time_unix_seconds: '1700000000',
  has_proof: true,
  outpoint: `${'ab'.repeat(32)}:1`,
  status: 'ADDR_EVENT_STATUS_COMPLETED',
  taproot_sibling: Buffer.alloc(0),
  utxo_amt_sat: '1000',
};

const tapdWith = (addrReceives: (req: any, cbk: Function) => void) => {
  return {default: {addrReceives}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, {events: [event]}));

const tests = [
  {
    args: {address: 1 as any, tapd},
    description: 'An address string is expected',
    error: [400, 'ExpectedAssetAddressStringToGetAssetReceives'],
  },
  {
    args: {created_after: 'date', tapd},
    description: 'A valid created after date is expected',
    error: [400, 'ExpectedValidCreatedAfterDateToGetReceives'],
  },
  {
    args: {created_before: 'date', tapd},
    description: 'A valid created before date is expected',
    error: [400, 'ExpectedValidCreatedBeforeDateToGetReceives'],
  },
  {
    args: {limit: 1.5, tapd},
    description: 'An integer limit is expected',
    error: [400, 'ExpectedIntegerLimitToGetAssetReceives'],
  },
  {
    args: {limit: 0, tapd},
    description: 'A positive limit is expected',
    error: [400, 'ExpectedPositiveLimitToGetAssetReceives'],
  },
  {
    args: {limit: 16385, tapd},
    description: 'A limit within the tapd maximum is expected',
    error: [400, 'ExpectedSmallerLimitToGetAssetReceives'],
  },
  {
    args: {limit: 1, tapd, token: '{}'},
    description: 'A limit is not expected with a token',
    error: [400, 'UnexpectedLimitWhenPagingReceivesWithToken'],
  },
  {
    args: {status: 'unknown' as any, tapd},
    description: 'A known status is expected',
    error: [400, 'ExpectedKnownStatusToGetAssetReceives'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetReceives'],
  },
  {
    args: {tapd, token: '{"limit":16385,"offset":0}'},
    description: 'A paging token with a valid limit is expected',
    error: [400, 'ExpectedValidPagingTokenToGetReceives'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetReceives'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetReceives'],
  },
  {
    args: {
      address: 'taprt1notanaddress',
      tapd: tapdWith((_, cbk) => cbk({details: 'unable to decode addr: bad'})),
    },
    description: 'A bad address is returned',
    error: [400, 'ExpectedValidAssetAddressToGetReceives'],
  },
  {
    args: {
      address: addr.encoded,
      tapd: tapdWith((_, cbk) =>
        cbk({details: 'unknown asset=0101: not found'}),
      ),
    },
    description: 'An address for an unknown asset is returned as not found',
    error: [404, 'AssetNotFound'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetReceives', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of events is expected',
    error: [503, 'ExpectedArrayOfEventsInAddrReceivesResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {events: [{}]}))},
    description: 'Valid events are expected',
    error: [503, 'ExpectedCreationTimeInRpcAddressEvent'],
  },
  {
    args: {tapd},
    description: 'Receives are returned',
    expected: {next: undefined, receives: [rpcAddrEventAsReceive(event)]},
  },
  {
    args: {limit: 1, tapd},
    description: 'A full page has a next token',
    expected: {
      next: '{"limit":1,"offset":1}',
      receives: [rpcAddrEventAsReceive(event)],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAssetReceives(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAssetReceives(args), expected, 'Got receives');
    }

    return;
  });
});

test('The request has the filters, the page, and the order', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {events: []});
  });

  await getAssetReceives({tapd});

  await getAssetReceives({
    address: addr.encoded,
    created_after: '2023-11-14T22:13:20.000Z',
    created_before: '2027-01-15T08:00:00.000Z',
    status: 'proof_received',
    tapd,
    token: '{"limit":10,"offset":20}',
  });

  deepStrictEqual(requests, [
    {
      direction: 'SORT_DIRECTION_DESC',
      end_timestamp: 0,
      filter_addr: '',
      filter_status: 'ADDR_EVENT_STATUS_UNKNOWN',
      limit: 100,
      offset: 0,
      start_timestamp: 0,
    },
    {
      direction: 'SORT_DIRECTION_DESC',
      end_timestamp: 1800000000,
      filter_addr: addr.encoded,
      filter_status: 'ADDR_EVENT_STATUS_PROOF_RECEIVED',
      limit: 10,
      offset: 20,
      start_timestamp: 1700000000,
    },
  ]);
});
