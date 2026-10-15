import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {decimalAsFixedPoint} from '../../tapd_requests/index.js';
import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcSellQuoteAsQuote} from '../../tapd_responses/index.js';
import type {SellQuote} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const defaultTimeoutSeconds = 60;
const fillOrKill = 'EXECUTION_POLICY_FOK';
const {from} = Buffer;
const groupKeyError = 'error parsing group key';
const immediateOrCancel = 'EXECUTION_POLICY_IOC';
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isDecimal = (n: string) => /^\d+(\.\d+)?$/.test(n);
const isFuture = (n: string) => Date.parse(n) > Date.now();
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPositive = (n: string) => isNumeric(n) && BigInt(n) > BigInt(0);
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const {isSafeInteger} = Number;
const maxMetadataBytes = 32768;
const method = 'addAssetSellOrder';
const noChannelError = 'error checking peer channel';
const rejectedError = 'rejected quote';
const timeoutError = 'timeout waiting for response';
const type = 'rfq';
const unixSeconds = (n: string) => Math.floor(Date.parse(n) / 1e3);

export type AddAssetSellOrderArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id?: string;
  /** Order Expires At ISO 8601 Date String */
  expires_at: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Skip the Asset Channel Check, For Tests Only */
  is_asset_channel_check_skipped?: boolean;
  /** Reject a Quote That Does Not Fill the Maximum */
  is_fill_or_kill?: boolean;
  /** Maximum Payment Millitokens String */
  max_mtokens: string;
  /** Maximum Rate Asset Units Per BTC Decimal String */
  max_rate?: string;
  /** Minimum Payment Millitokens String */
  min_mtokens?: string;
  /** Peer Public Key Hex String */
  peer_public_key: string;
  /** Price Oracle Metadata String */
  price_oracle_metadata?: string;
  /** Wait For the Peer Quote Seconds Number */
  timeout_seconds?: number;
}>;

export type AddAssetSellOrderResult = SellQuote;

type Tasks = {
  addOrder: AddAssetSellOrderResult;
  validate: undefined;
};

/** Ask a peer for a quote to sell an asset over an asset channel

  Use a sell order before you pay an invoice with an asset

  Requires `rfq:write` permission

  An `asset_id` or a `group_key` is required, but not both

  A rate is a number of asset units per BTC, as an exact decimal string

  When there is no `min_mtokens`, the quote must fill the `max_mtokens`. Use
  `"0"` to accept a partial fill.

  The default `timeout_seconds` is 60

  `max_rate`, `min_mtokens`, and `is_fill_or_kill` need tapd v0.8.0 or later.
  Older tapd versions ignore them.

  {
    [asset_id]: <Asset Id Hex String>
    expires_at: <Order Expires At ISO 8601 Date String>
    [group_key]: <Asset Group Key Hex String>
    [is_asset_channel_check_skipped]: <Skip Asset Channel Check Bool>
    [is_fill_or_kill]: <Reject a Quote That Does Not Fill the Maximum Bool>
    max_mtokens: <Maximum Payment Millitokens String>
    [max_rate]: <Maximum Rate Asset Units Per BTC Decimal String>
    [min_mtokens]: <Minimum Payment Millitokens String>
    peer_public_key: <Peer Public Key Hex String>
    [price_oracle_metadata]: <Price Oracle Metadata String>
    tapd: <Authenticated tapd API Object>
    [timeout_seconds]: <Wait For the Peer Quote Seconds Number>
  }

  @returns via cbk or Promise
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
const addAssetSellOrder: TapdMethod<
  AddAssetSellOrderArgs,
  AddAssetSellOrderResult
> = (
  args: AddAssetSellOrderArgs,
  cbk?: TapdCallback<AddAssetSellOrderResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.asset_id && !args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyToAddAssetSellOrder']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'UnexpectedAssetIdAndGroupKeyForAssetSellOrder']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToAddAssetSellOrder']);
          }

          if (!!args.group_key && !isPublicKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToAddAssetSellOrder']);
          }

          if (!args.expires_at || !isFuture(args.expires_at)) {
            return cbk([400, 'ExpectedFutureExpiresAtToAddAssetSellOrder']);
          }

          if (args.max_rate !== undefined && !isDecimal(args.max_rate)) {
            return cbk([400, 'ExpectedDecimalMaxRateToAddAssetSellOrder']);
          }

          if (!isPositive(args.max_mtokens)) {
            return cbk([400, 'ExpectedMaxMtokensToAddAssetSellOrder']);
          }

          const min = args.min_mtokens;

          if (min !== undefined && !isNumeric(min)) {
            return cbk([400, 'ExpectedNumericMinMtokensForAssetSellOrder']);
          }

          if (min !== undefined && BigInt(min) > BigInt(args.max_mtokens)) {
            return cbk([400, 'ExpectedMinMtokensNotAboveMaxForSellOrder']);
          }

          if (!args.peer_public_key || !isPublicKey(args.peer_public_key)) {
            return cbk([400, 'ExpectedPeerPublicKeyToAddAssetSellOrder']);
          }

          const metadata = args.price_oracle_metadata || '';

          if (Buffer.byteLength(metadata) > maxMetadataBytes) {
            return cbk([400, 'ExpectedShorterOracleMetadataForSellOrder']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToAddAssetSellOrder']);
          }

          const timeout = args.timeout_seconds;

          if (
            timeout !== undefined &&
            (!isSafeInteger(timeout) || timeout < 1)
          ) {
            return cbk([400, 'ExpectedPositiveTimeoutSecondsForSellOrder']);
          }

          return cbk();
        },

        // Add the sell order and wait for the peer quote
        addOrder: [
          'validate',
          ({}, cbk) => {
            const request = {
              asset_rate_limit: !!args.max_rate
                ? decimalAsFixedPoint(args.max_rate)
                : undefined,
              asset_specifier: !!args.asset_id
                ? {asset_id: from(args.asset_id, 'hex')}
                : {group_key: from(args.group_key || '', 'hex')},
              execution_policy: !!args.is_fill_or_kill
                ? fillOrKill
                : immediateOrCancel,
              expiry: String(unixSeconds(args.expires_at)),
              payment_max_amt: args.max_mtokens,
              payment_min_amt: args.min_mtokens,
              peer_pub_key: from(args.peer_public_key, 'hex'),
              price_oracle_metadata: args.price_oracle_metadata || '',
              skip_asset_channel_check: !!args.is_asset_channel_check_skipped,
              timeout_seconds: args.timeout_seconds || defaultTimeoutSeconds,
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToAddAssetSellOrder']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToAddAssetSellOrder']);
              }

              if (!!err && String(err.details).includes(groupKeyError)) {
                return cbk([400, 'ExpectedValidGroupKeyToAddAssetSellOrder']);
              }

              const details = String(err?.details);

              if (!!err && details.includes(noChannelError)) {
                return cbk([503, 'NoAssetChannelWithPeerForAssetSellOrder']);
              }

              if (!!err && details.includes(rejectedError)) {
                return cbk([503, 'PeerRejectedAssetSellOrderQuote', {err}]);
              }

              if (!!err && details.includes(timeoutError)) {
                return cbk([503, 'TimedOutWaitingForAssetSellOrderQuote']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorAddingAssetSellOrder', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToAddAssetSellOrder']);
              }

              if (!!res.invalid_quote) {
                return cbk([
                  503,
                  'PeerSentInvalidQuoteForAssetSellOrder',
                  {err: res.invalid_quote},
                ]);
              }

              if (!!res.rejected_quote) {
                return cbk([
                  503,
                  'PeerRejectedAssetSellOrderQuote',
                  {err: res.rejected_quote},
                ]);
              }

              try {
                return cbk(null, rpcSellQuoteAsQuote(res.accepted_quote));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'addOrder'}, cbk),
    );
  });
};

export default addAssetSellOrder;
