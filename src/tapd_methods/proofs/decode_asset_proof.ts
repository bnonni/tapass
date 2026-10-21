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

const invalidDepthError = 'invalid depth';
const invalidProofErrors = [
  'could not identify decoding format',
  'invalid proof file',
  'unable to decode proof',
];
const isHex = (n: string) => !!n && !(n.length % 2) && /^[0-9A-F]*$/i.test(n);
const {isSafeInteger} = Number;
const maxDepth = 4294967295;
const method = 'decodeProof';
const type = 'default';

export type DecodeAssetProofArgs = AuthenticatedTapdArgs<{
  /** Proof Depth From the Last Proof In the File Number */
  depth?: number;
  /** Include the Asset Metadata */
  is_including_meta?: boolean;
  /** Asset Proof or Proof File Hex String */
  proof: string;
}>;

export type DecodeAssetProofResult = Proof;

type Tasks = {
  decode: DecodeAssetProofResult;
  validate: undefined;
};

/** Decode an asset proof or one proof in an asset proof file

  Requires `proofs:read` permission

  For a proof file, `depth` selects the proof: 0 is the last proof

  {
    [depth]: <Proof Depth From the Last Proof In the File Number>
    [is_including_meta]: <Include the Asset Metadata Bool>
    proof: <Asset Proof or Proof File Hex String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
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
    [meta]: {
      data: <Metadata Hex String>
      hash: <Metadata Hash Hex String>
      type: <Metadata Type String> // json, opaque, unknown
    }
    proofs_count: <Proofs In the File Count Number>
    [split_root_proof]: <Split Root Proof Hex String>
    transaction_merkle_proof: <Transaction Merkle Proof Hex String>
  }
*/
const decodeAssetProof: TapdMethod<
  DecodeAssetProofArgs,
  DecodeAssetProofResult
> = (
  args: DecodeAssetProofArgs,
  cbk?: TapdCallback<DecodeAssetProofResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (args.depth !== undefined && !isSafeInteger(args.depth)) {
            return cbk([400, 'ExpectedIntegerDepthToDecodeAssetProof']);
          }

          if (args.depth !== undefined && args.depth < 0) {
            return cbk([400, 'ExpectedNonNegativeDepthToDecodeAssetProof']);
          }

          if (args.depth !== undefined && args.depth > maxDepth) {
            return cbk([400, 'ExpectedSmallerDepthToDecodeAssetProof']);
          }

          if (!args.proof || !isHex(args.proof)) {
            return cbk([400, 'ExpectedHexAssetProofToDecode']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToDecodeAssetProof']);
          }

          return cbk();
        },

        // Decode the proof
        decode: [
          'validate',
          ({}, cbk) => {
            const request = {
              proof_at_depth: args.depth || 0,
              raw_proof: Buffer.from(args.proof, 'hex'),
              with_meta_reveal: !!args.is_including_meta,
              with_prev_witnesses: false,
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToDecodeAssetProof']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToDecodeAssetProof']);
              }

              const details = String(err?.details);

              if (!!err && details.includes(invalidDepthError)) {
                return cbk([400, 'ExpectedDepthInProofFileToDecodeAssetProof']);
              }

              if (!!err && invalidProofErrors.some(n => details.includes(n))) {
                return cbk([400, 'ExpectedValidAssetProofToDecode']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorDecodingAssetProof', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToDecodeAssetProofRequest']);
              }

              try {
                return cbk(null, rpcDecodedProofAsProof(res.decoded_proof));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'decode'}, cbk),
    );
  });
};

export default decodeAssetProof;
