import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcAssetAsAsset} from '../../tapd_responses/index.js';
import {rpcTransferAsTransfer} from '../../tapd_responses/index.js';
import type {Asset} from '../../tapd_responses/index.js';
import type {Transfer} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const confirmationText = 'assets will be destroyed';
const {from} = Buffer;
const insufficientError =
  'failed to find coin(s) that satisfy given constraints';
const {isArray} = Array;
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isGroupKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const isPositive = (n: unknown) =>
  typeof n === 'string' && /^[1-9]\d*$/.test(n);
const method = 'burnAsset';
const noAssetIdError = 'asset ID must be specified';
const type = 'default';

export type BurnAssetArgs = AuthenticatedTapdArgs<{
  /** Asset Units To Burn Numeric String */
  amount: string;
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** The Caller Confirms That the Assets Will Be Destroyed */
  is_burn_confirmed: boolean;
  /** Burn Note String */
  note?: string;
}>;

export type BurnAssetResult = {
  /** Burned Assets */
  assets: Asset[];
  /** Burn Transfer */
  transfer: Transfer;
};

type Tasks = {
  burn: BurnAssetResult;
  validate: undefined;
};

/** Burn asset units

  The burned asset units are destroyed and cannot be recovered

  Requires `assets:write` permission

  An `asset_id` or a `group_key` is required, not both. `is_burn_confirmed`
  must be true.

  A burn with a `group_key` needs tapd v0.8.0 or later

  {
    amount: <Asset Units To Burn Numeric String>
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    is_burn_confirmed: <The Caller Confirms That the Assets Will Be Destroyed Bool>
    [note]: <Burn Note String>
    tapd: <Authenticated tapd API Object>
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
    transfer: {
      [block_hash]: <Anchor Block Hash Hex String>
      [block_height]: <Anchor Block Height Number>
      created_at: <Transfer Created At ISO 8601 Date String>
      fee: <Anchor Transaction Chain Fee Tokens Number>
      height_hint: <Anchor Transaction Confirmation Height Hint Number>
      inputs: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        script_key: <Script Key Hex String>
        transaction_id: <Spent Anchor Transaction Id Hex String>
        transaction_vout: <Spent Anchor Transaction Output Index Number>
      }]
      [label]: <Transfer Label String>
      outputs: [{
        [address]: <Taproot Assets Address Of the Recipient String>
        amount: <Asset Units Numeric String>
        anchor: {
          internal_key: <Anchor Internal Key Hex String>
          merkle_root: <Anchor Taproot Merkle Root Hex String>
          output_script: <Output Script Hex String>
          passive_assets_count: <Count Of Passive Assets In the Anchor Number>
          taproot_asset_root: <Taproot Asset Root Commitment Hex String>
          [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
          tokens: <Anchor Output Tokens Number>
          transaction_id: <Anchor Transaction Id Hex String>
          transaction_vout: <Anchor Transaction Output Index Number>
        }
        [asset_id]: <Asset Id Hex String>
        asset_version: <Asset Version Number>
        [group_key]: <Asset Group Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_local: <Script Key Belongs To This Node Bool>
        is_split_root: <Output Is the Split Root Bool>
        [lock_time]: <Lock Time Number>
        [proof]: <Proof File Hex String>
        [proof_courier]: <Proof Courier Address String>
        [proof_delivery]: <Proof Delivery State String> // complete, pending
        [relative_lock_time]: <Relative Lock Time Number>
        script_key: <Script Key Hex String>
        [split_root_hash]: <Split Commitment Root Hash Hex String>
      }]
      [transaction]: <Raw Anchor Transaction Hex String>
      transaction_id: <Anchor Transaction Id Hex String>
    }
  }
*/
const burnAsset: TapdMethod<BurnAssetArgs, BurnAssetResult> = (
  args: BurnAssetArgs,
  cbk?: TapdCallback<BurnAssetResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isPositive(args.amount)) {
            return cbk([400, 'ExpectedPositiveAmountToBurnAsset']);
          }

          if (!args.asset_id && !args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyToBurnAsset']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyNotBothToBurnAsset']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToBurnAsset']);
          }

          if (!!args.group_key && !isGroupKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToBurnAsset']);
          }

          if (!args.is_burn_confirmed) {
            return cbk([400, 'ExpectedConfirmationToBurnAsset']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToBurnAsset']);
          }

          return cbk();
        },

        // Burn the assets
        burn: [
          'validate',
          ({}, cbk) => {
            const assetId = !args.asset_id
              ? undefined
              : from(args.asset_id, 'hex');
            const groupKey = !args.group_key
              ? undefined
              : from(args.group_key, 'hex');

            // tapd before v0.8.0 only reads asset_id, later versions also
            // read asset_specifier, which is the only way to burn by group
            const request = {
              amount_to_burn: args.amount,
              asset_id: assetId,
              asset_specifier: !!assetId
                ? {asset_id: assetId}
                : {group_key: groupKey},
              confirmation_text: confirmationText,
              note: args.note || '',
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToBurnAsset']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToBurnAsset']);
              }

              const details = String(err?.details);

              if (!!err && details.includes(insufficientError)) {
                return cbk([400, 'InsufficientAssetsToBurnAsset']);
              }

              if (!!err && !!groupKey && details.includes(noAssetIdError)) {
                return cbk([501, 'ExpectedNewerTapdToBurnAssetByGroupKey']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorBurningAsset', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToBurnAssetRequest']);
              }

              if (!isArray(res.burn_proofs)) {
                return cbk([503, 'ExpectedArrayOfBurnProofsInBurnResponse']);
              }

              // tapd before v0.8.0 only sends the single burn proof
              const proofs = !!res.burn_proofs.length
                ? res.burn_proofs
                : [res.burn_proof].filter(n => !!n);

              try {
                return cbk(null, {
                  assets: proofs.map((n: any) => rpcAssetAsAsset(n.asset)),
                  transfer: rpcTransferAsTransfer(res.burn_transfer),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'burn'}, cbk),
    );
  });
};

export default burnAsset;
