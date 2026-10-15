import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {scriptKeyTypeQuery} from '../../tapd_requests/index.js';
import {rpcManagedUtxoAsUtxo} from '../../tapd_responses/index.js';
import type {Utxo} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const method = 'listUtxos';
const type = 'default';
const {values} = Object;

export type GetAssetUtxosArgs = AuthenticatedTapdArgs<{
  /** Include Leased UTXOs */
  is_including_leased?: boolean;
  /** Script Key Type */
  script_key_type?: string;
}>;

export type GetAssetUtxosResult = {
  utxos: Utxo[];
};

type Tasks = {
  getUtxos: GetAssetUtxosResult;
  validate: undefined;
};

/** Get the on-chain outputs that hold the assets of this node

  Requires `assets:read` permission

  By default, tapd includes only assets with a BIP-86 script key. Use
  `script_key_type` to get other assets, for example assets in channels.

  {
    [is_including_leased]: <Include Leased UTXOs Bool>
    [script_key_type]: <Script Key Type String> // all, bip86, burn, channel,
                                               // script_path_external,
                                               // tombstone, unique_pedersen
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    utxos: [{
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
        genesis_transaction_vout: <Genesis Point Output Index Number>
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
      internal_key: <Internal Key Hex String>
      [lease_expires_at]: <Lease Expires At ISO 8601 Date String>
      [lease_owner]: <Lease Owner Id Hex String>
      merkle_root: <Taproot Merkle Root Hex String>
      taproot_asset_root: <Taproot Asset Root Commitment Hash Hex String>
      tokens: <Output Value Tokens Number>
      transaction_id: <Transaction Id Hex String>
      transaction_vout: <Transaction Output Index Number>
    }]
  }
*/
const getAssetUtxos: TapdMethod<GetAssetUtxosArgs, GetAssetUtxosResult> = (
  args: GetAssetUtxosArgs,
  cbk?: TapdCallback<GetAssetUtxosResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          try {
            scriptKeyTypeQuery(args.script_key_type);
          } catch {
            return cbk([400, 'ExpectedKnownScriptKeyTypeToGetAssetUtxos']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetUtxos']);
          }

          return cbk();
        },

        // Get the UTXOs
        getUtxos: [
          'validate',
          ({}, cbk) => {
            const request = {
              include_leased: !!args.is_including_leased,
              script_key_type: scriptKeyTypeQuery(args.script_key_type),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetUtxos']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetUtxos']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetUtxos', {err}]);
              }

              if (!res || !res.managed_utxos) {
                return cbk([503, 'ExpectedManagedUtxosInAssetUtxosResponse']);
              }

              try {
                const utxos = values(res.managed_utxos as object)
                  .map(rpcManagedUtxoAsUtxo)
                  .sort((a, b) => {
                    const byId = a.transaction_id.localeCompare(
                      b.transaction_id,
                    );

                    return byId || a.transaction_vout - b.transaction_vout;
                  });

                return cbk(null, {utxos});
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getUtxos'}, cbk),
    );
  });
};

export default getAssetUtxos;
