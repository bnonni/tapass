import fixedPointAsDecimal from './fixed_point_as_decimal.js';
import type {RpcFixedPoint} from './fixed_point_as_decimal.js';
import type {RpcAssetSpec} from './rpc_buy_quote_as_quote.js';
import shortChannelIdAsChannel from './short_channel_id_as_channel.js';

const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const policyTypes: Record<string, AssetForward['type']> = {
  RFQ_POLICY_TYPE_PURCHASE: 'purchase',
  RFQ_POLICY_TYPE_SALE: 'sale',
};
const zero = '0';

export type RpcForwardingEvent = {
  amt_in_msat: string;
  amt_out_msat: string;
  asset_amt: string;
  asset_spec: RpcAssetSpec;
  chan_id_in: string;
  chan_id_out: string;
  failed_at: string;
  htlc_id: string;
  opened_at: string;
  peer: string;
  policy_type: string;
  rate: RpcFixedPoint | null;
  rfq_id: Buffer;
  settled_at: string;
};

export type AssetForward = {
  /** Swapped Asset Units Numeric String */
  amount: string;
  /** Asset Id Hex */
  asset_id?: string;
  /** Forward Failed At ISO 8601 Date */
  failed_at?: string;
  /** Asset Group BIP340 Public Key Hex */
  group_key?: string;
  /** Incoming HTLC Index Numeric String */
  htlc_index: string;
  /** Incoming Standard Format Channel Id */
  incoming_channel: string;
  /** Received Millitokens String */
  incoming_mtokens: string;
  /** Forward Started At ISO 8601 Date */
  opened_at: string;
  /** Outgoing Standard Format Channel Id */
  outgoing_channel: string;
  /** Sent Millitokens String */
  outgoing_mtokens: string;
  /** Peer Public Key Hex */
  peer_public_key?: string;
  /** Rate Asset Units Per BTC Exact Decimal String */
  rate?: string;
  /** RFQ Session Id Hex */
  rfq_id: string;
  /** Forward Settled At ISO 8601 Date */
  settled_at?: string;
  /** Edge Node Policy Type */
  type: 'purchase' | 'sale';
};

/** Asset forward from an RPC RFQ forwarding event

  {
    amt_in_msat: <Received Millisatoshis Numeric String>
    amt_out_msat: <Sent Millisatoshis Numeric String>
    asset_amt: <Swapped Asset Units Numeric String>
    [asset_spec]: {
      group_pub_key: <Asset Group BIP340 Public Key Buffer Object>
      id: <Asset Id Buffer Object>
    }
    chan_id_in: <Incoming Short Channel Id Numeric String>
    chan_id_out: <Outgoing Short Channel Id Numeric String>
    failed_at: <Failed At Unix Seconds Numeric String> // 0 is not failed
    htlc_id: <Incoming HTLC Index Numeric String>
    opened_at: <Started At Unix Seconds Numeric String>
    peer: <Peer Public Key Hex String>
    policy_type: <Policy Type String>
    [rate]: {
      coefficient: <Scaled Integer Numeric String>
      scale: <Decimal Places Number>
    }
    rfq_id: <RFQ Session Id Buffer Object>
    settled_at: <Settled At Unix Seconds Numeric String> // 0 is not settled
  }

  @throws
  <Error>

  @returns
  {
    amount: <Swapped Asset Units Numeric String>
    [asset_id]: <Asset Id Hex String>
    [failed_at]: <Forward Failed At ISO 8601 Date String>
    [group_key]: <Asset Group BIP340 Public Key Hex String>
    htlc_index: <Incoming HTLC Index Numeric String>
    incoming_channel: <Incoming Standard Format Channel Id String>
    incoming_mtokens: <Received Millitokens String>
    opened_at: <Forward Started At ISO 8601 Date String>
    outgoing_channel: <Outgoing Standard Format Channel Id String>
    outgoing_mtokens: <Sent Millitokens String>
    [peer_public_key]: <Peer Public Key Hex String>
    [rate]: <Rate Asset Units Per BTC Exact Decimal String>
    rfq_id: <RFQ Session Id Hex String>
    [settled_at]: <Forward Settled At ISO 8601 Date String>
    type: <Edge Node Policy Type String> // purchase, sale
  }
*/
export default (forward?: RpcForwardingEvent | null): AssetForward => {
  if (!forward) {
    throw new Error('ExpectedRpcForwardingEvent');
  }

  if (!isNumeric(forward.amt_in_msat) || !isNumeric(forward.amt_out_msat)) {
    throw new Error('ExpectedMsatAmountsInRpcForwardingEvent');
  }

  if (!isNumeric(forward.asset_amt)) {
    throw new Error('ExpectedAssetAmountInRpcForwardingEvent');
  }

  if (!isNumeric(forward.htlc_id)) {
    throw new Error('ExpectedHtlcIdInRpcForwardingEvent');
  }

  if (!isNumeric(forward.opened_at)) {
    throw new Error('ExpectedOpenedAtInRpcForwardingEvent');
  }

  if (!policyTypes[forward.policy_type]) {
    throw new Error('ExpectedKnownPolicyTypeInRpcForwardingEvent');
  }

  if (!isBuffer(forward.rfq_id) || !forward.rfq_id.length) {
    throw new Error('ExpectedRfqIdInRpcForwardingEvent');
  }

  const failedAt = forward.failed_at;
  const settledAt = forward.settled_at;

  return {
    amount: forward.asset_amt,
    asset_id: hexOf(forward.asset_spec?.id),
    failed_at: !!failedAt && failedAt !== zero ? dateFrom(failedAt) : undefined,
    group_key: hexOf(forward.asset_spec?.group_pub_key),
    htlc_index: forward.htlc_id,
    incoming_channel: shortChannelIdAsChannel(forward.chan_id_in),
    incoming_mtokens: forward.amt_in_msat,
    opened_at: dateFrom(forward.opened_at),
    outgoing_channel: shortChannelIdAsChannel(forward.chan_id_out),
    outgoing_mtokens: forward.amt_out_msat,
    peer_public_key: forward.peer || undefined,
    rate: !forward.rate ? undefined : fixedPointAsDecimal(forward.rate),
    rfq_id: forward.rfq_id.toString('hex'),
    settled_at:
      !!settledAt && settledAt !== zero ? dateFrom(settledAt) : undefined,
    type: policyTypes[forward.policy_type],
  };
};
