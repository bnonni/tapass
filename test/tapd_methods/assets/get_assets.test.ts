import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssets} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const groupKey = `02${'11'.repeat(32)}`;
const {listAssets} = responses;

const tapdWith = (
  methods: Record<string, (req: any, cbk: Function) => void>,
) => {
  return {default: methods} as unknown as AuthenticatedTapd;
};

const listWith = (method: (req: any, cbk: Function) => void) => {
  return tapdWith({listAssets: method});
};

const tapd = listWith((_, cbk) => cbk(null, listAssets));

const tests = [
  {
    args: {asset_id: assetId, group_key: groupKey, tapd},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'ExpectedAssetIdOrGroupKeyNotBothToGetAssets'],
  },
  {
    args: {asset_id: 'id', tapd},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToGetAssets'],
  },
  {
    args: {asset_id: assetId, limit: 5, tapd},
    description: 'Paging is not supported with an asset id',
    error: [400, 'UnexpectedPagingOrAmountFilterWithAssetId'],
  },
  {
    args: {asset_id: assetId, min_amount: '5', tapd},
    description: 'An amount filter is not supported with an asset id',
    error: [400, 'UnexpectedPagingOrAmountFilterWithAssetId'],
  },
  {
    args: {group_key: 'key', tapd},
    description: 'A hex group key is expected',
    error: [400, 'ExpectedGroupKeyHexToGetAssets'],
  },
  {
    args: {is_including_leased: true, is_including_spent: true, tapd},
    description: 'Leased and spent assets are not supported together',
    error: [400, 'ExpectedLeasedOrSpentAssetsNotBothToGetAssets'],
  },
  {
    args: {limit: 1.5, tapd},
    description: 'An integer limit is expected',
    error: [400, 'ExpectedIntegerLimitToGetAssets'],
  },
  {
    args: {limit: 0, tapd},
    description: 'A positive limit is expected',
    error: [400, 'ExpectedPositiveLimitToGetAssets'],
  },
  {
    args: {limit: 16385, tapd},
    description: 'A limit not above the tapd maximum is expected',
    error: [400, 'ExpectedLimitNotAboveMaximumToGetAssets'],
  },
  {
    args: {limit: 5, tapd, token: '{}'},
    description: 'A limit is not expected with a token',
    error: [400, 'UnexpectedLimitWhenPagingAssetsWithToken'],
  },
  {
    args: {max_amount: '1.5', tapd},
    description: 'A numeric maximum amount is expected',
    error: [400, 'ExpectedNumericMaxAmountToGetAssets'],
  },
  {
    args: {min_amount: '-1', tapd},
    description: 'A numeric minimum amount is expected',
    error: [400, 'ExpectedNumericMinAmountToGetAssets'],
  },
  {
    args: {script_key_type: 'other', tapd},
    description: 'A known script key type is expected',
    error: [400, 'ExpectedKnownScriptKeyTypeToGetAssets'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssets'],
  },
  {
    args: {asset_id: assetId, tapd},
    description: 'An authenticated tapd with FetchAsset is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssets'],
  },
  {
    args: {tapd, token: 'token'},
    description: 'A JSON paging token is expected',
    error: [400, 'ExpectedValidPagingTokenToGetAssets'],
  },
  {
    args: {tapd, token: '{"limit":5,"offset":-1}'},
    description: 'A paging token with a valid offset is expected',
    error: [400, 'ExpectedValidPagingTokenToGetAssets'],
  },
  {
    args: {tapd: listWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssets'],
  },
  {
    args: {
      tapd: listWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssets'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith({
        fetchAsset: (_, cbk) => cbk({code: 2, details: 'unknown request'}),
      }),
    },
    description: 'A tapd without FetchAsset behind litd is not supported',
    error: [501, 'ExpectedNewerTapdToGetAssetsByAssetId'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith({
        fetchAsset: (_, cbk) => cbk({code: 12, details: 'unknown method'}),
      }),
    },
    description: 'A tapd without FetchAsset is not supported',
    error: [501, 'ExpectedNewerTapdToGetAssetsByAssetId'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith({
        fetchAsset: (_, cbk) =>
          cbk({code: 2, details: 'asset lookup failed for asset: x'}),
      }),
    },
    description: 'An unknown asset is returned as not found',
    error: [404, 'AssetNotFound'],
  },
  {
    args: {tapd: listWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssets', {err: 'err'}],
  },
  {
    args: {tapd: listWith((_, cbk) => cbk(null, {}))},
    description: 'An array of assets is expected',
    error: [503, 'ExpectedArrayOfAssetsInAssetsResponse'],
  },
  {
    args: {tapd: listWith((_, cbk) => cbk(null, {assets: [{}]}))},
    description: 'Valid assets are expected',
    error: [503, 'ExpectedAmountInRpcAsset'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssets(args), error, 'Got expected error');

    return;
  });
});

test('Real tapd assets are returned', async () => {
  const res = await getAssets({tapd});

  equal(res.assets.length, 1);
  equal(res.assets[0]?.name, 'smoke-coin');
  equal(res.next, undefined, 'There is no next page');
  equal(res.unconfirmed_mints, 0);
  equal(res.unconfirmed_transfers, 0);
});

test('A full page has a next token', async () => {
  const res = await getAssets({limit: 1, tapd});

  equal(res.next, '{"limit":1,"offset":1}');
});

test('A tapd that does not page is the last page', async () => {
  const [asset] = listAssets.assets;
  const tapd = listWith((_, cbk) =>
    cbk(null, {...listAssets, assets: [asset, asset]}),
  );

  const res = await getAssets({limit: 1, tapd});

  equal(res.assets.length, 2);
  equal(res.next, undefined);
});

test('An asset id uses FetchAsset', async () => {
  let request: any;

  const tapd = tapdWith({
    fetchAsset: (req, cbk) => {
      request = req;

      return cbk(null, {assets: listAssets.assets});
    },
  });

  const res = await getAssets({
    asset_id: assetId,
    script_key_type: 'all',
    tapd,
  });

  deepStrictEqual(request, {
    asset_specifier: {asset_id: Buffer.from(assetId, 'hex')},
    include_leased: false,
    include_spent: false,
    include_unconfirmed_mints: false,
    script_key_type: {all_types: true},
    with_witness: false,
  });

  equal(res.assets.length, 1);
  equal(res.next, undefined);
  equal(res.unconfirmed_mints, undefined);
});

test('The request has the filters and the page', async () => {
  const requests: any[] = [];

  const tapd = listWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {...listAssets, assets: []});
  });

  await getAssets({tapd});

  await getAssets({
    group_key: groupKey,
    is_including_leased: true,
    is_including_unconfirmed: true,
    max_amount: '100',
    min_amount: '10',
    script_key_type: 'channel',
    tapd,
    token: '{"limit":20,"offset":40}',
  });

  deepStrictEqual(requests, [
    {
      direction: 'SORT_DIRECTION_DESC',
      group_key: Buffer.alloc(0),
      include_leased: false,
      include_spent: false,
      include_unconfirmed_mints: false,
      limit: 512,
      max_amount: '0',
      min_amount: '0',
      offset: 0,
      script_key_type: undefined,
      with_witness: false,
    },
    {
      direction: 'SORT_DIRECTION_DESC',
      group_key: Buffer.from(groupKey, 'hex'),
      include_leased: true,
      include_spent: false,
      include_unconfirmed_mints: true,
      limit: 20,
      max_amount: '100',
      min_amount: '10',
      offset: 40,
      script_key_type: {explicit_type: 'SCRIPT_KEY_CHANNEL'},
      with_witness: false,
    },
  ]);
});
