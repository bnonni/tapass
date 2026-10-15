const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const txIdByteLength = 32;

export type RpcAssetBurn = {
  amount: string;
  anchor_txid: Buffer;
  asset_id: Buffer;
  asset_type: string;
  note: string;
  tweaked_group_key: Buffer;
};

export type Burn = {
  /** Burned Asset Units Numeric String */
  amount: string;
  /** Asset Id Hex */
  asset_id: string;
  /** Asset Group Key Hex */
  group_key?: string;
  /** Asset Is Collectible */
  is_collectible: boolean;
  /** Burn Note */
  note?: string;
  /** Burn Anchor Transaction Id Hex */
  transaction_id: string;
};

/** Burn from an RPC asset burn

  tapd sends the anchor transaction id in internal byte order

  {
    amount: <Burned Asset Units Numeric String>
    anchor_txid: <Anchor Transaction Id Internal Byte Order Buffer Object>
    asset_id: <Asset Id Buffer Object>
    asset_type: <Asset Type String>
    note: <Burn Note String>
    tweaked_group_key: <Asset Group Key Buffer Object>
  }

  @throws
  <Error>

  @returns
  {
    amount: <Burned Asset Units Numeric String>
    asset_id: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    is_collectible: <Asset Is Collectible Bool>
    [note]: <Burn Note String>
    transaction_id: <Burn Anchor Transaction Id Hex String>
  }
*/
export default (burn?: RpcAssetBurn | null): Burn => {
  if (!burn) {
    throw new Error('ExpectedRpcAssetBurnDetails');
  }

  if (!isNumeric(burn.amount)) {
    throw new Error('ExpectedAmountInRpcAssetBurn');
  }

  if (
    !isBuffer(burn.anchor_txid) ||
    burn.anchor_txid.length !== txIdByteLength
  ) {
    throw new Error('ExpectedAnchorTransactionIdInRpcAssetBurn');
  }

  if (!isBuffer(burn.asset_id) || !burn.asset_id.length) {
    throw new Error('ExpectedAssetIdInRpcAssetBurn');
  }

  return {
    amount: burn.amount,
    asset_id: burn.asset_id.toString('hex'),
    group_key: hexOf(burn.tweaked_group_key),
    is_collectible: burn.asset_type === 'COLLECTIBLE',
    note: burn.note || undefined,
    transaction_id: Buffer.from(burn.anchor_txid).reverse().toString('hex'),
  };
};
