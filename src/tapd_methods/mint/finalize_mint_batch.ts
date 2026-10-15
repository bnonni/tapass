import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {mintFundingRequest} from '../../tapd_requests/index.js';
import {mintRpcError} from '../../tapd_responses/index.js';
import {rpcBatchAsBatch} from '../../tapd_responses/index.js';
import type {Batch} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {isArray} = Array;
const isFeeRate = (n: unknown) => typeof n === 'number' && n > 0 && n < 1e7;
const isHash = (n: unknown) => /^[0-9A-F]{64}$/i.test(String(n));
const isScript = (n: unknown) => /^([0-9A-F]{2})+$/i.test(String(n));
const method = 'finalizeBatch';
const type = 'mint';

export type FinalizeMintBatchArgs = AuthenticatedTapdArgs<{
  /** Fee Tokens Per Virtual Byte Number */
  fee_tokens_per_vbyte?: number;
  tapscript_branch?: {
    /** Left Tap Branch Hash Hex String */
    left: string;
    /** Right Tap Branch Hash Hex String */
    right: string;
  };
  /** Tapscript Leaf Script Hex Strings */
  tapscript_leaves?: string[];
}>;

export type FinalizeMintBatchResult = Batch;

type Tasks = {
  finalize: FinalizeMintBatchResult;
  validate: undefined;
};

/** Finalize the pending mint batch, and broadcast the genesis transaction

  Requires `mint:write` permission

  tapd funds the batch first when it is not funded yet

  A tapscript sibling is optional: give `tapscript_leaves` or a
  `tapscript_branch`, not both.

  {
    [fee_tokens_per_vbyte]: <Fee Tokens Per Virtual Byte Number>
    [tapscript_branch]: {
      left: <Left Tap Branch Hash Hex String>
      right: <Right Tap Branch Hash Hex String>
    }
    [tapscript_leaves]: [<Tapscript Leaf Script Hex String>]
    tapd: <Authenticated tapd API Object>
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
      [metadata_type]: <Metadata Type String> // json, opaque
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
const finalizeMintBatch: TapdMethod<
  FinalizeMintBatchArgs,
  FinalizeMintBatchResult
> = (
  args: FinalizeMintBatchArgs,
  cbk?: TapdCallback<FinalizeMintBatchResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const branch = args.tapscript_branch;
          const leaves = args.tapscript_leaves;

          if (args.fee_tokens_per_vbyte !== undefined) {
            if (!isFeeRate(args.fee_tokens_per_vbyte)) {
              return cbk([400, 'ExpectedFeeRateToFinalizeMintBatch']);
            }
          }

          if (!!branch && !!leaves) {
            return cbk([400, 'ExpectedTapscriptLeavesOrBranchNotBoth']);
          }

          if (!!branch && (!isHash(branch.left) || !isHash(branch.right))) {
            return cbk([
              400,
              'ExpectedTapscriptBranchHashesToFinalizeMintBatch',
            ]);
          }

          if (!!leaves && (!isArray(leaves) || !leaves.length)) {
            return cbk([400, 'ExpectedTapscriptLeavesToFinalizeMintBatch']);
          }

          if (!!leaves && !leaves.every(isScript)) {
            return cbk([400, 'ExpectedHexTapscriptLeavesToFinalizeMintBatch']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToFinalizeMintBatch']);
          }

          return cbk();
        },

        // Finalize the batch
        finalize: [
          'validate',
          ({}, cbk) => {
            const request = {
              ...mintFundingRequest(args),
              short_response: false,
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToFinalizeMintBatch']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToFinalizeMintBatch']);
              }

              const knownError = mintRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorFinalizingMintBatch', {err}]);
              }

              if (!res || !res.batch) {
                return cbk([503, 'ExpectedMintBatchInFinalizeBatchResponse']);
              }

              try {
                return cbk(null, rpcBatchAsBatch({batch: res.batch}));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'finalize'}, cbk),
    );
  });
};

export default finalizeMintBatch;
