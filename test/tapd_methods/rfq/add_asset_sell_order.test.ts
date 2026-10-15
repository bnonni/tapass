import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {addAssetSellOrder} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {sellQuote} from '../../fixtures/rfq_wire.js';
import {overTheWireRequest} from '../../fixtures/rfq_wire.js';
import {overTheWireResponse} from '../../fixtures/rfq_wire.js';
import {rpcSellQuote} from '../../fixtures/rfq_wire.js';

const assetId = '01'.repeat(32);
const expiresAt = '2099-01-01T00:00:00.000Z';
const groupKey = `02${'03'.repeat(32)}`;
const peer = `03${'04'.repeat(32)}`;

const tapdWith = (addAssetSellOrder: (req: any, cbk: Function) => void) => {
  return {rfq: {addAssetSellOrder}} as unknown as AuthenticatedTapd;
};

const accepted = overTheWireResponse('AddAssetSellOrder', {
  accepted_quote: rpcSellQuote,
});

const tapd = tapdWith((_, cbk) => cbk(null, accepted));

const base = {
  asset_id: assetId,
  expires_at: expiresAt,
  max_mtokens: '1000',
  peer_public_key: peer,
  tapd,
};

const tests = [
  {
    args: {...base, asset_id: undefined},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToAddAssetSellOrder'],
  },
  {
    args: {...base, group_key: groupKey},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'UnexpectedAssetIdAndGroupKeyForAssetSellOrder'],
  },
  {
    args: {...base, asset_id: 'asset'},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToAddAssetSellOrder'],
  },
  {
    args: {...base, asset_id: undefined, group_key: '02'},
    description: 'A group key is expected',
    error: [400, 'ExpectedGroupKeyHexToAddAssetSellOrder'],
  },
  {
    args: {...base, expires_at: '2020-01-01T00:00:00.000Z'},
    description: 'A future expiry is expected',
    error: [400, 'ExpectedFutureExpiresAtToAddAssetSellOrder'],
  },
  {
    args: {...base, max_rate: '1e5'},
    description: 'A decimal max rate is expected',
    error: [400, 'ExpectedDecimalMaxRateToAddAssetSellOrder'],
  },
  {
    args: {...base, max_mtokens: '0'},
    description: 'Max millitokens are expected',
    error: [400, 'ExpectedMaxMtokensToAddAssetSellOrder'],
  },
  {
    args: {...base, min_mtokens: '1.5'},
    description: 'Numeric min millitokens are expected',
    error: [400, 'ExpectedNumericMinMtokensForAssetSellOrder'],
  },
  {
    args: {...base, min_mtokens: '1001'},
    description: 'The min millitokens are not above the max',
    error: [400, 'ExpectedMinMtokensNotAboveMaxForSellOrder'],
  },
  {
    args: {...base, peer_public_key: 'peer'},
    description: 'A peer public key is expected',
    error: [400, 'ExpectedPeerPublicKeyToAddAssetSellOrder'],
  },
  {
    args: {...base, price_oracle_metadata: 'a'.repeat(32769)},
    description: 'Metadata is not too long',
    error: [400, 'ExpectedShorterOracleMetadataForSellOrder'],
  },
  {
    args: {...base, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToAddAssetSellOrder'],
  },
  {
    args: {...base, timeout_seconds: 0},
    description: 'A positive timeout is expected',
    error: [400, 'ExpectedPositiveTimeoutSecondsForSellOrder'],
  },
  {
    args: {
      ...base,
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToAddAssetSellOrder'],
  },
  {
    args: {
      ...base,
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToAddAssetSellOrder'],
  },
  {
    args: {
      ...base,
      tapd: tapdWith((_, cbk) => {
        return cbk({
          code: 2,
          details:
            'error unmarshalling sell order: error unmarshalling asset ' +
            'specifier: error parsing group key: invalid public key',
        });
      }),
    },
    description: 'A group key that is not valid is returned',
    error: [400, 'ExpectedValidGroupKeyToAddAssetSellOrder'],
  },
  {
    args: {
      ...base,
      tapd: tapdWith((_, cbk) => {
        return cbk({
          code: 2,
          details:
            'error checking peer channel: no active channel found with peer',
        });
      }),
    },
    description: 'A missing asset channel is returned',
    error: [503, 'NoAssetChannelWithPeerForAssetSellOrder'],
  },
  {
    args: {
      ...base,
      tapd: tapdWith((_, cbk) =>
        cbk({code: 2, details: 'timeout waiting for response (peer=x)'}),
      ),
    },
    description: 'A quote timeout is returned',
    error: [503, 'TimedOutWaitingForAssetSellOrderQuote'],
  },
  {
    args: {...base, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorAddingAssetSellOrder', {err: 'err'}],
  },
  {
    args: {...base, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToAddAssetSellOrder'],
  },
  {
    args: {...base, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A quote is expected',
    error: [503, 'ExpectedRpcPeerAcceptedSellQuote'],
  },
  {
    args: base,
    description: 'The accepted quote is returned',
    expected: sellQuote,
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(addAssetSellOrder(args), error, 'Got expected error');
    } else {
      deepStrictEqual(
        await addAssetSellOrder(args as any),
        expected,
        'Got quote',
      );
    }

    return;
  });
});

test('A rejected quote is returned as an error', async () => {
  const rejected = overTheWireResponse('AddAssetSellOrder', {
    rejected_quote: {
      error_code: 1,
      error_message: 'no',
      id: Buffer.alloc(32, 1),
      peer,
    },
  });

  const err = await addAssetSellOrder({
    ...base,
    tapd: tapdWith((_, cbk) => cbk(null, rejected)),
  }).catch(err => err);

  equal(err[0], 503, 'Got code');
  equal(err[1], 'PeerRejectedAssetSellOrderQuote', 'Got message');
  equal(err[2].err.error_message, 'no', 'Got details');
});

test('A peer rejection error is returned with details', async () => {
  const err = await addAssetSellOrder({
    ...base,
    tapd: tapdWith((_, cbk) =>
      cbk({code: 2, details: 'peer x rejected quote y'}),
    ),
  }).catch(err => err);

  deepStrictEqual(err.slice(0, 2), [503, 'PeerRejectedAssetSellOrderQuote']);
});

test('An invalid quote is returned as an error', async () => {
  const invalid = overTheWireResponse('AddAssetSellOrder', {
    invalid_quote: {id: Buffer.alloc(32, 1), peer, status: 'RATE_BOUND_MISS'},
  });

  const err = await addAssetSellOrder({
    ...base,
    tapd: tapdWith((_, cbk) => cbk(null, invalid)),
  }).catch(err => err);

  deepStrictEqual(err.slice(0, 2), [
    503,
    'PeerSentInvalidQuoteForAssetSellOrder',
  ]);
  equal(err[2].err.status, 'RATE_BOUND_MISS', 'Got status');
});

test('The request encodes with the tapd protos', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(overTheWireRequest('AddAssetSellOrder', req));

    return cbk(null, accepted);
  });

  await addAssetSellOrder({...base, tapd});

  await addAssetSellOrder({
    ...base,
    asset_id: undefined,
    group_key: groupKey,
    is_asset_channel_check_skipped: true,
    is_fill_or_kill: true,
    max_rate: '1000.50',
    min_mtokens: '0',
    price_oracle_metadata: '{"user":"alice"}',
    tapd,
    timeout_seconds: 5,
  });

  const [defaults, custom] = requests;

  deepStrictEqual(defaults.asset_specifier, {
    asset_id: Buffer.alloc(32, 1),
    id: 'asset_id',
  });
  equal(defaults.payment_max_amt, '1000');
  equal(defaults.payment_min_amt, undefined, 'No min is sent by default');
  equal(defaults.asset_rate_limit, null, 'No rate limit is sent by default');
  equal(defaults.execution_policy, 'EXECUTION_POLICY_IOC');
  equal(defaults.expiry, '4070908800');
  deepStrictEqual(defaults.peer_pub_key, Buffer.from(peer, 'hex'));
  equal(defaults.skip_asset_channel_check, false);
  equal(defaults.timeout_seconds, 60);

  deepStrictEqual(custom.asset_specifier, {
    group_key: Buffer.from(groupKey, 'hex'),
    id: 'group_key',
  });
  equal(custom.payment_min_amt, '0', 'A zero min is sent');
  deepStrictEqual(custom.asset_rate_limit, {coefficient: '100050', scale: 2});
  equal(custom.execution_policy, 'EXECUTION_POLICY_FOK');
  equal(custom.price_oracle_metadata, '{"user":"alice"}');
  equal(custom.skip_asset_channel_check, true);
  equal(custom.timeout_seconds, 5);
});
