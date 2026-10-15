import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const invalidFileError = 'unable to decode proof file';
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isHex = (n: string) => !!n && !(n.length % 2) && /^[0-9A-F]*$/i.test(n);
const method = 'unpackProofFile';
const type = 'default';

export type UnpackAssetProofFileArgs = AuthenticatedTapdArgs<{
  /** Asset Proof File Hex String */
  proof: string;
}>;

export type UnpackAssetProofFileResult = {
  /** Asset Proofs Hex, First Proof First */
  proofs: string[];
};

type Tasks = {
  unpack: UnpackAssetProofFileResult;
  validate: undefined;
};

/** Get the individual proofs in an asset proof file

  Requires `proofs:read` permission

  The first proof in the list is the first proof in the proof chain

  {
    proof: <Asset Proof File Hex String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    proofs: [<Asset Proof Hex String>]
  }
*/
const unpackAssetProofFile: TapdMethod<
  UnpackAssetProofFileArgs,
  UnpackAssetProofFileResult
> = (
  args: UnpackAssetProofFileArgs,
  cbk?: TapdCallback<UnpackAssetProofFileResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.proof || !isHex(args.proof)) {
            return cbk([400, 'ExpectedHexAssetProofFileToUnpack']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([
              400,
              'ExpectedAuthenticatedTapdToUnpackAssetProofFile',
            ]);
          }

          return cbk();
        },

        // Unpack the proof file
        unpack: [
          'validate',
          ({}, cbk) => {
            const request = {raw_proof_file: Buffer.from(args.proof, 'hex')};

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([
                  503,
                  'FailedToConnectToTapdToUnpackAssetProofFile',
                ]);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToUnpackAssetProofFile']);
              }

              if (!!err && String(err.details).includes(invalidFileError)) {
                return cbk([400, 'ExpectedValidAssetProofFileToUnpack']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorUnpackingAssetProofFile',
                  {err},
                ]);
              }

              if (!res || !isArray(res.raw_proofs)) {
                return cbk([503, 'ExpectedRawProofsInUnpackProofFileResponse']);
              }

              if (!res.raw_proofs.every(isBuffer)) {
                return cbk([503, 'ExpectedRawProofsInUnpackProofFileResponse']);
              }

              return cbk(null, {
                proofs: res.raw_proofs.map((n: Buffer) => n.toString('hex')),
              });
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'unpack'}, cbk),
    );
  });
};

export default unpackAssetProofFile;
