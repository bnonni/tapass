import fixedPointAsDecimal from './fixed_point_as_decimal.js';
import type {RpcFixedPoint} from './fixed_point_as_decimal.js';
import shortChannelIdAsChannel from './short_channel_id_as_channel.js';

const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPublicKey = (n: unknown) => /^0[23][0-9a-f]{64}$/i.test(String(n));
const zero = '0';

export type RpcAssetSpec = {
  group_pub_key: Buffer;
  id: Buffer;
} | null;

export type RpcBuyQuote = {
  accepted_max_amount: string;
  ask_asset_rate: RpcFixedPoint | null;
  asset_max_amount: string;
  asset_spec: RpcAssetSpec;
  expiry: string;
  id: Buffer;
  min_transportable_units: string;
  peer: string;
  price_oracle_metadata: string;
  scid: string;
};

export type BuyQuote = {
  /** Accepted Maximum Asset Units Numeric String */
  accepted_max_amount?: string;
  /** Asset Id Hex */
  asset_id?: string;
  /** Channel To Pay Over Standard Format Channel Id */
  channel: string;
  /** Quote Expires At ISO 8601 Date */
  expires_at: string;
  /** Asset Group BIP340 Public Key Hex */
  group_key?: string;
  /** Quote Request Id Hex */
  id: string;
  /** Maximum Asset Units Numeric String */
  max_amount: string;
  /** Minimum Asset Units In One HTLC Numeric String */
  min_transportable_amount: string;
  /** Peer Public Key Hex */
  peer_public_key: string;
  /** Price Oracle Metadata */
  price_oracle_metadata?: string;
  /** Ask Rate Asset Units Per BTC Exact Decimal String */
  rate: string;
};

/** Buy quote from an RPC peer accepted buy quote

  {
    accepted_max_amount: <Accepted Maximum Asset Units Numeric String>
    ask_asset_rate: {
      coefficient: <Scaled Integer Numeric String>
      scale: <Decimal Places Number>
    }
    asset_max_amount: <Maximum Asset Units Numeric String>
    [asset_spec]: {
      group_pub_key: <Asset Group BIP340 Public Key Buffer Object>
      id: <Asset Id Buffer Object>
    }
    expiry: <Expires At Unix Seconds Numeric String>
    id: <Quote Request Id Buffer Object>
    min_transportable_units: <Minimum Asset Units In One HTLC Numeric String>
    peer: <Peer Public Key Hex String>
    price_oracle_metadata: <Price Oracle Metadata String>
    scid: <Short Channel Id Numeric String>
  }

  @throws
  <Error>

  @returns
  {
    [accepted_max_amount]: <Accepted Maximum Asset Units Numeric String>
    [asset_id]: <Asset Id Hex String>
    channel: <Channel To Pay Over Standard Format Channel Id String>
    expires_at: <Quote Expires At ISO 8601 Date String>
    [group_key]: <Asset Group BIP340 Public Key Hex String>
    id: <Quote Request Id Hex String>
    max_amount: <Maximum Asset Units Numeric String>
    min_transportable_amount: <Minimum Asset Units In One HTLC Numeric String>
    peer_public_key: <Peer Public Key Hex String>
    [price_oracle_metadata]: <Price Oracle Metadata String>
    rate: <Ask Rate Asset Units Per BTC Exact Decimal String>
  }
*/
export default (quote?: RpcBuyQuote | null): BuyQuote => {
  if (!quote) {
    throw new Error('ExpectedRpcPeerAcceptedBuyQuote');
  }

  if (!isNumeric(quote.asset_max_amount)) {
    throw new Error('ExpectedMaxAmountInRpcBuyQuote');
  }

  if (!isNumeric(quote.expiry)) {
    throw new Error('ExpectedExpiryInRpcBuyQuote');
  }

  if (!isBuffer(quote.id) || !quote.id.length) {
    throw new Error('ExpectedQuoteIdInRpcBuyQuote');
  }

  if (!isNumeric(quote.min_transportable_units)) {
    throw new Error('ExpectedMinTransportableUnitsInRpcBuyQuote');
  }

  if (!isPublicKey(quote.peer)) {
    throw new Error('ExpectedPeerPublicKeyInRpcBuyQuote');
  }

  if (!quote.ask_asset_rate) {
    throw new Error('ExpectedAskAssetRateInRpcBuyQuote');
  }

  const accepted = quote.accepted_max_amount;

  return {
    accepted_max_amount: !!accepted && accepted !== zero ? accepted : undefined,
    asset_id: hexOf(quote.asset_spec?.id),
    channel: shortChannelIdAsChannel(quote.scid),
    expires_at: dateFrom(quote.expiry),
    group_key: hexOf(quote.asset_spec?.group_pub_key),
    id: quote.id.toString('hex'),
    max_amount: quote.asset_max_amount,
    min_transportable_amount: quote.min_transportable_units,
    peer_public_key: quote.peer,
    price_oracle_metadata: quote.price_oracle_metadata || undefined,
    rate: fixedPointAsDecimal(quote.ask_asset_rate),
  };
};
