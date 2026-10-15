const defaultMaxPaths = 1;
const defaultTimeoutSeconds = 25;
const {from} = Buffer;
const msPerSecond = 1e3;

export type AssetPaymentRequestArgs = {
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Allow a Payment Above the Request Amount Bool */
  is_overpay_allowed?: boolean;
  /** Maximum Fee Tokens Number */
  max_fee?: number;
  /** Maximum Fee Millitokens String */
  max_fee_mtokens?: string;
  /** Maximum Payment Paths Number */
  max_paths?: number;
  /** Time To Spend Finding a Route Milliseconds Number */
  pathfinding_timeout?: number;
  /** RFQ Peer Public Key Hex String */
  peer_public_key?: string;
  /** Price Oracle Metadata String */
  price_oracle_metadata?: string;
};

/** tapchannel SendPayment request fields that are the same for each payment

  The lnd payment fields work the same way as in lightning pay methods

  {
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    [is_overpay_allowed]: <Allow a Payment Above the Request Amount Bool>
    [max_fee]: <Maximum Fee Tokens Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens String>
    [max_paths]: <Maximum Payment Paths Number>
    [pathfinding_timeout]: <Time To Spend Finding a Route Milliseconds Number>
    [peer_public_key]: <RFQ Peer Public Key Hex String>
    [price_oracle_metadata]: <Price Oracle Metadata String>
  }

  @returns
  {
    allow_overpay: <Allow Overpay Bool>
    asset_id: <Asset Id Buffer Object>
    group_key: <Asset Group Key Buffer Object>
    payment_request: {
      [fee_limit_msat]: <Maximum Fee Millitokens String>
      [fee_limit_sat]: <Maximum Fee Tokens Number>
      max_parts: <Maximum Payment Paths Number>
      no_inflight_updates: <No In-Flight Updates Bool>
      timeout_seconds: <Payment Timeout Seconds Number>
    }
    peer_pubkey: <RFQ Peer Public Key Buffer Object>
    price_oracle_metadata: <Price Oracle Metadata String>
  }
*/
export default (args: AssetPaymentRequestArgs) => {
  const timeout = Math.round((args.pathfinding_timeout || 0) / msPerSecond);

  return {
    allow_overpay: !!args.is_overpay_allowed,
    asset_id: from(args.asset_id || '', 'hex'),
    group_key: from(args.group_key || '', 'hex'),
    payment_request: {
      fee_limit_msat: args.max_fee_mtokens || undefined,
      fee_limit_sat: args.max_fee || undefined,
      max_parts: args.max_paths || defaultMaxPaths,
      no_inflight_updates: false,
      timeout_seconds: timeout || defaultTimeoutSeconds,
    },
    peer_pubkey: from(args.peer_public_key || '', 'hex'),
    price_oracle_metadata: args.price_oracle_metadata || '',
  };
};
