import outpointAsTransaction from './outpoint_as_transaction.js';

const assetVersions = ['ASSET_VERSION_V0', 'ASSET_VERSION_V1'];
const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const scriptKeyTypes: Record<string, string> = {
  SCRIPT_KEY_BIP86: 'bip86',
  SCRIPT_KEY_BURN: 'burn',
  SCRIPT_KEY_CHANNEL: 'channel',
  SCRIPT_KEY_SCRIPT_PATH_EXTERNAL: 'script_path_external',
  SCRIPT_KEY_TOMBSTONE: 'tombstone',
  SCRIPT_KEY_UNIQUE_PEDERSEN: 'unique_pedersen',
  SCRIPT_KEY_UNKNOWN: 'unknown',
};
const zero = '0';

export type RpcAsset = {
  amount: string;
  asset_genesis: {
    asset_id: Buffer;
    asset_type: string;
    genesis_point: string;
    meta_hash: Buffer;
    name: string;
    output_index: number;
  } | null;
  asset_group: {
    asset_witness: Buffer;
    raw_group_key: Buffer;
    tapscript_root: Buffer;
    tweaked_group_key: Buffer;
  } | null;
  chain_anchor: {
    anchor_block_hash: string;
    anchor_outpoint: string;
    anchor_tx: Buffer;
    block_height: number;
    block_timestamp: string;
    internal_key: Buffer;
    merkle_root: Buffer;
    tapscript_sibling: Buffer;
  } | null;
  decimal_display: {decimal_display: number} | null;
  is_burn: boolean;
  is_spent: boolean;
  lease_expiry: string;
  lease_owner: Buffer;
  lock_time: number;
  relative_lock_time: number;
  script_key: Buffer;
  script_key_is_local: boolean;
  script_key_type: string;
  script_version: number;
  version: string;
};

export type Asset = {
  /** Asset Units Numeric String */
  amount: string;
  anchor?: {
    /** Anchor Block Hash Hex */
    block_hash?: string;
    /** Anchor Block Height */
    block_height?: number;
    /** Anchor Confirmed At ISO 8601 Date */
    confirmed_at?: string;
    /** Anchor Internal Key Hex */
    internal_key: string;
    /** Anchor Taproot Merkle Root Hex */
    merkle_root: string;
    /** Tapscript Sibling Preimage Hex */
    tapscript_sibling?: string;
    /** Raw Anchor Transaction Hex */
    transaction: string;
    /** Anchor Transaction Id Hex */
    transaction_id: string;
    /** Anchor Transaction Output Index */
    transaction_vout: number;
  };
  /** Asset Id Hex */
  asset_id: string;
  /** Decimal Places To Show */
  decimal_display?: number;
  /** Genesis Commitment Output Index */
  genesis_output_index: number;
  /** Genesis Point Transaction Id Hex */
  genesis_transaction_id: string;
  /** Genesis Point Transaction Output Index */
  genesis_transaction_vout: number;
  group?: {
    /** Tweaked Group Key Hex */
    key: string;
    /** Raw Group Key Hex */
    raw_key: string;
    /** Group Tapscript Root Hex */
    tapscript_root?: string;
    /** Group Membership Witness Hex */
    witness?: string;
  };
  /** Asset Is Burned */
  is_burn: boolean;
  /** Asset Is Collectible */
  is_collectible: boolean;
  /** Script Key Belongs To This Node */
  is_local: boolean;
  /** Asset Is Spent */
  is_spent: boolean;
  /** Lease Expires At ISO 8601 Date */
  lease_expires_at?: string;
  /** Lease Owner Id Hex */
  lease_owner?: string;
  /** Lock Time */
  lock_time?: number;
  /** Asset Metadata Hash Hex */
  meta_hash: string;
  /** Asset Name */
  name: string;
  /** Relative Lock Time */
  relative_lock_time?: number;
  /** Script Key Hex */
  script_key: string;
  /** Script Key Type */
  script_key_type: string;
  /** Script Version */
  script_version: number;
  /** Asset Version */
  version: number;
};

/** Asset from an RPC asset

  {
    amount: <Asset Units Numeric String>
    asset_genesis: {
      asset_id: <Asset Id Buffer Object>
      asset_type: <Asset Type String>
      genesis_point: <Genesis Outpoint String>
      meta_hash: <Metadata Hash Buffer Object>
      name: <Asset Name String>
      output_index: <Genesis Commitment Output Index Number>
    }
    [asset_group]: {
      asset_witness: <Group Membership Witness Buffer Object>
      raw_group_key: <Raw Group Key Buffer Object>
      tapscript_root: <Group Tapscript Root Buffer Object>
      tweaked_group_key: <Tweaked Group Key Buffer Object>
    }
    [chain_anchor]: {
      anchor_block_hash: <Anchor Block Hash Hex String>
      anchor_outpoint: <Anchor Outpoint String>
      anchor_tx: <Raw Anchor Transaction Buffer Object>
      block_height: <Anchor Block Height Number>
      block_timestamp: <Anchor Block Unix Seconds Numeric String>
      internal_key: <Anchor Internal Key Buffer Object>
      merkle_root: <Anchor Taproot Merkle Root Buffer Object>
      tapscript_sibling: <Tapscript Sibling Preimage Buffer Object>
    }
    [decimal_display]: {
      decimal_display: <Decimal Places To Show Number>
    }
    is_burn: <Asset Is Burned Bool>
    is_spent: <Asset Is Spent Bool>
    lease_expiry: <Lease Expires At Unix Seconds Numeric String>
    lease_owner: <Lease Owner Id Buffer Object>
    lock_time: <Lock Time Number>
    relative_lock_time: <Relative Lock Time Number>
    script_key: <Script Key Buffer Object>
    script_key_is_local: <Script Key Belongs To This Node Bool>
    script_key_type: <Script Key Type String>
    script_version: <Script Version Number>
    version: <Asset Version String>
  }

  @throws
  <Error>

  @returns
  {
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
*/
export default (asset?: RpcAsset | null): Asset => {
  if (!asset) {
    throw new Error('ExpectedRpcAssetDetails');
  }

  if (!isNumeric(asset.amount)) {
    throw new Error('ExpectedAmountInRpcAsset');
  }

  const genesis = asset.asset_genesis;

  if (!genesis || !isBuffer(genesis.asset_id) || !genesis.asset_id.length) {
    throw new Error('ExpectedAssetGenesisInRpcAsset');
  }

  if (!isBuffer(genesis.meta_hash)) {
    throw new Error('ExpectedMetaHashInRpcAssetGenesis');
  }

  if (!isBuffer(asset.script_key)) {
    throw new Error('ExpectedScriptKeyInRpcAsset');
  }

  if (assetVersions.indexOf(asset.version) === -1) {
    throw new Error('ExpectedKnownVersionInRpcAsset');
  }

  const anchor = asset.chain_anchor;
  const genesisPoint = outpointAsTransaction(genesis.genesis_point);
  const group = asset.asset_group;
  const hasLease = !!asset.lease_owner?.length;

  return {
    amount: asset.amount,
    anchor: !anchor
      ? undefined
      : {
          block_hash: anchor.anchor_block_hash || undefined,
          block_height: anchor.block_height || undefined,
          confirmed_at:
            !!anchor.block_timestamp && anchor.block_timestamp !== zero
              ? dateFrom(anchor.block_timestamp)
              : undefined,
          internal_key: anchor.internal_key.toString('hex'),
          merkle_root: anchor.merkle_root.toString('hex'),
          tapscript_sibling: hexOf(anchor.tapscript_sibling),
          transaction: anchor.anchor_tx.toString('hex'),
          ...outpointAsTransaction(anchor.anchor_outpoint),
        },
    asset_id: genesis.asset_id.toString('hex'),
    decimal_display: asset.decimal_display?.decimal_display || undefined,
    genesis_output_index: genesis.output_index,
    genesis_transaction_id: genesisPoint.transaction_id,
    genesis_transaction_vout: genesisPoint.transaction_vout,
    group:
      !group || !group.tweaked_group_key?.length
        ? undefined
        : {
            key: group.tweaked_group_key.toString('hex'),
            raw_key: group.raw_group_key.toString('hex'),
            tapscript_root: hexOf(group.tapscript_root),
            witness: hexOf(group.asset_witness),
          },
    is_burn: asset.is_burn,
    is_collectible: genesis.asset_type === 'COLLECTIBLE',
    is_local: asset.script_key_is_local,
    is_spent: asset.is_spent,
    lease_expires_at: hasLease ? dateFrom(asset.lease_expiry) : undefined,
    lease_owner: hasLease ? asset.lease_owner.toString('hex') : undefined,
    lock_time: asset.lock_time || undefined,
    meta_hash: genesis.meta_hash.toString('hex'),
    name: genesis.name,
    relative_lock_time: asset.relative_lock_time || undefined,
    script_key: asset.script_key.toString('hex'),
    script_key_type: scriptKeyTypes[asset.script_key_type] || 'unknown',
    script_version: asset.script_version,
    version: assetVersions.indexOf(asset.version),
  };
};
