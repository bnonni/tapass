import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetForwards} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {overTheWireRequest} from '../../fixtures/rfq_wire.js';
import {overTheWireResponse} from '../../fixtures/rfq_wire.js';

const assetId = '01'.repeat(32);
const groupKey = `02${'03'.repeat(32)}`;
const peer = `03${'04'.repeat(32)}`;

const tapdWith = (forwardingHistory: (req: any, cbk: Function) => void) => {
  return {rfq: {forwardingHistory}} as unknown as AuthenticatedTapd;
};

const rpcForward = {
  amt_in_msat: '1000',
  amt_out_msat: '900',
  asset_amt: '5',
  chan_id_in: '1099511693313',
  chan_id_out: '1099511693313',
  htlc_id: '1',
  opened_at: '1700000000',
  peer,
  policy_type: 'RFQ_POLICY_TYPE_SALE',
  rate: {coefficient: '1', scale: 0},
  rfq_id: Buffer.alloc(32, 1),
  settled_at: '1700000001',
};

const response = (count: number, total: string) => {
  return overTheWireResponse('ForwardingHistory', {
    forwards: Array.from({length: count}, () => rpcForward),
    total_count: total,
  });
};

const tapd = tapdWith((_, cbk) => cbk(null, response(1, '1')));

const tests = [
  {
    args: {after: 'date', tapd},
    description: 'A valid after date is expected',
    error: [400, 'ExpectedValidAfterDateToGetAssetForwards'],
  },
  {
    args: {asset_id: assetId, group_key: groupKey, tapd},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'UnexpectedAssetIdAndGroupKeyForAssetForwards'],
  },
  {
    args: {asset_id: 'asset', tapd},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToGetAssetForwards'],
  },
  {
    args: {before: 'date', tapd},
    description: 'A valid before date is expected',
    error: [400, 'ExpectedValidBeforeDateToGetAssetForwards'],
  },
  {
    args: {group_key: 'key', tapd},
    description: 'A group key is expected',
    error: [400, 'ExpectedGroupKeyHexToGetAssetForwards'],
  },
  {
    args: {limit: 1.5, tapd},
    description: 'An integer limit is expected',
    error: [400, 'ExpectedIntegerLimitToGetAssetForwards'],
  },
  {
    args: {limit: 0, tapd},
    description: 'A positive limit is expected',
    error: [400, 'ExpectedPositiveLimitToGetAssetForwards'],
  },
  {
    args: {limit: 1, tapd, token: '{}'},
    description: 'A limit is not expected with a token',
    error: [400, 'UnexpectedLimitWhenPagingAssetForwards'],
  },
  {
    args: {peer_public_key: 'peer', tapd},
    description: 'A peer public key is expected',
    error: [400, 'ExpectedPeerPublicKeyToGetAssetForwards'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetForwards'],
  },
  {
    args: {tapd, token: 'token'},
    description: 'A JSON paging token is expected',
    error: [400, 'ExpectedValidPagingTokenForForwards'],
  },
  {
    args: {tapd, token: '{"limit":10,"offset":-1}'},
    description: 'A paging token with an offset is expected',
    error: [400, 'ExpectedValidPagingTokenForForwards'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetForwards'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetForwards'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'unknown request'})),
    },
    description: 'A tapd without forwarding history is returned',
    error: [501, 'GetAssetForwardsMethodNotSupported'],
  },
  {
    args: {
      group_key: groupKey,
      tapd: tapdWith((_, cbk) =>
        cbk({code: 2, details: 'error parsing group key: x'}),
      ),
    },
    description: 'A group key that is not valid is returned',
    error: [400, 'ExpectedValidGroupKeyToGetAssetForwards'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetForwards', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'Forwards are expected',
    error: [503, 'ExpectedForwardsInAssetForwardsResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {forwards: []}))},
    description: 'A total count is expected',
    error: [503, 'ExpectedTotalCountInAssetForwardsResponse'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk(null, {forwards: [{}], total_count: '1'})),
    },
    description: 'Valid forwards are expected',
    error: [503, 'ExpectedMsatAmountsInRpcForwardingEvent'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetForwards(args), error, 'Got expected error');

    return;
  });
});

test('Forwards are returned, with a token when there are more', async () => {
  const last = await getAssetForwards({tapd});

  equal(last.forwards.length, 1, 'Got forward');
  equal(last.forwards[0]?.type, 'sale', 'Got forward type');
  equal(last.next, undefined, 'No next page');

  const first = await getAssetForwards({
    limit: 2,
    tapd: tapdWith((_, cbk) => cbk(null, response(2, '5'))),
  });

  equal(first.next, '{"limit":2,"offset":2}', 'Got next page token');

  const middle = await getAssetForwards({
    tapd: tapdWith((_, cbk) => cbk(null, response(2, '5'))),
    token: first.next,
  });

  equal(middle.next, '{"limit":2,"offset":4}', 'Got the page after');
});

test('The request encodes with the tapd protos', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(overTheWireRequest('ForwardingHistory', req));

    return cbk(null, response(0, '0'));
  });

  await getAssetForwards({tapd});

  await getAssetForwards({
    after: '2023-11-14T22:13:20.000Z',
    before: '2027-01-15T08:00:00.000Z',
    group_key: groupKey,
    peer_public_key: peer,
    tapd,
    token: '{"limit":10,"offset":30}',
  });

  deepStrictEqual(requests, [
    {
      asset_specifier: null,
      limit: 100,
      max_timestamp: '0',
      min_timestamp: '0',
      offset: 0,
      peer: Buffer.alloc(0),
    },
    {
      asset_specifier: {
        group_key: Buffer.from(groupKey, 'hex'),
        id: 'group_key',
      },
      limit: 10,
      max_timestamp: '1800000000',
      min_timestamp: '1700000000',
      offset: 30,
      peer: Buffer.from(peer, 'hex'),
    },
  ]);
});
