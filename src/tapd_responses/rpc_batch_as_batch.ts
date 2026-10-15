import states from './batch_states.js';

const assetVersions = ['ASSET_VERSION_V0', 'ASSET_VERSION_V1'];
const base64AsHex = (n: string) => Buffer.from(n, 'base64').toString('hex');
const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const metaTypes: Record<string, string> = {
  META_TYPE_JSON: 'json',
  META_TYPE_OPAQUE: 'opaque',
};

type RpcPendingAsset = {
  amount: string;
  asset_meta: {data: Buffer; meta_hash: Buffer; type: string} | null;
  asset_type: string;
  asset_version: string;
  group_anchor: string;
  group_internal_key: {raw_key_bytes: Buffer} | null;
  group_key: Buffer;
  group_tapscript_root: Buffer;
  name: string;
  new_grouped_asset: boolean;
  script_key: {pub_key: Buffer} | null;
};

export type RpcMintingBatch = {
  assets: RpcPendingAsset[];
  batch_key: Buffer;
  batch_psbt: Buffer;
  batch_txid: string;
  created_at: string;
  height_hint: number;
  state: string;
};

export type RpcVerboseBatch = {
  batch: RpcMintingBatch | null;
  unsealed_assets?: {
    asset: RpcPendingAsset | null;
    group_virtual_psbt: string;
    group_virtual_tx: {transaction: Buffer} | null;
  }[];
};

export type PendingAsset = {
  /** Asset Units Numeric String */
  amount: string;
  /** Name of the Asset That Anchors a New Group */
  group_anchor?: string;
  /** Group Internal Public Key Hex */
  group_internal_key?: string;
  /** Group Key Hex */
  group_key?: string;
  /** Group Tapscript Root Hex */
  group_tapscript_root?: string;
  /** Asset Is Collectible */
  is_collectible: boolean;
  /** Asset Starts a New Group */
  is_new_group: boolean;
  /** Metadata Hex */
  metadata?: string;
  /** Metadata Hash Hex */
  metadata_hash?: string;
  /** Metadata Type */
  metadata_type?: string;
  /** Asset Name */
  name: string;
  /** Script Key Hex */
  script_key?: string;
  /** Asset Version */
  version: number;
};

export type Batch = {
  assets: PendingAsset[];
  /** Created At ISO 8601 Date */
  created_at: string;
  /** Block Height When Created */
  created_height: number;
  /** Batch Key Hex */
  id: string;
  /** Genesis Transaction PSBT Hex */
  psbt?: string;
  /** Batch State */
  state: string;
  /** Genesis Transaction Id Hex */
  transaction_id?: string;
  unsealed_assets: (PendingAsset & {
    /** Group Virtual Transaction PSBT Hex */
    group_virtual_psbt?: string;
    /** Group Virtual Transaction Hex */
    group_virtual_transaction?: string;
  })[];
};

/** Pending asset from an RPC pending asset

  {
    amount: <Asset Units Numeric String>
    [asset_meta]: {
      data: <Metadata Buffer Object>
      meta_hash: <Metadata Hash Buffer Object>
      type: <Metadata Type String>
    }
    asset_type: <Asset Type String>
    asset_version: <Asset Version String>
    group_anchor: <Name of the Asset That Anchors a New Group String>
    [group_internal_key]: {
      raw_key_bytes: <Group Internal Public Key Buffer Object>
    }
    group_key: <Group Key Buffer Object>
    group_tapscript_root: <Group Tapscript Root Buffer Object>
    name: <Asset Name String>
    new_grouped_asset: <Asset Starts a New Group Bool>
    [script_key]: {
      pub_key: <Script Key Buffer Object>
    }
  }

  @throws
  <Error>

  @returns
  <Pending Asset Object>
*/
const pendingAsset = (asset?: RpcPendingAsset | null): PendingAsset => {
  if (!asset) {
    throw new Error('ExpectedPendingAssetInRpcMintingBatch');
  }

  if (!asset.name) {
    throw new Error('ExpectedAssetNameInRpcPendingAsset');
  }

  if (!isNumeric(asset.amount)) {
    throw new Error('ExpectedAmountInRpcPendingAsset');
  }

  if (assetVersions.indexOf(asset.asset_version) === -1) {
    throw new Error('ExpectedKnownVersionInRpcPendingAsset');
  }

  if (!isBuffer(asset.group_key) || !isBuffer(asset.group_tapscript_root)) {
    throw new Error('ExpectedGroupDetailsInRpcPendingAsset');
  }

  const meta = asset.asset_meta;

  return {
    amount: asset.amount,
    group_anchor: asset.group_anchor || undefined,
    group_internal_key: hexOf(asset.group_internal_key?.raw_key_bytes),
    group_key: hexOf(asset.group_key),
    group_tapscript_root: hexOf(asset.group_tapscript_root),
    is_collectible: asset.asset_type === 'COLLECTIBLE',
    is_new_group: asset.new_grouped_asset,
    metadata: hexOf(meta?.data),
    metadata_hash: hexOf(meta?.meta_hash),
    metadata_type: !meta ? undefined : metaTypes[meta.type] || 'unknown',
    name: asset.name,
    script_key: hexOf(asset.script_key?.pub_key),
    version: assetVersions.indexOf(asset.asset_version),
  };
};

/** Batch from an RPC minting batch, with the unsealed assets if present

  {
    batch: {
      assets: [<RPC Pending Asset Object>]
      batch_key: <Batch Key Buffer Object>
      batch_psbt: <Genesis Transaction PSBT Buffer Object>
      batch_txid: <Genesis Transaction Id Hex String>
      created_at: <Created At Unix Seconds Numeric String>
      height_hint: <Block Height When Created Number>
      state: <Batch State String>
    }
    [unsealed_assets]: [{
      asset: <RPC Pending Asset Object>
      group_virtual_psbt: <Group Virtual Transaction PSBT Base64 String>
      [group_virtual_tx]: {
        transaction: <Group Virtual Transaction Buffer Object>
      }
    }]
  }

  @throws
  <Error>

  @returns
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
    unsealed_assets: [{
      amount: <Asset Units Numeric String>
      [group_anchor]: <Name of the Asset That Anchors a New Group String>
      [group_internal_key]: <Group Internal Public Key Hex String>
      [group_key]: <Group Key Hex String>
      [group_tapscript_root]: <Group Tapscript Root Hex String>
      [group_virtual_psbt]: <Group Virtual Transaction PSBT Hex String>
      [group_virtual_transaction]: <Group Virtual Transaction Hex String>
      is_collectible: <Asset Is Collectible Bool>
      is_new_group: <Asset Starts a New Group Bool>
      [metadata]: <Metadata Hex String>
      [metadata_hash]: <Metadata Hash Hex String>
      [metadata_type]: <Metadata Type String> // json, opaque
      name: <Asset Name String>
      [script_key]: <Script Key Hex String>
      version: <Asset Version Number>
    }]
  }
*/
export default ({batch, unsealed_assets}: RpcVerboseBatch): Batch => {
  if (!batch) {
    throw new Error('ExpectedRpcMintingBatch');
  }

  if (!isArray(batch.assets)) {
    throw new Error('ExpectedArrayOfAssetsInRpcMintingBatch');
  }

  if (!isBuffer(batch.batch_key) || !batch.batch_key.length) {
    throw new Error('ExpectedBatchKeyInRpcMintingBatch');
  }

  if (!isBuffer(batch.batch_psbt)) {
    throw new Error('ExpectedBatchPsbtInRpcMintingBatch');
  }

  if (!isNumeric(batch.created_at)) {
    throw new Error('ExpectedCreatedAtInRpcMintingBatch');
  }

  if (!states[batch.state]) {
    throw new Error('ExpectedKnownStateInRpcMintingBatch');
  }

  if (!!unsealed_assets && !isArray(unsealed_assets)) {
    throw new Error('ExpectedArrayOfUnsealedAssetsInRpcVerboseBatch');
  }

  return {
    assets: batch.assets.map(pendingAsset),
    created_at: dateFrom(batch.created_at),
    created_height: batch.height_hint,
    id: batch.batch_key.toString('hex'),
    psbt: hexOf(batch.batch_psbt),
    state: states[batch.state],
    transaction_id: batch.batch_txid || undefined,
    unsealed_assets: (unsealed_assets || []).map(unsealed => ({
      ...pendingAsset(unsealed.asset),
      group_virtual_psbt: !unsealed.group_virtual_psbt
        ? undefined
        : base64AsHex(unsealed.group_virtual_psbt),
      group_virtual_transaction: hexOf(unsealed.group_virtual_tx?.transaction),
    })),
  };
};
