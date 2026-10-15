import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {mintRpcError} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const method = 'cancelBatch';
const type = 'mint';

export type CancelMintBatchArgs = AuthenticatedTapdArgs;

export type CancelMintBatchResult = {
  /** Cancelled Batch Key Hex */
  id: string;
};

type Tasks = {
  cancel: CancelMintBatchResult;
  validate: undefined;
};

/** Cancel the pending mint batch

  Requires `mint:write` permission

  {
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    id: <Cancelled Batch Key Hex String>
  }
*/
const cancelMintBatch: TapdMethod<
  CancelMintBatchArgs,
  CancelMintBatchResult
> = (args: CancelMintBatchArgs, cbk?: TapdCallback<CancelMintBatchResult>) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToCancelMintBatch']);
          }

          return cbk();
        },

        // Cancel the batch
        cancel: [
          'validate',
          ({}, cbk) => {
            return args.tapd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToCancelMintBatch']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCancelMintBatch']);
              }

              const knownError = mintRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorCancelingMintBatch', {err}]);
              }

              if (!res || !isBuffer(res.batch_key) || !res.batch_key.length) {
                return cbk([503, 'ExpectedBatchKeyInCancelBatchResponse']);
              }

              return cbk(null, {id: res.batch_key.toString('hex')});
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'cancel'}, cbk),
    );
  });
};

export default cancelMintBatch;
