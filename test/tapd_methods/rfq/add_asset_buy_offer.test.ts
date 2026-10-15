import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {addAssetBuyOffer} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {overTheWireRequest} from '../../fixtures/rfq_wire.js';

const assetId = '01'.repeat(32);
const groupKey = `02${'03'.repeat(32)}`;

const tapdWith = (addAssetBuyOffer: (req: any, cbk: Function) => void) => {
  return {rfq: {addAssetBuyOffer}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, {}));

const tests = [
  {
    args: {max_amount: '1', tapd},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToAddAssetBuyOffer'],
  },
  {
    args: {asset_id: assetId, group_key: groupKey, max_amount: '1', tapd},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'UnexpectedAssetIdAndGroupKeyForAssetBuyOffer'],
  },
  {
    args: {asset_id: 'asset', max_amount: '1', tapd},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToAddAssetBuyOffer'],
  },
  {
    args: {group_key: 'key', max_amount: '1', tapd},
    description: 'A group key is expected',
    error: [400, 'ExpectedGroupKeyHexToAddAssetBuyOffer'],
  },
  {
    args: {asset_id: assetId, max_amount: '0', tapd},
    description: 'A max amount is expected',
    error: [400, 'ExpectedMaxAmountToAddAssetBuyOffer'],
  },
  {
    args: {asset_id: assetId, max_amount: '1', tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToAddAssetBuyOffer'],
  },
  {
    args: {
      asset_id: assetId,
      max_amount: '1',
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToAddAssetBuyOffer'],
  },
  {
    args: {
      asset_id: assetId,
      max_amount: '1',
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToAddAssetBuyOffer'],
  },
  {
    args: {
      group_key: groupKey,
      max_amount: '1',
      tapd: tapdWith((_, cbk) => {
        return cbk({code: 2, details: 'error parsing group key: invalid'});
      }),
    },
    description: 'A group key that is not valid is returned',
    error: [400, 'ExpectedValidGroupKeyToAddAssetBuyOffer'],
  },
  {
    args: {
      asset_id: assetId,
      max_amount: '1',
      tapd: tapdWith((_, cbk) => cbk('err')),
    },
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorAddingAssetBuyOffer', {err: 'err'}],
  },
  {
    args: {asset_id: assetId, max_amount: '1', tapd},
    description: 'The offer is added',
    expected: undefined,
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(addAssetBuyOffer(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await addAssetBuyOffer(args), expected, 'Added offer');
    }

    return;
  });
});

test('The request encodes with the tapd protos', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(overTheWireRequest('AddAssetBuyOffer', req));

    return cbk(null, {});
  });

  await addAssetBuyOffer({asset_id: assetId, max_amount: '10', tapd});
  await addAssetBuyOffer({group_key: groupKey, max_amount: '20', tapd});

  deepStrictEqual(requests, [
    {
      asset_specifier: {asset_id: Buffer.from(assetId, 'hex'), id: 'asset_id'},
      max_units: '10',
    },
    {
      asset_specifier: {
        group_key: Buffer.from(groupKey, 'hex'),
        id: 'group_key',
      },
      max_units: '20',
    },
  ]);
});
