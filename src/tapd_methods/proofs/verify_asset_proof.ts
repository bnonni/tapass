import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcDecodedProofAsProof} from '../../tapd_responses/index.js';
import type {Proof} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const invalidFileErrors = ['invalid proof file', 'unable to decode proof file'];
const isHex = (n: string) => !!n && !(n.length % 2) && /^[0-9A-F]*$/i.test(n);
const method = 'verifyProof';
const notFileError = 'invalid raw proof, expect file';
const type = 'default';

export type VerifyAssetProofArgs = AuthenticatedTapdArgs<{
  /** Asset Proof File Hex String */
  proof: string;
}>;

export type VerifyAssetProofResult = {
  /** Proof File Is Valid */
  is_valid: boolean;
  /** Last Proof In the File */
  proof?: Proof;
};

type Tasks = {
  verify: VerifyAssetProofResult;
  validate: undefined;
};

/** Verify an asset proof file

  Requires `proofs:read` permission

  A valid proof file also returns its last proof, decoded

  {
    proof: <Asset Proof File Hex String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    is_valid: <Proof File Is Valid Bool>
    [proof]: {
      additional_inputs_count: <Additional Inputs Count Number>
      [alt_leaves]: <Alternative Leaves Hex String>
      asset: {
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
      }
      challenge_witness: [<Challenge Witness Element Hex String>]
      depth: <Proof Depth From the Last Proof In the File Number>
      exclusion_proofs: [<Exclusion Proof Hex String>]
      [genesis]: {
        asset_id: <Asset Id Hex String>
        is_collectible: <Asset Is Collectible Bool>
        meta_hash: <Asset Metadata Hash Hex String>
        name: <Asset Name String>
        output_index: <Genesis Commitment Output Index Number>
        transaction_id: <Genesis Point Transaction Id Hex String>
        transaction_vout: <Genesis Point Transaction Output Index Number>
      }
      [group_key]: {
        raw_key: <Raw Group Key Hex String>
        [tapscript_root]: <Group Tapscript Root Hex String>
      }
      inclusion_proof: <Inclusion Proof Hex String>
      is_burn: <Proof Is For a Burn Bool>
      proofs_count: <Proofs In the File Count Number>
      [split_root_proof]: <Split Root Proof Hex String>
      transaction_merkle_proof: <Transaction Merkle Proof Hex String>
    }
  }
*/
const verifyAssetProof: TapdMethod<
  VerifyAssetProofArgs,
  VerifyAssetProofResult
> = (
  args: VerifyAssetProofArgs,
  cbk?: TapdCallback<VerifyAssetProofResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.proof || !isHex(args.proof)) {
            return cbk([400, 'ExpectedHexAssetProofFileToVerify']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToVerifyAssetProof']);
          }

          return cbk();
        },

        // Verify the proof file
        verify: [
          'validate',
          ({}, cbk) => {
            const request = {raw_proof_file: Buffer.from(args.proof, 'hex')};

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToVerifyAssetProof']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToVerifyAssetProof']);
              }

              const details = String(err?.details);

              if (!!err && details.includes(notFileError)) {
                return cbk([400, 'ExpectedProofFileNotSingleProofToVerify']);
              }

              if (!!err && invalidFileErrors.some(n => details.includes(n))) {
                return cbk([400, 'ExpectedValidAssetProofFileToVerify']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorVerifyingAssetProof', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToVerifyAssetProofRequest']);
              }

              // Exit early when the proof file is not valid
              if (!res.valid) {
                return cbk(null, {is_valid: false});
              }

              try {
                const proof = rpcDecodedProofAsProof(res.decoded_proof);

                return cbk(null, {proof, is_valid: true});
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'verify'}, cbk),
    );
  });
};

export default verifyAssetProof;
