const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);

export type RpcAssetAmount = {
  amount: string;
  asset_id: Buffer;
  group_key: Buffer;
};

export type AssetAmount = {
  /** Asset Units Numeric String */
  amount: string;
  /** Asset Id Hex */
  asset_id: string;
  /** Asset Group Key Hex */
  group_key?: string;
};

/** Asset amount from an RPC asset amount

  {
    amount: <Asset Units Numeric String>
    asset_id: <Asset Id Buffer Object>
    group_key: <Asset Group Key Buffer Object>
  }

  @throws
  <Error>

  @returns
  {
    amount: <Asset Units Numeric String>
    asset_id: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
  }
*/
export default (assetAmount?: RpcAssetAmount | null): AssetAmount => {
  if (!assetAmount) {
    throw new Error('ExpectedRpcAssetAmountDetails');
  }

  if (!isNumeric(assetAmount.amount)) {
    throw new Error('ExpectedAmountInRpcAssetAmount');
  }

  if (!isBuffer(assetAmount.asset_id) || !assetAmount.asset_id.length) {
    throw new Error('ExpectedAssetIdInRpcAssetAmount');
  }

  return {
    amount: assetAmount.amount,
    asset_id: assetAmount.asset_id.toString('hex'),
    group_key: hexOf(assetAmount.group_key),
  };
};
