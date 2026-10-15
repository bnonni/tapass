const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);

export type RpcAssetBalance = {
  asset_genesis: {
    asset_id: Buffer;
    asset_type: string;
    meta_hash: Buffer;
    name: string;
  } | null;
  balance: string;
  group_key: Buffer;
};

export type Balance = {
  /** Asset Id Hex */
  asset_id: string;
  /** Balance Asset Units Numeric String */
  balance: string;
  /** Asset Group Key Hex */
  group_key?: string;
  /** Asset Is Collectible */
  is_collectible: boolean;
  /** Asset Metadata Hash Hex */
  meta_hash: string;
  /** Asset Name */
  name: string;
};

/** Balance from an RPC asset balance

  {
    asset_genesis: {
      asset_id: <Asset Id Buffer Object>
      asset_type: <Asset Type String>
      meta_hash: <Asset Metadata Hash Buffer Object>
      name: <Asset Name String>
    }
    balance: <Balance Asset Units Numeric String>
    group_key: <Asset Group Key Buffer Object>
  }

  @throws
  <Error>

  @returns
  {
    asset_id: <Asset Id Hex String>
    balance: <Balance Asset Units Numeric String>
    [group_key]: <Asset Group Key Hex String>
    is_collectible: <Asset Is Collectible Bool>
    meta_hash: <Asset Metadata Hash Hex String>
    name: <Asset Name String>
  }
*/
export default (balance?: RpcAssetBalance | null): Balance => {
  if (!balance) {
    throw new Error('ExpectedRpcAssetBalanceDetails');
  }

  if (!isNumeric(balance.balance)) {
    throw new Error('ExpectedBalanceInRpcAssetBalance');
  }

  const genesis = balance.asset_genesis;

  if (!genesis || !isBuffer(genesis.asset_id) || !genesis.asset_id.length) {
    throw new Error('ExpectedAssetGenesisInRpcAssetBalance');
  }

  if (!isBuffer(genesis.meta_hash)) {
    throw new Error('ExpectedMetaHashInRpcAssetBalance');
  }

  return {
    asset_id: genesis.asset_id.toString('hex'),
    balance: balance.balance,
    group_key: hexOf(balance.group_key),
    is_collectible: genesis.asset_type === 'COLLECTIBLE',
    meta_hash: genesis.meta_hash.toString('hex'),
    name: genesis.name,
  };
};
