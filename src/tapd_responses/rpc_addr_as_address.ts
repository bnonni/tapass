const addressVersions = [
  'ADDR_VERSION_V0',
  'ADDR_VERSION_V1',
  'ADDR_VERSION_V2',
];
const assetVersions = ['ASSET_VERSION_V0', 'ASSET_VERSION_V1'];
const hexOf = (n: Buffer) => (!n.length ? undefined : n.toString('hex'));
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);

export type RpcAddr = {
  address_version: string;
  amount: string;
  asset_id: Buffer;
  asset_type: string;
  asset_version: string;
  encoded: string;
  group_key: Buffer;
  internal_key: Buffer;
  proof_courier_addr: string;
  script_key: Buffer;
  taproot_output_key: Buffer;
  tapscript_sibling: Buffer;
};

export type Address = {
  /** Encoded Taproot Assets Address */
  address: string;
  /** Asset Units To Receive Numeric String */
  amount: string;
  /** Asset Id Hex */
  asset_id?: string;
  /** Asset Version */
  asset_version: number;
  /** Asset Group Key Hex */
  group_key?: string;
  /** Internal Key Hex */
  internal_key: string;
  /** Asset Is Collectible */
  is_collectible: boolean;
  /** Proof Courier Address */
  proof_courier: string;
  /** Script Key Hex */
  script_key: string;
  /** Tapscript Sibling Preimage Hex */
  tapscript_sibling?: string;
  /** Taproot Output Key Hex */
  taproot_output_key: string;
  /** Address Version */
  version: number;
};

/** Address from an RPC Taproot Assets address

  {
    address_version: <Address Version String>
    amount: <Asset Units Numeric String>
    asset_id: <Asset Id Buffer Object>
    asset_type: <Asset Type String>
    asset_version: <Asset Version String>
    encoded: <Encoded Address String>
    group_key: <Asset Group Key Buffer Object>
    internal_key: <Internal Key Buffer Object>
    proof_courier_addr: <Proof Courier Address String>
    script_key: <Script Key Buffer Object>
    taproot_output_key: <Taproot Output Key Buffer Object>
    tapscript_sibling: <Tapscript Sibling Preimage Buffer Object>
  }

  @throws
  <Error>

  @returns
  {
    address: <Encoded Taproot Assets Address String>
    amount: <Asset Units To Receive Numeric String>
    [asset_id]: <Asset Id Hex String>
    asset_version: <Asset Version Number>
    [group_key]: <Asset Group Key Hex String>
    internal_key: <Internal Key Hex String>
    is_collectible: <Asset Is Collectible Bool>
    proof_courier: <Proof Courier Address String>
    script_key: <Script Key Hex String>
    [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
    taproot_output_key: <Taproot Output Key Hex String>
    version: <Address Version Number>
  }
*/
export default (addr?: RpcAddr | null): Address => {
  if (!addr) {
    throw new Error('ExpectedRpcAddressDetails');
  }

  if (!addr.encoded) {
    throw new Error('ExpectedEncodedAddressInRpcAddress');
  }

  if (!isNumeric(addr.amount)) {
    throw new Error('ExpectedAmountInRpcAddress');
  }

  if (!isBuffer(addr.asset_id) || !isBuffer(addr.group_key)) {
    throw new Error('ExpectedAssetIdentityInRpcAddress');
  }

  if (!isBuffer(addr.internal_key) || !isBuffer(addr.script_key)) {
    throw new Error('ExpectedKeysInRpcAddress');
  }

  if (!isBuffer(addr.taproot_output_key)) {
    throw new Error('ExpectedOutputKeyInRpcAddress');
  }

  if (!isBuffer(addr.tapscript_sibling)) {
    throw new Error('ExpectedTapscriptSiblingInRpcAddress');
  }

  const version = addressVersions.indexOf(addr.address_version);

  if (version === -1) {
    throw new Error('ExpectedKnownVersionInRpcAddress');
  }

  return {
    version,
    address: addr.encoded,
    amount: addr.amount,
    asset_id: hexOf(addr.asset_id),
    asset_version: assetVersions.indexOf(addr.asset_version),
    group_key: hexOf(addr.group_key),
    internal_key: addr.internal_key.toString('hex'),
    is_collectible: addr.asset_type === 'COLLECTIBLE',
    proof_courier: addr.proof_courier_addr,
    script_key: addr.script_key.toString('hex'),
    tapscript_sibling: hexOf(addr.tapscript_sibling),
    taproot_output_key: addr.taproot_output_key.toString('hex'),
  };
};
