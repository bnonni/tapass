import outpointAsTransaction from './outpoint_as_transaction.js';

const assetVersions = ['ASSET_VERSION_V0', 'ASSET_VERSION_V1'];
const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^-?\d+$/.test(n);
const proofDeliveryStates: Record<string, 'complete' | 'pending'> = {
  PROOF_DELIVERY_STATUS_COMPLETE: 'complete',
  PROOF_DELIVERY_STATUS_PENDING: 'pending',
};
const reversedHex = (n: Buffer) => Buffer.from(n).reverse().toString('hex');
const splitRootType = 'OUTPUT_TYPE_SPLIT_ROOT';
const txHashByteLength = 32;

type RpcTransferInput = {
  amount: string;
  anchor_point: string;
  asset_id: Buffer;
  asset_type: string;
  group_key: Buffer;
  script_key: Buffer;
};

type RpcTransferOutput = {
  amount: string;
  anchor: {
    internal_key: Buffer;
    merkle_root: Buffer;
    num_passive_assets: number;
    outpoint: string;
    pk_script: Buffer;
    taproot_asset_root: Buffer;
    tapscript_sibling: Buffer;
    value: string;
  } | null;
  asset_id: Buffer;
  asset_type: string;
  asset_version: string;
  group_key: Buffer;
  lock_time: string;
  new_proof_blob: Buffer;
  output_type: string;
  proof_courier_addr: string;
  proof_delivery_status: string;
  relative_lock_time: string;
  script_key: Buffer;
  script_key_is_local: boolean;
  split_commit_root_hash: Buffer;
  tap_addr: string;
};

export type RpcTransfer = {
  anchor_tx: Buffer;
  anchor_tx_block_hash: {hash: Buffer; hash_str: string} | null;
  anchor_tx_block_height: number;
  anchor_tx_chain_fees: string;
  anchor_tx_hash: Buffer;
  anchor_tx_height_hint: number;
  inputs: RpcTransferInput[];
  label: string;
  outputs: RpcTransferOutput[];
  transfer_timestamp: string;
};

export type Transfer = {
  /** Anchor Block Hash Hex */
  block_hash?: string;
  /** Anchor Block Height */
  block_height?: number;
  /** Transfer Created At ISO 8601 Date */
  created_at: string;
  /** Anchor Transaction Chain Fee Tokens */
  fee: number;
  /** Anchor Transaction Confirmation Height Hint */
  height_hint: number;
  inputs: {
    /** Asset Units Numeric String */
    amount: string;
    /** Asset Id Hex */
    asset_id: string;
    /** Asset Group Key Hex */
    group_key?: string;
    /** Asset Is Collectible */
    is_collectible: boolean;
    /** Script Key Hex */
    script_key: string;
    /** Spent Anchor Transaction Id Hex */
    transaction_id: string;
    /** Spent Anchor Transaction Output Index */
    transaction_vout: number;
  }[];
  /** Transfer Label */
  label?: string;
  outputs: {
    /** Taproot Assets Address Of the Recipient */
    address?: string;
    /** Asset Units Numeric String */
    amount: string;
    anchor: {
      /** Anchor Internal Key Hex */
      internal_key: string;
      /** Anchor Taproot Merkle Root Hex */
      merkle_root: string;
      /** Output Script Hex */
      output_script: string;
      /** Count Of Passive Assets In the Anchor */
      passive_assets_count: number;
      /** Taproot Asset Root Commitment Hex */
      taproot_asset_root: string;
      /** Tapscript Sibling Preimage Hex */
      tapscript_sibling?: string;
      /** Anchor Output Tokens */
      tokens: number;
      /** Anchor Transaction Id Hex */
      transaction_id: string;
      /** Anchor Transaction Output Index */
      transaction_vout: number;
    };
    /** Asset Id Hex */
    asset_id?: string;
    /** Asset Version */
    asset_version: number;
    /** Asset Group Key Hex */
    group_key?: string;
    /** Asset Is Collectible */
    is_collectible: boolean;
    /** Script Key Belongs To This Node */
    is_local: boolean;
    /** Output Is the Split Root */
    is_split_root: boolean;
    /** Lock Time */
    lock_time?: number;
    /** Proof File Hex */
    proof?: string;
    /** Proof Courier Address */
    proof_courier?: string;
    /** Proof Delivery State */
    proof_delivery?: 'complete' | 'pending';
    /** Relative Lock Time */
    relative_lock_time?: number;
    /** Script Key Hex */
    script_key: string;
    /** Split Commitment Root Hash Hex */
    split_root_hash?: string;
  }[];
  /** Raw Anchor Transaction Hex */
  transaction?: string;
  /** Anchor Transaction Id Hex */
  transaction_id: string;
};

/** Transfer from an RPC asset transfer

  {
    anchor_tx: <Raw Anchor Transaction Buffer Object>
    [anchor_tx_block_hash]: {
      hash_str: <Block Hash Hex String>
    }
    anchor_tx_block_height: <Anchor Block Height Number>
    anchor_tx_chain_fees: <Chain Fee Satoshis Numeric String>
    anchor_tx_hash: <Anchor Transaction Hash Internal Order Buffer Object>
    anchor_tx_height_hint: <Height Hint Number>
    inputs: [{
      amount: <Asset Units Numeric String>
      anchor_point: <Spent Anchor Outpoint String>
      asset_id: <Asset Id Buffer Object>
      asset_type: <Asset Type String>
      group_key: <Asset Group Key Buffer Object>
      script_key: <Script Key Buffer Object>
    }]
    label: <Transfer Label String>
    outputs: [{
      amount: <Asset Units Numeric String>
      anchor: {
        internal_key: <Internal Key Buffer Object>
        merkle_root: <Merkle Root Buffer Object>
        num_passive_assets: <Passive Assets Count Number>
        outpoint: <Anchor Outpoint String>
        pk_script: <Output Script Buffer Object>
        taproot_asset_root: <Taproot Asset Root Buffer Object>
        tapscript_sibling: <Tapscript Sibling Buffer Object>
        value: <Output Satoshis Numeric String>
      }
      asset_id: <Asset Id Buffer Object>
      asset_type: <Asset Type String>
      asset_version: <Asset Version String>
      group_key: <Asset Group Key Buffer Object>
      lock_time: <Lock Time Numeric String>
      new_proof_blob: <Proof File Buffer Object>
      output_type: <Output Type String>
      proof_courier_addr: <Proof Courier Address String>
      proof_delivery_status: <Proof Delivery Status String>
      relative_lock_time: <Relative Lock Time Numeric String>
      script_key: <Script Key Buffer Object>
      script_key_is_local: <Script Key Belongs To This Node Bool>
      split_commit_root_hash: <Split Root Hash Buffer Object>
      tap_addr: <Taproot Assets Address String>
    }]
    transfer_timestamp: <Created At Unix Seconds Numeric String>
  }

  @throws
  <Error>

  @returns
  {
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
  }
*/
export default (transfer?: RpcTransfer | null): Transfer => {
  if (!transfer) {
    throw new Error('ExpectedRpcTransferDetails');
  }

  if (!isNumeric(transfer.anchor_tx_chain_fees)) {
    throw new Error('ExpectedChainFeesInRpcTransfer');
  }

  if (!isBuffer(transfer.anchor_tx_hash)) {
    throw new Error('ExpectedAnchorTransactionHashInRpcTransfer');
  }

  if (transfer.anchor_tx_hash.length !== txHashByteLength) {
    throw new Error('ExpectedAnchorTransactionHashInRpcTransfer');
  }

  if (!isArray(transfer.inputs)) {
    throw new Error('ExpectedArrayOfInputsInRpcTransfer');
  }

  if (!isArray(transfer.outputs)) {
    throw new Error('ExpectedArrayOfOutputsInRpcTransfer');
  }

  if (!isNumeric(transfer.transfer_timestamp)) {
    throw new Error('ExpectedTimestampInRpcTransfer');
  }

  transfer.inputs.forEach(input => {
    if (!isNumeric(input?.amount)) {
      throw new Error('ExpectedAmountInRpcTransferInput');
    }

    if (!isBuffer(input.asset_id) || !isBuffer(input.script_key)) {
      throw new Error('ExpectedAssetIdAndScriptKeyInRpcTransferInput');
    }
  });

  transfer.outputs.forEach(output => {
    if (!isNumeric(output?.amount)) {
      throw new Error('ExpectedAmountInRpcTransferOutput');
    }

    if (!output.anchor) {
      throw new Error('ExpectedAnchorInRpcTransferOutput');
    }

    if (!isNumeric(output.anchor.value)) {
      throw new Error('ExpectedAnchorValueInRpcTransferOutput');
    }

    if (!isBuffer(output.script_key)) {
      throw new Error('ExpectedScriptKeyInRpcTransferOutput');
    }
  });

  const blockHash = transfer.anchor_tx_block_hash?.hash_str;

  return {
    block_hash: blockHash || undefined,
    block_height: transfer.anchor_tx_block_height || undefined,
    created_at: dateFrom(transfer.transfer_timestamp),
    fee: Number(transfer.anchor_tx_chain_fees),
    height_hint: transfer.anchor_tx_height_hint,
    inputs: transfer.inputs.map(input => ({
      amount: input.amount,
      asset_id: input.asset_id.toString('hex'),
      group_key: hexOf(input.group_key),
      is_collectible: input.asset_type === 'COLLECTIBLE',
      script_key: input.script_key.toString('hex'),
      ...outpointAsTransaction(input.anchor_point),
    })),
    label: transfer.label || undefined,
    outputs: transfer.outputs.map(output => {
      const anchor = output.anchor!;

      return {
        address: output.tap_addr || undefined,
        amount: output.amount,
        anchor: {
          internal_key: anchor.internal_key.toString('hex'),
          merkle_root: anchor.merkle_root.toString('hex'),
          output_script: anchor.pk_script.toString('hex'),
          passive_assets_count: anchor.num_passive_assets,
          taproot_asset_root: anchor.taproot_asset_root.toString('hex'),
          tapscript_sibling: hexOf(anchor.tapscript_sibling),
          tokens: Number(anchor.value),
          ...outpointAsTransaction(anchor.outpoint),
        },
        asset_id: hexOf(output.asset_id),
        asset_version: assetVersions.indexOf(output.asset_version),
        group_key: hexOf(output.group_key),
        is_collectible: output.asset_type === 'COLLECTIBLE',
        is_local: output.script_key_is_local,
        is_split_root: output.output_type === splitRootType,
        lock_time: Number(output.lock_time) || undefined,
        proof: hexOf(output.new_proof_blob),
        proof_courier: output.proof_courier_addr || undefined,
        proof_delivery: proofDeliveryStates[output.proof_delivery_status],
        relative_lock_time: Number(output.relative_lock_time) || undefined,
        script_key: output.script_key.toString('hex'),
        split_root_hash: hexOf(output.split_commit_root_hash),
      };
    }),
    transaction: hexOf(transfer.anchor_tx),
    // tapd sends the anchor transaction hash in internal byte order
    transaction_id: reversedHex(transfer.anchor_tx_hash),
  };
};
