import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcAssetAsAsset} from '../../tapd_responses/index.js';
import type {Asset} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const existsError = 'proof already exists for this transfer';
const {from} = Buffer;
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const {isSafeInteger} = Number;
const isTransactionId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const method = 'registerTransfer';
const proofNotFoundError = 'error fetching full proof';
const scriptKeyNotFoundError = 'error fetching script key';
const parseErrors = ['error parsing script key', 'error parsing group key'];
const type = 'default';

export type RegisterAssetTransferArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Script Key Hex String */
  script_key: string;
  /** Anchor Transaction Id Hex String */
  transaction_id: string;
  /** Anchor Transaction Output Index Number */
  transaction_vout: number;
}>;

export type RegisterAssetTransferResult = Asset;

type Tasks = {
  register: RegisterAssetTransferResult;
  validate: undefined;
};

/** Register an inbound asset transfer that has no Taproot Assets address

  Use this for an interactive transfer, when the sender sent the proof by a
  different way. The proof must already be in the local universe, and the
  script key must already be known to this node.

  Requires `assets:write` permission

  {
    asset_id: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    script_key: <Script Key Hex String>
    tapd: <Authenticated tapd API Object>
    transaction_id: <Anchor Transaction Id Hex String>
    transaction_vout: <Anchor Transaction Output Index Number>
  }

  @returns via cbk or Promise
  {
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
  }
*/
const registerAssetTransfer: TapdMethod<
  RegisterAssetTransferArgs,
  RegisterAssetTransferResult
> = (
  args: RegisterAssetTransferArgs,
  cbk?: TapdCallback<RegisterAssetTransferResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.asset_id || !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdToRegisterAssetTransfer']);
          }

          if (!!args.group_key && !isPublicKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToRegisterAssetTransfer']);
          }

          if (!args.script_key || !isPublicKey(args.script_key)) {
            return cbk([400, 'ExpectedScriptKeyToRegisterAssetTransfer']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([
              400,
              'ExpectedAuthenticatedTapdToRegisterAssetTransfer',
            ]);
          }

          if (!args.transaction_id || !isTransactionId(args.transaction_id)) {
            return cbk([400, 'ExpectedTransactionIdToRegisterAssetTransfer']);
          }

          const vout = args.transaction_vout;

          if (!isSafeInteger(vout) || vout < 0) {
            return cbk([400, 'ExpectedOutputIndexToRegisterAssetTransfer']);
          }

          return cbk();
        },

        // Register the transfer
        register: [
          'validate',
          ({}, cbk) => {
            // tapd reads the outpoint transaction id in internal byte order
            const request = {
              asset_id: from(args.asset_id, 'hex'),
              group_key: from(args.group_key || '', 'hex'),
              outpoint: {
                output_index: args.transaction_vout,
                txid: from(args.transaction_id, 'hex').reverse(),
              },
              script_key: from(args.script_key, 'hex'),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([
                  503,
                  'FailedToConnectToTapdToRegisterAssetTransfer',
                ]);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToRegisterAssetTransfer']);
              }

              const details = String(err?.details);

              if (!!err && parseErrors.some(n => details.includes(n))) {
                return cbk([400, 'ExpectedValidKeysToRegisterAssetTransfer']);
              }

              if (!!err && details.includes(scriptKeyNotFoundError)) {
                return cbk([404, 'ScriptKeyNotFoundToRegisterAssetTransfer']);
              }

              if (!!err && details.includes(existsError)) {
                return cbk([409, 'AssetTransferIsAlreadyRegistered']);
              }

              if (!!err && details.includes(proofNotFoundError)) {
                return cbk([404, 'ProofNotFoundToRegisterAssetTransfer']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorRegisteringAssetTransfer',
                  {err},
                ]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToRegisterAssetTransfer']);
              }

              try {
                return cbk(null, rpcAssetAsAsset(res.registered_asset));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'register'}, cbk),
    );
  });
};

export default registerAssetTransfer;
