import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {scriptKeyTypeQuery} from '../../tapd_requests/index.js';
import {rpcAssetBalanceAsBalance} from '../../tapd_responses/index.js';
import type {Balance} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {from} = Buffer;
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isGroupKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const method = 'listBalances';
const type = 'default';
const {values} = Object;

export type GetAssetBalancesArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Include Leased Assets */
  is_including_leased?: boolean;
  /** Script Key Type */
  script_key_type?: string;
}>;

export type GetAssetBalancesResult = {
  balances: Balance[];
  group_balances: {
    /** Balance Asset Units Numeric String */
    balance: string;
    /** Asset Group Key Hex */
    group_key: string;
  }[];
  /** Unconfirmed Transfers Count */
  unconfirmed_transfers: number;
};

type Tasks = {
  getAssetBalances: {balances: Balance[]; unconfirmed_transfers: number};
  getBalances: GetAssetBalancesResult;
  getGroupBalances: GetAssetBalancesResult['group_balances'];
  validate: undefined;
};

/** Get the asset balances of this node, by asset and by asset group

  Requires `assets:read` permission

  By default, tapd includes only assets with a BIP-86 script key. Use
  `script_key_type` to get other assets, for example assets in channels.

  An `asset_id` or a `group_key` is a filter, but not both. With an
  `asset_id`, there are no group balances.

  {
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    [is_including_leased]: <Include Leased Assets Bool>
    [script_key_type]: <Script Key Type String> // all, bip86, burn, channel,
                                               // script_path_external,
                                               // tombstone, unique_pedersen
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    balances: [{
      asset_id: <Asset Id Hex String>
      balance: <Balance Asset Units Numeric String>
      [group_key]: <Asset Group Key Hex String>
      is_collectible: <Asset Is Collectible Bool>
      meta_hash: <Asset Metadata Hash Hex String>
      name: <Asset Name String>
    }]
    group_balances: [{
      balance: <Balance Asset Units Numeric String>
      group_key: <Asset Group Key Hex String>
    }]
    unconfirmed_transfers: <Unconfirmed Transfers Count Number>
  }
*/
const getAssetBalances: TapdMethod<
  GetAssetBalancesArgs,
  GetAssetBalancesResult
> = (
  args: GetAssetBalancesArgs,
  cbk?: TapdCallback<GetAssetBalancesResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyNotBothToGetBalances']);
          }

          if (args.asset_id !== undefined && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToGetAssetBalances']);
          }

          if (args.group_key !== undefined && !isGroupKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToGetAssetBalances']);
          }

          try {
            scriptKeyTypeQuery(args.script_key_type);
          } catch {
            return cbk([400, 'ExpectedKnownScriptKeyTypeToGetAssetBalances']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetBalances']);
          }

          return cbk();
        },

        // Get the balances by asset id
        getAssetBalances: [
          'validate',
          ({}, cbk) => {
            const request = {
              asset_filter: from(args.asset_id || '', 'hex'),
              asset_id: true,
              include_leased: !!args.is_including_leased,
              script_key_type: scriptKeyTypeQuery(args.script_key_type),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetBalances']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetBalances']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetBalances', {err}]);
              }

              if (!res || !res.asset_balances) {
                return cbk([503, 'ExpectedAssetBalancesInBalancesResponse']);
              }

              const groupKey = args.group_key?.toLowerCase();

              try {
                const balances = values(res.asset_balances as object)
                  .map(rpcAssetBalanceAsBalance)
                  .filter(n => !groupKey || n.group_key === groupKey)
                  .sort((a, b) => a.asset_id.localeCompare(b.asset_id));

                return cbk(null, {
                  balances,
                  unconfirmed_transfers: Number(res.unconfirmed_transfers),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],

        // Get the balances by asset group key
        getGroupBalances: [
          'validate',
          ({}, cbk) => {
            // Exit early when the balances are for one asset id
            if (!!args.asset_id) {
              return cbk(null, []);
            }

            const request = {
              group_key: true,
              group_key_filter: from(args.group_key || '', 'hex'),
              include_leased: !!args.is_including_leased,
              script_key_type: scriptKeyTypeQuery(args.script_key_type),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetBalances']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetBalances']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingGroupBalances', {err}]);
              }

              if (!res || !res.asset_group_balances) {
                return cbk([503, 'ExpectedGroupBalancesInBalancesResponse']);
              }

              const groupBalances = values(res.asset_group_balances as object);

              if (groupBalances.some(n => !isNumeric(n?.balance))) {
                return cbk([503, 'ExpectedBalanceInRpcAssetGroupBalance']);
              }

              if (groupBalances.some(n => !isBuffer(n.group_key))) {
                return cbk([503, 'ExpectedGroupKeyInRpcAssetGroupBalance']);
              }

              return cbk(
                null,
                groupBalances
                  .map(n => ({
                    balance: n.balance as string,
                    group_key: (n.group_key as Buffer).toString('hex'),
                  }))
                  .sort((a, b) => a.group_key.localeCompare(b.group_key)),
              );
            });
          },
        ],

        // Final balances
        getBalances: [
          'getAssetBalances',
          'getGroupBalances',
          ({getAssetBalances, getGroupBalances}, cbk) => {
            return cbk(null, {
              balances: getAssetBalances.balances,
              group_balances: getGroupBalances,
              unconfirmed_transfers: getAssetBalances.unconfirmed_transfers,
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getBalances'}, cbk),
    );
  });
};

export default getAssetBalances;
