import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcTransferAsTransfer} from '../../tapd_responses/index.js';
import type {Transfer} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {isArray} = Array;
const isTransactionId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const method = 'listTransfers';
const type = 'default';

export type GetAssetTransfersArgs = AuthenticatedTapdArgs<{
  /** Anchor Transaction Id Hex String */
  transaction_id?: string;
}>;

export type GetAssetTransfersResult = {
  transfers: Transfer[];
};

type Tasks = {
  getTransfers: GetAssetTransfersResult;
  validate: undefined;
};

/** Get the outbound asset transfers of this node

  Requires `assets:read` permission

  {
    tapd: <Authenticated tapd API Object>
    [transaction_id]: <Anchor Transaction Id Hex String>
  }

  @returns via cbk or Promise
  {
    transfers: [{
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
    }]
  }
*/
const getAssetTransfers: TapdMethod<
  GetAssetTransfersArgs,
  GetAssetTransfersResult
> = (
  args: GetAssetTransfersArgs,
  cbk?: TapdCallback<GetAssetTransfersResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetTransfers']);
          }

          const id = args.transaction_id;

          if (id !== undefined && !isTransactionId(id)) {
            return cbk([400, 'ExpectedTransactionIdToGetAssetTransfers']);
          }

          return cbk();
        },

        // Get the transfers
        getTransfers: [
          'validate',
          ({}, cbk) => {
            const request = {anchor_txid: args.transaction_id || ''};

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetTransfers']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetTransfers']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorGettingAssetTransfers',
                  {err},
                ]);
              }

              if (!res || !isArray(res.transfers)) {
                return cbk([503, 'ExpectedArrayOfTransfersInTransfersList']);
              }

              try {
                return cbk(null, {
                  transfers: res.transfers.map(rpcTransferAsTransfer),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getTransfers'}, cbk),
    );
  });
};

export default getAssetTransfers;
