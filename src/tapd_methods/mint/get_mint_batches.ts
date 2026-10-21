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

const {isArray} = Array;
const isBatchKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const method = 'listBatches';
const type = 'mint';

export type GetMintBatchesArgs = AuthenticatedTapdArgs<{
  /** Batch Key Hex String */
  id?: string;
  /** Include Group Details of Unsealed Assets */
  is_verbose?: boolean;
}>;

export type GetMintBatchesResult = {
  batches: Batch[];
};

type Tasks = {
  getBatches: GetMintBatchesResult;
  validate: undefined;
};

/** Get mint batches, including pending and cancelled batches

  Requires `mint:read` permission

  With `is_verbose`, tapd returns only pending batches that are funded and have
  assets. If an asset in such a batch starts or joins a group, `assets` is
  empty and each asset of the batch is in `unsealed_assets`, with the group
  details. Without `is_verbose`, `unsealed_assets` is empty.

  When a batch has committed assets, tapd does not return the asset version,
  the new group flag, or the group anchor: `version` is 0 and `is_new_group`
  is false.

  {
    [id]: <Batch Key Hex String>
    [is_verbose]: <Include Group Details of Unsealed Assets Bool>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    batches: [{
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
      unsealed_assets: [{
        amount: <Asset Units Numeric String>
        [group_anchor]: <Name of the Asset That Anchors a New Group String>
        [group_internal_key]: <Group Internal Public Key Hex String>
        [group_key]: <Group Key Hex String>
        [group_tapscript_root]: <Group Tapscript Root Hex String>
        [group_virtual_psbt]: <Group Virtual Transaction PSBT Hex String>
        [group_virtual_transaction]: <Group Virtual Transaction Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_new_group: <Asset Starts a New Group Bool>
        [metadata]: <Metadata Hex String>
        [metadata_hash]: <Metadata Hash Hex String>
        [metadata_type]: <Metadata Type String> // json, opaque, unknown
        name: <Asset Name String>
        [script_key]: <Script Key Hex String>
        version: <Asset Version Number>
      }]
    }]
  }
*/
const getMintBatches: TapdMethod<GetMintBatchesArgs, GetMintBatchesResult> = (
  args: GetMintBatchesArgs,
  cbk?: TapdCallback<GetMintBatchesResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (args.id !== undefined && !isBatchKey(args.id)) {
            return cbk([400, 'ExpectedBatchKeyToGetMintBatches']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetMintBatches']);
          }

          return cbk();
        },

        // Get the batches
        getBatches: [
          'validate',
          ({}, cbk) => {
            const request = {
              batch_key: !args.id ? undefined : Buffer.from(args.id, 'hex'),
              verbose: !!args.is_verbose,
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetMintBatches']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetMintBatches']);
              }

              const knownError = mintRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingMintBatches', {err}]);
              }

              if (!res || !isArray(res.batches)) {
                return cbk([
                  503,
                  'ExpectedArrayOfBatchesInListBatchesResponse',
                ]);
              }

              try {
                return cbk(null, {batches: res.batches.map(rpcBatchAsBatch)});
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getBatches'}, cbk),
    );
  });
};

export default getMintBatches;
