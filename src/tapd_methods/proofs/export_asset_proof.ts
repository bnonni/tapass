import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isScriptKey = (n: string) => /^([0-9A-F]{2})?[0-9A-F]{64}$/i.test(n);
const {isSafeInteger} = Number;
const isTransactionId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const maxVout = 4294967295;
const method = 'exportProof';
const multipleProofsError = 'multiple proofs found';
const notFoundError = 'unable to find proof';
const type = 'default';

export type ExportAssetProofArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id: string;
  /** Script Key Hex String */
  script_key: string;
  /** Anchor Transaction Id Hex String */
  transaction_id?: string;
  /** Anchor Transaction Output Index Number */
  transaction_vout?: number;
}>;

export type ExportAssetProofResult = {
  /** Asset Proof File Hex */
  proof: string;
};

type Tasks = {
  export: ExportAssetProofResult;
  validate: undefined;
};

/** Export the proof file of an asset

  Requires `proofs:read` permission

  If there is more than one proof for the asset id and the script key, an
  anchor outpoint is necessary: `transaction_id` and `transaction_vout`

  {
    asset_id: <Asset Id Hex String>
    script_key: <Script Key Hex String>
    tapd: <Authenticated tapd API Object>
    [transaction_id]: <Anchor Transaction Id Hex String>
    [transaction_vout]: <Anchor Transaction Output Index Number>
  }

  @returns via cbk or Promise
  {
    proof: <Asset Proof File Hex String>
  }
*/
const exportAssetProof: TapdMethod<
  ExportAssetProofArgs,
  ExportAssetProofResult
> = (
  args: ExportAssetProofArgs,
  cbk?: TapdCallback<ExportAssetProofResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const id = args.transaction_id;
          const vout = args.transaction_vout;

          if (!args.asset_id || !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToExportAssetProof']);
          }

          if (!args.script_key || !isScriptKey(args.script_key)) {
            return cbk([400, 'ExpectedScriptKeyHexToExportAssetProof']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToExportAssetProof']);
          }

          if ((id === undefined) !== (vout === undefined)) {
            return cbk([400, 'ExpectedTransactionIdAndVoutToExportAssetProof']);
          }

          if (id !== undefined && !isTransactionId(id)) {
            return cbk([400, 'ExpectedTransactionIdHexToExportAssetProof']);
          }

          if (vout !== undefined && !isSafeInteger(vout)) {
            return cbk([400, 'ExpectedIntegerOutputIndexToExportAssetProof']);
          }

          if (vout !== undefined && (vout < 0 || vout > maxVout)) {
            return cbk([400, 'ExpectedValidOutputIndexToExportAssetProof']);
          }

          return cbk();
        },

        // Export the proof file
        export: [
          'validate',
          ({}, cbk) => {
            const id = args.transaction_id;

            // tapd reads the transaction id in the internal byte order
            const outpoint = !id
              ? undefined
              : {
                  output_index: args.transaction_vout,
                  txid: Buffer.from(id, 'hex').reverse(),
                };

            const request = {
              asset_id: Buffer.from(args.asset_id, 'hex'),
              outpoint,
              script_key: Buffer.from(args.script_key, 'hex'),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToExportAssetProof']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToExportAssetProof']);
              }

              if (!!err && String(err.details).includes(notFoundError)) {
                return cbk([404, 'AssetProofNotFound']);
              }

              if (!!err && String(err.details).includes(multipleProofsError)) {
                return cbk([400, 'ExpectedAnchorOutpointToSelectAssetProof']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorExportingAssetProof', {err}]);
              }

              if (!res || !isBuffer(res.raw_proof_file)) {
                return cbk([503, 'ExpectedProofFileInExportProofResponse']);
              }

              if (!res.raw_proof_file.length) {
                return cbk([503, 'ExpectedProofFileInExportProofResponse']);
              }

              return cbk(null, {proof: res.raw_proof_file.toString('hex')});
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'export'}, cbk),
    );
  });
};

export default exportAssetProof;
