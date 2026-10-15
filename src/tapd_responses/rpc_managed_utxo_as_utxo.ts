import outpointAsTransaction from './outpoint_as_transaction.js';
import rpcAssetAsAsset from './rpc_asset_as_asset.js';
import type {Asset} from './rpc_asset_as_asset.js';
import type {RpcAsset} from './rpc_asset_as_asset.js';

const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isInteger = (n: unknown) => typeof n === 'string' && /^-?\d+$/.test(n);

export type RpcManagedUtxo = {
  amt_sat: string;
  assets: RpcAsset[];
  internal_key: Buffer;
  lease_expiry_unix: string;
  lease_owner: Buffer;
  merkle_root: Buffer;
  out_point: string;
  taproot_asset_root: Buffer;
};

export type Utxo = {
  assets: Asset[];
  /** Internal Key Hex */
  internal_key: string;
  /** Lease Expires At ISO 8601 Date */
  lease_expires_at?: string;
  /** Lease Owner Id Hex */
  lease_owner?: string;
  /** Taproot Merkle Root Hex */
  merkle_root: string;
  /** Taproot Asset Root Commitment Hash Hex */
  taproot_asset_root: string;
  /** Output Value Tokens */
  tokens: number;
  /** Transaction Id Hex */
  transaction_id: string;
  /** Transaction Output Index */
  transaction_vout: number;
};

/** UTXO from an RPC managed UTXO

  {
    amt_sat: <Output Value Satoshis Numeric String>
    assets: [<RPC Asset Object>]
    internal_key: <Internal Key Buffer Object>
    lease_expiry_unix: <Lease Expires At Unix Seconds Numeric String>
    lease_owner: <Lease Owner Id Buffer Object>
    merkle_root: <Taproot Merkle Root Buffer Object>
    out_point: <Outpoint String>
    taproot_asset_root: <Taproot Asset Root Commitment Hash Buffer Object>
  }

  @throws
  <Error>

  @returns
  {
    assets: [<Asset Object>]
    internal_key: <Internal Key Hex String>
    [lease_expires_at]: <Lease Expires At ISO 8601 Date String>
    [lease_owner]: <Lease Owner Id Hex String>
    merkle_root: <Taproot Merkle Root Hex String>
    taproot_asset_root: <Taproot Asset Root Commitment Hash Hex String>
    tokens: <Output Value Tokens Number>
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
  }
*/
export default (utxo?: RpcManagedUtxo | null): Utxo => {
  if (!utxo) {
    throw new Error('ExpectedRpcManagedUtxoDetails');
  }

  if (!isInteger(utxo.amt_sat)) {
    throw new Error('ExpectedOutputValueInRpcManagedUtxo');
  }

  if (!isArray(utxo.assets)) {
    throw new Error('ExpectedArrayOfAssetsInRpcManagedUtxo');
  }

  if (!isBuffer(utxo.internal_key) || !isBuffer(utxo.merkle_root)) {
    throw new Error('ExpectedKeysInRpcManagedUtxo');
  }

  if (!isBuffer(utxo.taproot_asset_root)) {
    throw new Error('ExpectedTaprootAssetRootInRpcManagedUtxo');
  }

  // tapd sends the zero time as the expiry when there is no lease
  const hasLease = !!utxo.lease_owner?.length;

  return {
    assets: utxo.assets.map(rpcAssetAsAsset),
    internal_key: utxo.internal_key.toString('hex'),
    lease_expires_at: hasLease ? dateFrom(utxo.lease_expiry_unix) : undefined,
    lease_owner: hasLease ? utxo.lease_owner.toString('hex') : undefined,
    merkle_root: utxo.merkle_root.toString('hex'),
    taproot_asset_root: utxo.taproot_asset_root.toString('hex'),
    tokens: Number(utxo.amt_sat),
    ...outpointAsTransaction(utxo.out_point),
  };
};
