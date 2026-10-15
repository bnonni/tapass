import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAssetAsAsset} from '../../src/tapd_responses/index.js';
import {rpcDecodedProofAsProof} from '../../src/tapd_responses/index.js';
import {proofResponses} from '../fixtures/tapd_proof_responses.js';

const rpcProof = proofResponses.decodeProof.decoded_proof;

const tests = [
  {
    args: null,
    description: 'Proof details are expected',
    error: 'ExpectedRpcDecodedProofDetails',
  },
  {
    args: {...rpcProof, challenge_witness: null},
    description: 'A challenge witness is expected',
    error: 'ExpectedChallengeWitnessInRpcDecodedProof',
  },
  {
    args: {...rpcProof, exclusion_proofs: undefined},
    description: 'Exclusion proofs are expected',
    error: 'ExpectedExclusionProofsInRpcDecodedProof',
  },
  {
    args: {...rpcProof, inclusion_proof: 'proof'},
    description: 'An inclusion proof is expected',
    error: 'ExpectedInclusionProofInRpcDecodedProof',
  },
  {
    args: {...rpcProof, tx_merkle_proof: null},
    description: 'A transaction merkle proof is expected',
    error: 'ExpectedTransactionMerkleProofInRpcDecodedProof',
  },
  {
    args: {...rpcProof, asset: null},
    description: 'An asset is expected',
    error: 'ExpectedRpcAssetDetails',
  },
  {
    args: rpcProof,
    description: 'A real tapd proof is mapped',
    expected: {
      additional_inputs_count: 0,
      alt_leaves: undefined,
      asset: rpcAssetAsAsset(rpcProof.asset),
      challenge_witness: [],
      depth: 0,
      exclusion_proofs: [rpcProof.exclusion_proofs[0].toString('hex')],
      genesis: {
        asset_id:
          '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2',
        is_collectible: false,
        meta_hash:
          'f19bbf25df2e3f02ef33bd8edfdea2a176f38f608065f920aeef077644a268bd',
        name: 'smoke-coin',
        output_index: 0,
        transaction_id:
          '194b2d31fa33b89c7045a4fa5ce859e70ae3c6bdf41164b7bd3cee31f4a9323b',
        transaction_vout: 0,
      },
      group_key: undefined,
      inclusion_proof: rpcProof.inclusion_proof.toString('hex'),
      is_burn: false,
      meta: {
        data: '',
        hash: 'f19bbf25df2e3f02ef33bd8edfdea2a176f38f608065f920aeef077644a268bd',
        type: 'opaque',
      },
      proofs_count: 1,
      split_root_proof: undefined,
      transaction_merkle_proof: rpcProof.tx_merkle_proof.toString('hex'),
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcDecodedProofAsProof(args), new Error(error), 'Got err');
    } else {
      deepStrictEqual(rpcDecodedProofAsProof(args), expected, 'Got proof');
    }

    return;
  });
});

test('Missing reveals are undefined and group reveals are mapped', () => {
  const key = Buffer.alloc(33, 2);

  const noReveals = rpcDecodedProofAsProof({
    ...rpcProof,
    genesis_reveal: null,
    group_key_reveal: null,
    meta_reveal: null,
  });

  deepStrictEqual(noReveals.genesis, undefined);
  deepStrictEqual(noReveals.group_key, undefined);
  deepStrictEqual(noReveals.meta, undefined);

  const withGroup = rpcDecodedProofAsProof({
    ...rpcProof,
    group_key_reveal: {raw_group_key: key, tapscript_root: Buffer.alloc(0)},
    meta_reveal: {...rpcProof.meta_reveal, type: 'META_TYPE_NEW'},
  });

  deepStrictEqual(withGroup.group_key, {
    raw_key: key.toString('hex'),
    tapscript_root: undefined,
  });
  deepStrictEqual(withGroup.meta?.type, 'unknown');
});
