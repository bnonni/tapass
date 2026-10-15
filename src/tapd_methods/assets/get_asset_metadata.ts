import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcAssetMetaAsMetadata} from '../../tapd_responses/index.js';
import type {Metadata} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {from} = Buffer;
const isHash = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const lookupError = 'asset lookup failed for asset';
const method = 'fetchAssetMeta';
const notFoundError = 'asset meta not found';
const type = 'default';

export type GetAssetMetadataArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id?: string;
  /** Metadata Hash Hex String */
  meta_hash?: string;
}>;

export type GetAssetMetadataResult = Metadata;

type Tasks = {
  getMetadata: GetAssetMetadataResult;
  validate: undefined;
};

/** Get the metadata of an asset

  Requires `assets:read` permission

  An `asset_id` or a `meta_hash` is required, but not both

  {
    [asset_id]: <Asset Id Hex String>
    [meta_hash]: <Metadata Hash Hex String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    canonical_universes: [<Canonical Universe URL String>]
    data: <Metadata Hex String>
    [decimal_display]: <Decimal Places To Show Number>
    [delegation_key]: <Supply Commitment Delegation Public Key Hex String>
    hash: <Metadata Hash Hex String>
    is_publishing_supply_commitments: <Issuer Publishes Supply Commitments Bool>
    type: <Metadata Type String> // json, opaque, unknown
    unknown_types: [{
      type: <TLV Type Numeric String>
      value: <Value Hex String>
    }]
  }
*/
const getAssetMetadata: TapdMethod<
  GetAssetMetadataArgs,
  GetAssetMetadataResult
> = (
  args: GetAssetMetadataArgs,
  cbk?: TapdCallback<GetAssetMetadataResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.asset_id && !args.meta_hash) {
            return cbk([400, 'ExpectedAssetIdOrMetaHashToGetAssetMetadata']);
          }

          if (!!args.asset_id && !!args.meta_hash) {
            return cbk([400, 'ExpectedAssetIdOrMetaHashNotBothToGetMetadata']);
          }

          if (!!args.asset_id && !isHash(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToGetAssetMetadata']);
          }

          if (!!args.meta_hash && !isHash(args.meta_hash)) {
            return cbk([400, 'ExpectedMetaHashHexToGetAssetMetadata']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetMetadata']);
          }

          return cbk();
        },

        // Get the metadata
        getMetadata: [
          'validate',
          ({}, cbk) => {
            const request = !!args.asset_id
              ? {asset_id: from(args.asset_id, 'hex')}
              : {meta_hash: from(args.meta_hash!, 'hex')};

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetMetadata']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetMetadata']);
              }

              if (!!err && String(err.details).includes(notFoundError)) {
                return cbk([404, 'AssetMetadataNotFound']);
              }

              // tapd did not find the asset locally or in its universes
              if (!!err && String(err.details).includes(lookupError)) {
                return cbk([404, 'AssetNotFound']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetMetadata', {err}]);
              }

              try {
                return cbk(null, rpcAssetMetaAsMetadata(res));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getMetadata'}, cbk),
    );
  });
};

export default getAssetMetadata;
