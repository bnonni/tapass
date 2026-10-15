import fixedPointAsDecimal from './fixed_point_as_decimal.js';
import type {RpcFixedPoint} from './fixed_point_as_decimal.js';
import type {RpcAssetSpec} from './rpc_buy_quote_as_quote.js';
import shortChannelIdAsChannel from './short_channel_id_as_channel.js';

const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPublicKey = (n: unknown) => /^0[23][0-9a-f]{64}$/i.test(String(n));
const zero = '0';

export type RpcSellQuote = {
  accepted_max_amount: string;
  asset_amount: string;
  asset_spec: RpcAssetSpec;
  bid_asset_rate: RpcFixedPoint | null;
  expiry: string;
  id: Buffer;
  min_transportable_msat: string;
  peer: string;
  price_oracle_metadata: string;
  scid: string;
};

export type SellQuote = {
  /** Accepted Maximum Payment Millitokens String */
  accepted_max_mtokens?: string;
  /** Asset Units Numeric String */
  amount: string;
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
  /** Minimum Millitokens To Send One Asset Unit String */
  min_transportable_mtokens: string;
  /** Peer Public Key Hex */
  peer_public_key: string;
  /** Price Oracle Metadata */
  price_oracle_metadata?: string;
  /** Bid Rate Asset Units Per BTC Exact Decimal String */
  rate: string;
};

/** Sell quote from an RPC peer accepted sell quote

  {
    accepted_max_amount: <Accepted Maximum Payment Millisatoshis String>
    asset_amount: <Asset Units Numeric String>
    [asset_spec]: {
      group_pub_key: <Asset Group BIP340 Public Key Buffer Object>
      id: <Asset Id Buffer Object>
    }
    bid_asset_rate: {
      coefficient: <Scaled Integer Numeric String>
      scale: <Decimal Places Number>
    }
    expiry: <Expires At Unix Seconds Numeric String>
    id: <Quote Request Id Buffer Object>
    min_transportable_msat: <Minimum Millisatoshis For One Unit String>
    peer: <Peer Public Key Hex String>
    price_oracle_metadata: <Price Oracle Metadata String>
    scid: <Short Channel Id Numeric String>
  }

  @throws
  <Error>

  @returns
  {
    [accepted_max_mtokens]: <Accepted Maximum Payment Millitokens String>
    amount: <Asset Units Numeric String>
    [asset_id]: <Asset Id Hex String>
    channel: <Channel To Pay Over Standard Format Channel Id String>
    expires_at: <Quote Expires At ISO 8601 Date String>
    [group_key]: <Asset Group BIP340 Public Key Hex String>
    id: <Quote Request Id Hex String>
    min_transportable_mtokens: <Minimum Millitokens To Send One Unit String>
    peer_public_key: <Peer Public Key Hex String>
    [price_oracle_metadata]: <Price Oracle Metadata String>
    rate: <Bid Rate Asset Units Per BTC Exact Decimal String>
  }
*/
export default (quote?: RpcSellQuote | null): SellQuote => {
  if (!quote) {
    throw new Error('ExpectedRpcPeerAcceptedSellQuote');
  }

  if (!isNumeric(quote.asset_amount)) {
    throw new Error('ExpectedAssetAmountInRpcSellQuote');
  }

  if (!isNumeric(quote.expiry)) {
    throw new Error('ExpectedExpiryInRpcSellQuote');
  }

  if (!isBuffer(quote.id) || !quote.id.length) {
    throw new Error('ExpectedQuoteIdInRpcSellQuote');
  }

  if (!isNumeric(quote.min_transportable_msat)) {
    throw new Error('ExpectedMinTransportableMsatInRpcSellQuote');
  }

  if (!isPublicKey(quote.peer)) {
    throw new Error('ExpectedPeerPublicKeyInRpcSellQuote');
  }

  if (!quote.bid_asset_rate) {
    throw new Error('ExpectedBidAssetRateInRpcSellQuote');
  }

  const accepted = quote.accepted_max_amount;

  return {
    accepted_max_mtokens:
      !!accepted && accepted !== zero ? accepted : undefined,
    amount: quote.asset_amount,
    asset_id: hexOf(quote.asset_spec?.id),
    channel: shortChannelIdAsChannel(quote.scid),
    expires_at: dateFrom(quote.expiry),
    group_key: hexOf(quote.asset_spec?.group_pub_key),
    id: quote.id.toString('hex'),
    min_transportable_mtokens: quote.min_transportable_msat,
    peer_public_key: quote.peer,
    price_oracle_metadata: quote.price_oracle_metadata || undefined,
    rate: fixedPointAsDecimal(quote.bid_asset_rate),
  };
};
