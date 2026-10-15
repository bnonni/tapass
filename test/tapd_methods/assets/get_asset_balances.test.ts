import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetBalances} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const groupKey = `02${'aa'.repeat(32)}`;
const [rpcBalance] = Object.values(
  responses.listBalances.asset_balances,
) as any[];

const groupBalances = {
  asset_balances: {},
  asset_group_balances: {
    [groupKey]: {balance: '30', group_key: Buffer.from(groupKey, 'hex')},
  },
  unconfirmed_transfers: '0',
};

// The real tapd sends different balances for each group_by
const tapdWith = (listBalances: (req: any, cbk: Function) => void) => {
  return {default: {listBalances}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((req, cbk) => {
  return cbk(null, req.asset_id ? responses.listBalances : groupBalances);
});

const tests = [
  {
    args: {asset_id: assetId, group_key: groupKey, tapd},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'ExpectedAssetIdOrGroupKeyNotBothToGetBalances'],
  },
  {
    args: {asset_id: 'id', tapd},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToGetAssetBalances'],
  },
  {
    args: {group_key: 'key', tapd},
    description: 'A hex group key is expected',
    error: [400, 'ExpectedGroupKeyHexToGetAssetBalances'],
  },
  {
    args: {script_key_type: 'other', tapd},
    description: 'A known script key type is expected',
    error: [400, 'ExpectedKnownScriptKeyTypeToGetAssetBalances'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetBalances'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetBalances'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetBalances'],
  },
  {
    args: {
      tapd: tapdWith((req, cbk) =>
        req.asset_id ? cbk('err') : cbk(null, groupBalances),
      ),
    },
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetBalances', {err: 'err'}],
  },
  {
    args: {
      tapd: tapdWith((req, cbk) =>
        req.group_key ? cbk('err') : cbk(null, responses.listBalances),
      ),
    },
    description: 'An unexpected group balances error is returned',
    error: [503, 'UnexpectedErrorGettingGroupBalances', {err: 'err'}],
  },
  {
    args: {
      tapd: tapdWith((req, cbk) =>
        cbk(null, req.asset_id ? {} : groupBalances),
      ),
    },
    description: 'Asset balances are expected',
    error: [503, 'ExpectedAssetBalancesInBalancesResponse'],
  },
  {
    args: {
      tapd: tapdWith((req, cbk) =>
        cbk(null, req.asset_id ? responses.listBalances : {}),
      ),
    },
    description: 'Group balances are expected',
    error: [503, 'ExpectedGroupBalancesInBalancesResponse'],
  },
  {
    args: {
      tapd: tapdWith((req, cbk) => {
        return cbk(
          null,
          req.asset_id ? {asset_balances: {a: {}}} : groupBalances,
        );
      }),
    },
    description: 'Valid asset balances are expected',
    error: [503, 'ExpectedBalanceInRpcAssetBalance'],
  },
  {
    args: {
      tapd: tapdWith((req, cbk) => {
        const groups = {asset_group_balances: {a: {balance: 1}}};

        return cbk(null, req.asset_id ? responses.listBalances : groups);
      }),
    },
    description: 'Valid group balances are expected',
    error: [503, 'ExpectedBalanceInRpcAssetGroupBalance'],
  },
  {
    args: {
      tapd: tapdWith((req, cbk) => {
        const groups = {asset_group_balances: {a: {balance: '1'}}};

        return cbk(null, req.asset_id ? responses.listBalances : groups);
      }),
    },
    description: 'A group key is expected in a group balance',
    error: [503, 'ExpectedGroupKeyInRpcAssetGroupBalance'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetBalances(args), error, 'Got expected error');

    return;
  });
});

const balance = {
  asset_id: assetId,
  balance: '1000000',
  group_key: undefined,
  is_collectible: false,
  meta_hash: 'f19bbf25df2e3f02ef33bd8edfdea2a176f38f608065f920aeef077644a268bd',
  name: 'smoke-coin',
};

test('Balances are returned by asset and by group', async () => {
  deepStrictEqual(await getAssetBalances({tapd}), {
    balances: [balance],
    group_balances: [{balance: '30', group_key: groupKey}],
    unconfirmed_transfers: 0,
  });
});

test('An asset id filter has no group balances', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, responses.listBalances);
  });

  const res = await getAssetBalances({asset_id: assetId, tapd});

  deepStrictEqual(res.group_balances, []);
  deepStrictEqual(requests, [
    {
      asset_filter: Buffer.from(assetId, 'hex'),
      asset_id: true,
      include_leased: false,
      script_key_type: undefined,
    },
  ]);
});

test('A group key filter keeps only the assets of the group', async () => {
  const requests: any[] = [];
  const grouped = {...rpcBalance, group_key: Buffer.from(groupKey, 'hex')};

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    const assets = {
      asset_balances: {a: rpcBalance, b: grouped},
      unconfirmed_transfers: '2',
    };

    return cbk(null, req.asset_id ? assets : groupBalances);
  });

  const res = await getAssetBalances({
    group_key: groupKey.toUpperCase(),
    is_including_leased: true,
    script_key_type: 'all',
    tapd,
  });

  deepStrictEqual(res.balances, [{...balance, group_key: groupKey}]);
  deepStrictEqual(res.unconfirmed_transfers, 2);
  deepStrictEqual(requests[1], {
    group_key: true,
    group_key_filter: Buffer.from(groupKey, 'hex'),
    include_leased: true,
    script_key_type: {all_types: true},
  });
});
