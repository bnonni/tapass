import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetMetadata} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {assetResponses} from '../../fixtures/tapd_asset_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const metaHash =
  'f19bbf25df2e3f02ef33bd8edfdea2a176f38f608065f920aeef077644a268bd';

const tapdWith = (fetchAssetMeta: (req: any, cbk: Function) => void) => {
  return {default: {fetchAssetMeta}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, assetResponses.fetchAssetMeta));

const tests = [
  {
    args: {tapd},
    description: 'An asset id or a metadata hash is expected',
    error: [400, 'ExpectedAssetIdOrMetaHashToGetAssetMetadata'],
  },
  {
    args: {asset_id: assetId, meta_hash: metaHash, tapd},
    description: 'An asset id and a metadata hash are not expected together',
    error: [400, 'ExpectedAssetIdOrMetaHashNotBothToGetMetadata'],
  },
  {
    args: {asset_id: 'id', tapd},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToGetAssetMetadata'],
  },
  {
    args: {meta_hash: 'hash', tapd},
    description: 'A hex metadata hash is expected',
    error: [400, 'ExpectedMetaHashHexToGetAssetMetadata'],
  },
  {
    args: {asset_id: assetId, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetMetadata'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetMetadata'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetMetadata'],
  },
  {
    args: {
      meta_hash: metaHash,
      tapd: tapdWith((_, cbk) => {
        return cbk({
          code: 2,
          details: 'unable to fetch asset meta: asset meta not found',
        });
      }),
    },
    description: 'Unknown metadata is returned as not found',
    error: [404, 'AssetMetadataNotFound'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith((_, cbk) =>
        cbk(assetResponses.fetchAssetMetaUnknown.error),
      ),
    },
    description: 'An unknown asset is returned as not found',
    error: [404, 'AssetNotFound'],
  },
  {
    args: {asset_id: assetId, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetMetadata', {err: 'err'}],
  },
  {
    args: {asset_id: assetId, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedRpcAssetMetaDetails'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetMetadata(args), error, 'Got expected error');

    return;
  });
});

test('Real tapd metadata is returned', async () => {
  const res = await getAssetMetadata({asset_id: assetId, tapd});

  deepStrictEqual(res.hash, metaHash);
  deepStrictEqual(res.type, 'opaque');
});

test('The request has the asset id or the metadata hash', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, assetResponses.fetchAssetMeta);
  });

  await getAssetMetadata({asset_id: assetId, tapd});
  await getAssetMetadata({meta_hash: metaHash, tapd});

  deepStrictEqual(requests, [
    {asset_id: Buffer.from(assetId, 'hex')},
    {meta_hash: Buffer.from(metaHash, 'hex')},
  ]);
});
