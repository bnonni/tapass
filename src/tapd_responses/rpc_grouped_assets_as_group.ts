const assetVersions = ['ASSET_VERSION_V0', 'ASSET_VERSION_V1'];
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isGroupKey = (n: string) => /^0[23][0-9a-f]{64}$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);

export type RpcGroupedAssets = {
  assets: {
    amount: string;
    id: Buffer;
    lock_time: number;
    meta_hash: Buffer;
    relative_lock_time: number;
    tag: string;
    type: string;
    version: string;
  }[];
};

export type Group = {
  assets: {
    /** Asset Units Numeric String */
    amount: string;
    /** Asset Id Hex */
    asset_id: string;
    /** Asset Is Collectible */
    is_collectible: boolean;
    /** Lock Time */
    lock_time?: number;
    /** Asset Metadata Hash Hex */
    meta_hash: string;
    /** Asset Name */
    name: string;
    /** Relative Lock Time */
    relative_lock_time?: number;
    /** Asset Version */
    version: number;
  }[];
  /** Tweaked Group Key Hex */
  key: string;
};

/** Group from an RPC group key and its grouped assets

  {
    key: <Tweaked Group Key Hex String>
    group: {
      assets: [{
        amount: <Asset Units Numeric String>
        id: <Asset Id Buffer Object>
        lock_time: <Lock Time Number>
        meta_hash: <Asset Metadata Hash Buffer Object>
        relative_lock_time: <Relative Lock Time Number>
        tag: <Asset Name String>
        type: <Asset Type String>
        version: <Asset Version String>
      }]
    }
  }

  @throws
  <Error>

  @returns
  {
    assets: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      is_collectible: <Asset Is Collectible Bool>
      [lock_time]: <Lock Time Number>
      meta_hash: <Asset Metadata Hash Hex String>
      name: <Asset Name String>
      [relative_lock_time]: <Relative Lock Time Number>
      version: <Asset Version Number>
    }]
    key: <Tweaked Group Key Hex String>
  }
*/
export default ({
  group,
  key,
}: {
  group?: RpcGroupedAssets | null;
  key: string;
}): Group => {
  if (!isGroupKey(key)) {
    throw new Error('ExpectedGroupKeyForRpcGroupedAssets');
  }

  if (!group || !isArray(group.assets)) {
    throw new Error('ExpectedArrayOfAssetsInRpcGroupedAssets');
  }

  return {
    key,
    assets: group.assets.map(asset => {
      if (!isNumeric(asset?.amount)) {
        throw new Error('ExpectedAmountInRpcGroupedAsset');
      }

      if (!isBuffer(asset.id) || !isBuffer(asset.meta_hash)) {
        throw new Error('ExpectedAssetIdAndMetaHashInRpcGroupedAsset');
      }

      return {
        amount: asset.amount,
        asset_id: asset.id.toString('hex'),
        is_collectible: asset.type === 'COLLECTIBLE',
        lock_time: asset.lock_time || undefined,
        meta_hash: asset.meta_hash.toString('hex'),
        name: asset.tag,
        relative_lock_time: asset.relative_lock_time || undefined,
        version: assetVersions.indexOf(asset.version),
      };
    }),
  };
};
