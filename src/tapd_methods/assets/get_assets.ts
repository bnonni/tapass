import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isMethodUnsupported} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {scriptKeyTypeQuery} from '../../tapd_requests/index.js';
import {rpcAssetAsAsset} from '../../tapd_responses/index.js';
import type {Asset} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const defaultLimit = 512;
const {from} = Buffer;
const {isArray} = Array;
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isGroupKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const lookupError = 'asset lookup failed for asset';
const {isSafeInteger} = Number;
const maxLimit = 16384;
const {parse} = JSON;
const sortDescending = 'SORT_DIRECTION_DESC';
const {stringify} = JSON;
const type = 'default';

export type GetAssetsArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Include Leased Assets */
  is_including_leased?: boolean;
  /** Include Spent Assets */
  is_including_spent?: boolean;
  /** Include Unconfirmed Mints */
  is_including_unconfirmed?: boolean;
  /** Page Result Limit Number */
  limit?: number;
  /** Maximum Asset Units Numeric String */
  max_amount?: string;
  /** Minimum Asset Units Numeric String */
  min_amount?: string;
  /** Script Key Type */
  script_key_type?: string;
  /** Opaque Paging Token String */
  token?: string;
}>;

export type GetAssetsResult = {
  assets: Asset[];
  /** Next Opaque Paging Token */
  next?: string;
  /** Unconfirmed Mints Count */
  unconfirmed_mints?: number;
  /** Unconfirmed Transfers Count */
  unconfirmed_transfers?: number;
};

type Tasks = {
  getAssets: GetAssetsResult;
  validate: undefined;
};

/** Get the assets that this node owns

  Requires `assets:read` permission

  By default, tapd includes only assets with a BIP-86 script key. Use
  `script_key_type` to get other assets, for example assets in channels.

  An `asset_id` or a `group_key` is a filter, but not both. An `asset_id` needs
  tapd v0.8.0 or later, and it does not support paging or amount filters.

  Spent assets and leased assets are not supported together.

  Without an `asset_id`, the assets are newest first. Use the `next` token
  with the same filters to get the next page. A `limit` and a `token` are not
  supported together. The maximum `limit` is 16384.

  Paging needs tapd v0.8.0 or later. An older tapd sends all the assets in one
  page.

  {
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    [is_including_leased]: <Include Leased Assets Bool>
    [is_including_spent]: <Include Spent Assets Bool>
    [is_including_unconfirmed]: <Include Unconfirmed Mints Bool>
    [limit]: <Page Result Limit Number>
    [max_amount]: <Maximum Asset Units Numeric String>
    [min_amount]: <Minimum Asset Units Numeric String>
    [script_key_type]: <Script Key Type String> // all, bip86, burn, channel,
                                               // script_path_external,
                                               // tombstone, unique_pedersen
    tapd: <Authenticated tapd API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    assets: [{
      amount: <Asset Units Numeric String>
      [anchor]: {
        [block_hash]: <Anchor Block Hash Hex String>
        [block_height]: <Anchor Block Height Number>
        [confirmed_at]: <Anchor Confirmed At ISO 8601 Date String>
        internal_key: <Anchor Internal Key Hex String>
        merkle_root: <Anchor Taproot Merkle Root Hex String>
        [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
        transaction: <Raw Anchor Transaction Hex String>
        transaction_id: <Anchor Transaction Id Hex String>
        transaction_vout: <Anchor Transaction Output Index Number>
      }
      asset_id: <Asset Id Hex String>
      [decimal_display]: <Decimal Places To Show Number>
      genesis_output_index: <Genesis Commitment Output Index Number>
      genesis_transaction_id: <Genesis Point Transaction Id Hex String>
      genesis_transaction_vout: <Genesis Point Transaction Output Index Number>
      [group]: {
        key: <Tweaked Group Key Hex String>
        raw_key: <Raw Group Key Hex String>
        [tapscript_root]: <Group Tapscript Root Hex String>
        [witness]: <Group Membership Witness Hex String>
      }
      is_burn: <Asset Is Burned Bool>
      is_collectible: <Asset Is Collectible Bool>
      is_local: <Script Key Belongs To This Node Bool>
      is_spent: <Asset Is Spent Bool>
      [lease_expires_at]: <Lease Expires At ISO 8601 Date String>
      [lease_owner]: <Lease Owner Id Hex String>
      [lock_time]: <Lock Time Number>
      meta_hash: <Asset Metadata Hash Hex String>
      name: <Asset Name String>
      [relative_lock_time]: <Relative Lock Time Number>
      script_key: <Script Key Hex String>
      script_key_type: <Script Key Type String>
      script_version: <Script Version Number>
      version: <Asset Version Number>
    }]
    [next]: <Next Opaque Paging Token String>
    [unconfirmed_mints]: <Unconfirmed Mints Count Number>
    [unconfirmed_transfers]: <Unconfirmed Transfers Count Number>
  }
*/
const getAssets: TapdMethod<GetAssetsArgs, GetAssetsResult> = (
  args: GetAssetsArgs,
  cbk?: TapdCallback<GetAssetsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const hasPaging = args.limit !== undefined || !!args.token;
          const hasRange = !!args.max_amount || !!args.min_amount;

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyNotBothToGetAssets']);
          }

          if (args.asset_id !== undefined && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToGetAssets']);
          }

          if (!!args.asset_id && (hasPaging || hasRange)) {
            return cbk([400, 'UnexpectedPagingOrAmountFilterWithAssetId']);
          }

          if (args.group_key !== undefined && !isGroupKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToGetAssets']);
          }

          if (!!args.is_including_leased && !!args.is_including_spent) {
            return cbk([400, 'ExpectedLeasedOrSpentAssetsNotBothToGetAssets']);
          }

          if (args.limit !== undefined && !isSafeInteger(args.limit)) {
            return cbk([400, 'ExpectedIntegerLimitToGetAssets']);
          }

          if (args.limit !== undefined && args.limit < 1) {
            return cbk([400, 'ExpectedPositiveLimitToGetAssets']);
          }

          if (args.limit !== undefined && args.limit > maxLimit) {
            return cbk([400, 'ExpectedLimitNotAboveMaximumToGetAssets']);
          }

          if (!!args.limit && !!args.token) {
            return cbk([400, 'UnexpectedLimitWhenPagingAssetsWithToken']);
          }

          if (args.max_amount !== undefined && !isNumeric(args.max_amount)) {
            return cbk([400, 'ExpectedNumericMaxAmountToGetAssets']);
          }

          if (args.min_amount !== undefined && !isNumeric(args.min_amount)) {
            return cbk([400, 'ExpectedNumericMinAmountToGetAssets']);
          }

          try {
            scriptKeyTypeQuery(args.script_key_type);
          } catch {
            return cbk([400, 'ExpectedKnownScriptKeyTypeToGetAssets']);
          }

          const method = !!args.asset_id ? 'fetchAsset' : 'listAssets';

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssets']);
          }

          return cbk();
        },

        // Get the assets
        getAssets: [
          'validate',
          ({}, cbk) => {
            let limit = args.limit || defaultLimit;
            let offset = 0;

            // tapd reads the offset as a row offset in the results
            if (!!args.token) {
              try {
                const pagingToken = parse(args.token);

                limit = pagingToken.limit;
                offset = pagingToken.offset;
              } catch (err) {
                return cbk([400, 'ExpectedValidPagingTokenToGetAssets', {err}]);
              }

              if (!isSafeInteger(limit) || limit < 1 || limit > maxLimit) {
                return cbk([400, 'ExpectedValidPagingTokenToGetAssets']);
              }

              if (!isSafeInteger(offset) || offset < 0) {
                return cbk([400, 'ExpectedValidPagingTokenToGetAssets']);
              }
            }

            const filters = {
              include_leased: !!args.is_including_leased,
              include_spent: !!args.is_including_spent,
              include_unconfirmed_mints: !!args.is_including_unconfirmed,
              script_key_type: scriptKeyTypeQuery(args.script_key_type),
              with_witness: false,
            };

            const isFetch = !!args.asset_id;

            const request = isFetch
              ? {
                  ...filters,
                  asset_specifier: {asset_id: from(args.asset_id!, 'hex')},
                }
              : {
                  ...filters,
                  direction: sortDescending,
                  group_key: from(args.group_key || '', 'hex'),
                  limit,
                  max_amount: args.max_amount || '0',
                  min_amount: args.min_amount || '0',
                  offset,
                };

            const method = isFetch ? 'fetchAsset' : 'listAssets';

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssets']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssets']);
              }

              const details = String(err?.details);

              // tapd added FetchAsset in v0.8.0
              if (isFetch && isMethodUnsupported({err})) {
                return cbk([501, 'ExpectedNewerTapdToGetAssetsByAssetId']);
              }

              if (!!err && details.includes(lookupError)) {
                return cbk([404, 'AssetNotFound']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssets', {err}]);
              }

              if (!res || !isArray(res.assets)) {
                return cbk([503, 'ExpectedArrayOfAssetsInAssetsResponse']);
              }

              try {
                const assets = res.assets.map(rpcAssetAsAsset);

                // A tapd before v0.8.0 sends all the assets, with no page
                const isLastPage = isFetch || assets.length !== limit;

                const token = stringify({limit, offset: offset + limit});

                return cbk(null, {
                  assets,
                  next: isLastPage ? undefined : token,
                  unconfirmed_mints: isFetch
                    ? undefined
                    : Number(res.unconfirmed_mints),
                  unconfirmed_transfers: isFetch
                    ? undefined
                    : Number(res.unconfirmed_transfers),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getAssets'}, cbk),
    );
  });
};

export default getAssets;
