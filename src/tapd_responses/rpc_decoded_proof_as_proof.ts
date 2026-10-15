import outpointAsTransaction from './outpoint_as_transaction.js';
import rpcAssetAsAsset from './rpc_asset_as_asset.js';
import type {Asset} from './rpc_asset_as_asset.js';
import type {RpcAsset} from './rpc_asset_as_asset.js';

const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const metaTypes: Record<string, string> = {
  META_TYPE_JSON: 'json',
  META_TYPE_OPAQUE: 'opaque',
};

export type RpcDecodedProof = {
  alt_leaves: Buffer;
  asset: RpcAsset | null;
  challenge_witness: Buffer[];
  exclusion_proofs: Buffer[];
  genesis_reveal: {
    genesis_base_reveal: {
      asset_id: Buffer;
      asset_type: string;
      genesis_point: string;
      meta_hash: Buffer;
      name: string;
      output_index: number;
    } | null;
  } | null;
  group_key_reveal: {raw_group_key: Buffer; tapscript_root: Buffer} | null;
  inclusion_proof: Buffer;
  is_burn: boolean;
  meta_reveal: {data: Buffer; meta_hash: Buffer; type: string} | null;
  num_additional_inputs: number;
  number_of_proofs: number;
  proof_at_depth: number;
  split_root_proof: Buffer;
  tx_merkle_proof: Buffer;
};

export type Proof = {
  /** Additional Inputs Count */
  additional_inputs_count: number;
  /** Alternative Leaves Hex */
  alt_leaves?: string;
  asset: Asset;
  /** Challenge Witness Elements Hex */
  challenge_witness: string[];
  /** Proof Depth From the Last Proof In the File */
  depth: number;
  /** Exclusion Proofs Hex */
  exclusion_proofs: string[];
  genesis?: {
    /** Asset Id Hex */
    asset_id: string;
    /** Asset Is Collectible */
    is_collectible: boolean;
    /** Asset Metadata Hash Hex */
    meta_hash: string;
    /** Asset Name */
    name: string;
    /** Genesis Commitment Output Index */
    output_index: number;
    /** Genesis Point Transaction Id Hex */
    transaction_id: string;
    /** Genesis Point Transaction Output Index */
    transaction_vout: number;
  };
  group_key?: {
    /** Raw Group Key Hex */
    raw_key: string;
    /** Group Tapscript Root Hex */
    tapscript_root?: string;
  };
  /** Inclusion Proof Hex */
  inclusion_proof: string;
  /** Proof Is For a Burn */
  is_burn: boolean;
  meta?: {
    /** Metadata Hex */
    data: string;
    /** Metadata Hash Hex */
    hash: string;
    /** Metadata Type */
    type: string;
  };
  /** Proofs In the File Count */
  proofs_count: number;
  /** Split Root Proof Hex */
  split_root_proof?: string;
  /** Transaction Merkle Proof Hex */
  transaction_merkle_proof: string;
};

/** Proof from an RPC decoded proof

  {
    alt_leaves: <Alternative Leaves Buffer Object>
    asset: <RPC Asset Object>
    challenge_witness: [<Challenge Witness Element Buffer Object>]
    exclusion_proofs: [<Exclusion Proof Buffer Object>]
    [genesis_reveal]: {
      [genesis_base_reveal]: {
        asset_id: <Asset Id Buffer Object>
        asset_type: <Asset Type String>
        genesis_point: <Genesis Outpoint String>
        meta_hash: <Metadata Hash Buffer Object>
        name: <Asset Name String>
        output_index: <Genesis Commitment Output Index Number>
      }
    }
    [group_key_reveal]: {
      raw_group_key: <Raw Group Key Buffer Object>
      tapscript_root: <Group Tapscript Root Buffer Object>
    }
    inclusion_proof: <Inclusion Proof Buffer Object>
    is_burn: <Proof Is For a Burn Bool>
    [meta_reveal]: {
      data: <Metadata Buffer Object>
      meta_hash: <Metadata Hash Buffer Object>
      type: <Metadata Type String>
    }
    num_additional_inputs: <Additional Inputs Count Number>
    number_of_proofs: <Proofs In the File Count Number>
    proof_at_depth: <Proof Depth Number>
    split_root_proof: <Split Root Proof Buffer Object>
    tx_merkle_proof: <Transaction Merkle Proof Buffer Object>
  }

  @throws
  <Error>

  @returns
  {
    additional_inputs_count: <Additional Inputs Count Number>
    [alt_leaves]: <Alternative Leaves Hex String>
    asset: <Asset Object>
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
export default (proof?: RpcDecodedProof | null): Proof => {
  if (!proof) {
    throw new Error('ExpectedRpcDecodedProofDetails');
  }

  if (!isArray(proof.challenge_witness)) {
    throw new Error('ExpectedChallengeWitnessInRpcDecodedProof');
  }

  if (!isArray(proof.exclusion_proofs)) {
    throw new Error('ExpectedExclusionProofsInRpcDecodedProof');
  }

  if (!isBuffer(proof.inclusion_proof)) {
    throw new Error('ExpectedInclusionProofInRpcDecodedProof');
  }

  if (!isBuffer(proof.tx_merkle_proof)) {
    throw new Error('ExpectedTransactionMerkleProofInRpcDecodedProof');
  }

  const genesis = proof.genesis_reveal?.genesis_base_reveal;
  const group = proof.group_key_reveal;
  const meta = proof.meta_reveal;

  const hasGenesis = !!genesis?.asset_id?.length;

  return {
    additional_inputs_count: proof.num_additional_inputs,
    alt_leaves: hexOf(proof.alt_leaves),
    asset: rpcAssetAsAsset(proof.asset),
    challenge_witness: proof.challenge_witness.map(n => n.toString('hex')),
    depth: proof.proof_at_depth,
    exclusion_proofs: proof.exclusion_proofs.map(n => n.toString('hex')),
    genesis: !hasGenesis
      ? undefined
      : {
          asset_id: genesis.asset_id.toString('hex'),
          is_collectible: genesis.asset_type === 'COLLECTIBLE',
          meta_hash: genesis.meta_hash.toString('hex'),
          name: genesis.name,
          output_index: genesis.output_index,
          ...outpointAsTransaction(genesis.genesis_point),
        },
    group_key: !group?.raw_group_key?.length
      ? undefined
      : {
          raw_key: group.raw_group_key.toString('hex'),
          tapscript_root: hexOf(group.tapscript_root),
        },
    inclusion_proof: proof.inclusion_proof.toString('hex'),
    is_burn: proof.is_burn,
    meta: !meta?.meta_hash?.length
      ? undefined
      : {
          data: meta.data.toString('hex'),
          hash: meta.meta_hash.toString('hex'),
          type: metaTypes[meta.type] || 'unknown',
        },
    proofs_count: proof.number_of_proofs,
    split_root_proof: hexOf(proof.split_root_proof),
    transaction_merkle_proof: proof.tx_merkle_proof.toString('hex'),
  };
};
