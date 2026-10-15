const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const {entries} = Object;
const types: Record<string, Metadata['type']> = {
  META_TYPE_JSON: 'json',
  META_TYPE_OPAQUE: 'opaque',
};

export type RpcAssetMeta = {
  canonical_universe_urls: string[];
  data: Buffer;
  decimal_display: number;
  delegation_key: Buffer;
  meta_hash: Buffer;
  type: string;
  universe_commitments: boolean;
  unknown_odd_types: Record<string, Buffer>;
};

export type Metadata = {
  /** Canonical Universe URLs */
  canonical_universes: string[];
  /** Metadata Hex */
  data: string;
  /** Decimal Places To Show */
  decimal_display?: number;
  /** Supply Commitment Delegation Public Key Hex */
  delegation_key?: string;
  /** Metadata Hash Hex */
  hash: string;
  /** Issuer Publishes Universe Supply Commitments */
  is_publishing_supply_commitments: boolean;
  /** Metadata Type */
  type: 'json' | 'opaque' | 'unknown';
  unknown_types: {
    /** TLV Type Numeric String */
    type: string;
    /** Value Hex */
    value: string;
  }[];
};

/** Metadata from an RPC asset metadata response

  {
    canonical_universe_urls: [<Canonical Universe URL String>]
    data: <Metadata Buffer Object>
    decimal_display: <Decimal Places To Show Number>
    delegation_key: <Supply Commitment Delegation Public Key Buffer Object>
    meta_hash: <Metadata Hash Buffer Object>
    type: <Metadata Type String>
    universe_commitments: <Issuer Publishes Universe Supply Commitments Bool>
    unknown_odd_types: {
      <TLV Type Numeric String>: <Value Buffer Object>
    }
  }

  @throws
  <Error>

  @returns
  {
    canonical_universes: [<Canonical Universe URL String>]
    data: <Metadata Hex String>
    [decimal_display]: <Decimal Places To Show Number>
    [delegation_key]: <Supply Commitment Delegation Public Key Hex String>
    hash: <Metadata Hash Hex String>
    is_publishing_supply_commitments: <Issuer Publishes Supply Commitments Bool>
    type: <Metadata Type String> // json, opaque, unknown
    unknown_types: [{
      type: <TLV Type Numeric String>
      value: <Value Hex String>
    }]
  }
*/
export default (meta?: RpcAssetMeta | null): Metadata => {
  if (!meta) {
    throw new Error('ExpectedRpcAssetMetaDetails');
  }

  if (!isBuffer(meta.data)) {
    throw new Error('ExpectedDataInRpcAssetMeta');
  }

  if (!isBuffer(meta.meta_hash) || !meta.meta_hash.length) {
    throw new Error('ExpectedMetaHashInRpcAssetMeta');
  }

  if (
    !!meta.canonical_universe_urls &&
    !isArray(meta.canonical_universe_urls)
  ) {
    throw new Error('ExpectedArrayOfUniverseUrlsInRpcAssetMeta');
  }

  return {
    canonical_universes: meta.canonical_universe_urls || [],
    data: meta.data.toString('hex'),
    decimal_display: meta.decimal_display || undefined,
    delegation_key: hexOf(meta.delegation_key),
    hash: meta.meta_hash.toString('hex'),
    is_publishing_supply_commitments: meta.universe_commitments,
    type: types[meta.type] || 'unknown',
    unknown_types: entries(meta.unknown_odd_types || {}).map(
      ([type, value]) => ({
        type,
        value: value.toString('hex'),
      }),
    ),
  };
};
