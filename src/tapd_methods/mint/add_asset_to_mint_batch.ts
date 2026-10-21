import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {mintRpcError} from '../../tapd_responses/index.js';
import {rpcBatchAsBatch} from '../../tapd_responses/index.js';
import type {Batch} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const assetVersions = ['ASSET_VERSION_V0', 'ASSET_VERSION_V1'];
const collectibleAmount = '1';
const {from} = Buffer;
const isFingerprint = (n: unknown) => /^[0-9A-F]{8}$/i.test(String(n));
const isHash = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isHex = (n: string) => !(n.length % 2) && /^[0-9A-F]*$/i.test(n);
const isJsonObject = (n: unknown) =>
  !!n && typeof n === 'object' && !Array.isArray(n);
const isPositive = (n: unknown) =>
  typeof n === 'string' && /^[1-9]\d*$/.test(n);
const isPublicKey = (n: unknown) => /^0[23][0-9A-F]{64}$/i.test(String(n));
const {isSafeInteger} = Number;
const maxDecimalDisplay = 12;
const maxNameBytes = 64;
const method = 'mintAsset';
const type = 'mint';

// Parse metadata text as JSON, or return undefined when it is not JSON
const parseJson = (n: string) => {
  try {
    return JSON.parse(n);
  } catch {
    return undefined;
  }
};

export type AddAssetToMintBatchArgs = AuthenticatedTapdArgs<{
  /** Asset Units To Mint Numeric String */
  amount?: string;
  /** Decimal Places To Show Number */
  decimal_display?: number;
  external_group_key?: {
    /** Key Derivation Path String */
    derivation_path: string;
    /** Master Key Fingerprint 4 Byte Hex String */
    master_fingerprint: string;
    /** Extended Public Key String */
    xpub: string;
  };
  /** Name of an Asset in the Batch That Anchors a Group String */
  group_anchor?: string;
  group_internal_key?: {
    /** Key Family Number */
    key_family?: number;
    /** Key Index Number */
    key_index?: number;
    /** Internal Public Key Hex String */
    public_key: string;
  };
  /** Existing Group Key Hex String */
  group_key?: string;
  /** Group Tapscript Root Hex String */
  group_tapscript_root?: string;
  /** Asset Is Collectible */
  is_collectible?: boolean;
  /** Metadata Is JSON */
  is_json_metadata?: boolean;
  /** Asset Starts a New Group */
  is_new_group?: boolean;
  /** Enable Supply Commitments for the New Group */
  is_supply_committed?: boolean;
  /** Metadata Hex String */
  metadata?: string;
  /** Metadata UTF-8 Text String */
  metadata_text?: string;
  /** Asset Name String */
  name: string;
  /** Asset Version Number */
  version?: number;
}>;

export type AddAssetToMintBatchResult = Batch;

type Tasks = {
  add: AddAssetToMintBatchResult;
  validate: undefined;
};

/** Add an asset to the pending mint batch

  Requires `mint:write` permission

  tapd makes a new pending batch when there is no pending batch

  A normal asset needs an `amount`. A collectible asset has an amount of 1.

  Give metadata as hex with `metadata`, or as UTF-8 text with `metadata_text`,
  not both. Set `is_json_metadata` when the metadata is a JSON object.

  A `decimal_display` is not for collectibles. tapd also writes it into JSON
  metadata. If the JSON metadata has a different decimal display, tapd fails.

  To mint into an existing group, give a `group_key`, or a `group_anchor` that
  names an asset in this batch that starts a new group. Do not give both, and
  do not use them with `is_new_group`.

  `group_internal_key`, `group_tapscript_root`, `external_group_key`, and
  `is_supply_committed` are only for an asset that starts a new group. Give a
  `group_internal_key` or an `external_group_key`, not both.

  The asset `name` must be 64 bytes or less.

  {
    [amount]: <Asset Units To Mint Numeric String>
    [decimal_display]: <Decimal Places To Show Number> // 0 to 12
    [external_group_key]: {
      derivation_path: <Key Derivation Path String>
      master_fingerprint: <Master Key Fingerprint 4 Byte Hex String>
      xpub: <Extended Public Key String>
    }
    [group_anchor]: <Name of an Asset in the Batch That Anchors a Group String>
    [group_internal_key]: {
      [key_family]: <Key Family Number>
      [key_index]: <Key Index Number>
      public_key: <Internal Public Key Hex String>
    }
    [group_key]: <Existing Group Key Hex String>
    [group_tapscript_root]: <Group Tapscript Root Hex String>
    [is_collectible]: <Asset Is Collectible Bool>
    [is_json_metadata]: <Metadata Is JSON Bool>
    [is_new_group]: <Asset Starts a New Group Bool>
    [is_supply_committed]: <Enable Supply Commitments for the New Group Bool>
    [metadata]: <Metadata Hex String>
    [metadata_text]: <Metadata UTF-8 Text String>
    name: <Asset Name String>
    tapd: <Authenticated tapd API Object>
    [version]: <Asset Version Number> // 0 or 1
  }

  @returns via cbk or Promise
  {
    assets: [{
      amount: <Asset Units Numeric String>
      [group_anchor]: <Name of the Asset That Anchors a New Group String>
      [group_internal_key]: <Group Internal Public Key Hex String>
      [group_key]: <Group Key Hex String>
      [group_tapscript_root]: <Group Tapscript Root Hex String>
      is_collectible: <Asset Is Collectible Bool>
      is_new_group: <Asset Starts a New Group Bool>
      [metadata]: <Metadata Hex String>
      [metadata_hash]: <Metadata Hash Hex String>
      [metadata_type]: <Metadata Type String> // json, opaque, unknown
      name: <Asset Name String>
      [script_key]: <Script Key Hex String>
      version: <Asset Version Number>
    }]
    created_at: <Created At ISO 8601 Date String>
    created_height: <Block Height When Created Number>
    id: <Batch Key Hex String>
    [psbt]: <Genesis Transaction PSBT Hex String>
    state: <Batch State String>
    [transaction_id]: <Genesis Transaction Id Hex String>
    unsealed_assets: []
  }
*/
const addAssetToMintBatch: TapdMethod<
  AddAssetToMintBatchArgs,
  AddAssetToMintBatchResult
> = (
  args: AddAssetToMintBatchArgs,
  cbk?: TapdCallback<AddAssetToMintBatchResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const decimals = args.decimal_display;
          const external = args.external_group_key;
          const internal = args.group_internal_key;
          const isNewGroup = !!args.is_new_group;
          const name = args.name;

          if (!name || !name.trim()) {
            return cbk([400, 'ExpectedAssetNameToAddAssetToMintBatch']);
          }

          if (Buffer.byteLength(name) > maxNameBytes) {
            return cbk([400, 'ExpectedShorterAssetNameToAddAssetToMintBatch']);
          }

          if (!!args.is_collectible) {
            if (
              args.amount !== undefined &&
              args.amount !== collectibleAmount
            ) {
              return cbk([400, 'ExpectedAmountOfOneForCollectibleAsset']);
            }
          } else if (!isPositive(args.amount)) {
            return cbk([400, 'ExpectedAmountToAddAssetToMintBatch']);
          }

          if (decimals !== undefined) {
            if (!isSafeInteger(decimals) || decimals < 0) {
              return cbk([400, 'ExpectedDecimalDisplayToAddAssetToMintBatch']);
            }

            if (decimals > maxDecimalDisplay) {
              return cbk([400, 'ExpectedDecimalDisplayOfTwelveOrLess']);
            }

            if (!!decimals && !!args.is_collectible) {
              return cbk([400, 'UnexpectedDecimalDisplayForCollectibleAsset']);
            }
          }

          if (!!args.metadata && !!args.metadata_text) {
            return cbk([400, 'ExpectedMetadataHexOrMetadataTextNotBoth']);
          }

          if (!!args.metadata && !isHex(args.metadata)) {
            return cbk([400, 'ExpectedHexMetadataToAddAssetToMintBatch']);
          }

          if (!!args.is_json_metadata) {
            const text = !!args.metadata
              ? from(args.metadata, 'hex').toString('utf8')
              : args.metadata_text;

            if (!text || !isJsonObject(parseJson(text))) {
              return cbk([
                400,
                'ExpectedJsonObjectMetadataToAddAssetToMintBatch',
              ]);
            }
          }

          if (!!args.group_key && !!args.group_anchor) {
            return cbk([400, 'ExpectedGroupKeyOrGroupAnchorNotBoth']);
          }

          if (!!args.group_key && !isPublicKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupPublicKeyToAddAssetToMintBatch']);
          }

          if (isNewGroup && (!!args.group_key || !!args.group_anchor)) {
            return cbk([400, 'UnexpectedExistingGroupForNewGroupAsset']);
          }

          if (!isNewGroup && !!args.group_tapscript_root) {
            return cbk([400, 'UnexpectedGroupTapscriptRootWithoutNewGroup']);
          }

          if (
            !!args.group_tapscript_root &&
            !isHash(args.group_tapscript_root)
          ) {
            return cbk([400, 'ExpectedGroupTapscriptRootHashToMintAsset']);
          }

          if (!isNewGroup && (!!internal || !!external)) {
            return cbk([400, 'UnexpectedGroupKeyDetailsWithoutNewGroup']);
          }

          if (!!internal && !!external) {
            return cbk([400, 'ExpectedGroupInternalKeyOrExternalKeyNotBoth']);
          }

          if (!!internal && !isPublicKey(internal.public_key)) {
            return cbk([400, 'ExpectedGroupInternalPublicKeyToMintAsset']);
          }

          if (!!external && (!external.xpub || !external.derivation_path)) {
            return cbk([400, 'ExpectedExternalGroupKeyDetailsToMintAsset']);
          }

          if (!!external && !isFingerprint(external.master_fingerprint)) {
            return cbk([400, 'ExpectedMasterFingerprintForExternalGroupKey']);
          }

          if (!isNewGroup && !!args.is_supply_committed) {
            return cbk([400, 'UnexpectedSupplyCommitmentsWithoutNewGroup']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToAddAssetToMintBatch']);
          }

          if (args.version !== undefined && !assetVersions[args.version]) {
            return cbk([400, 'ExpectedKnownAssetVersionToAddAssetToMintBatch']);
          }

          return cbk();
        },

        // Add the asset to the batch
        add: [
          'validate',
          ({}, cbk) => {
            const external = args.external_group_key;
            const internal = args.group_internal_key;
            const hasMeta = !!args.metadata || !!args.metadata_text;

            const data = !!args.metadata
              ? from(args.metadata, 'hex')
              : from(args.metadata_text || '', 'utf8');

            const request = {
              asset: {
                amount: args.amount || collectibleAmount,
                asset_meta: !hasMeta
                  ? undefined
                  : {
                      data,
                      type: !!args.is_json_metadata
                        ? 'META_TYPE_JSON'
                        : 'META_TYPE_OPAQUE',
                    },
                asset_type: !!args.is_collectible ? 'COLLECTIBLE' : 'NORMAL',
                asset_version: assetVersions[args.version || 0],
                decimal_display: args.decimal_display || 0,
                enable_supply_commitments: !!args.is_supply_committed,
                external_group_key: !external
                  ? undefined
                  : {
                      derivation_path: external.derivation_path,
                      master_fingerprint: from(
                        external.master_fingerprint,
                        'hex',
                      ),
                      xpub: external.xpub,
                    },
                group_anchor: args.group_anchor || '',
                group_internal_key: !internal
                  ? undefined
                  : {
                      key_loc: {
                        key_family: internal.key_family || 0,
                        key_index: internal.key_index || 0,
                      },
                      raw_key_bytes: from(internal.public_key, 'hex'),
                    },
                group_key: from(args.group_key || '', 'hex'),
                group_tapscript_root: from(
                  args.group_tapscript_root || '',
                  'hex',
                ),
                grouped_asset: !!args.group_key || !!args.group_anchor,
                name: args.name,
                new_grouped_asset: !!args.is_new_group,
              },
              short_response: false,
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToAddAssetToMintBatch']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToAddAssetToMintBatch']);
              }

              const knownError = mintRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorAddingAssetToMintBatch',
                  {err},
                ]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToAddAssetToMintBatch']);
              }

              try {
                return cbk(null, rpcBatchAsBatch({batch: res.pending_batch}));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'add'}, cbk),
    );
  });
};

export default addAssetToMintBatch;
