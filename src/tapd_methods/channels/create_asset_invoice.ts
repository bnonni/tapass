import {createHash} from 'node:crypto';
import {randomBytes} from 'node:crypto';

import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';
import {parsePaymentRequest} from 'invoices';

import {decimalAsFixedPoint} from '../../tapd_requests/index.js';
import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {assetChannelRpcError} from '../../tapd_responses/index.js';
import {rpcBuyQuoteAsQuote} from '../../tapd_responses/index.js';
import type {BuyQuote} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const fillOrKill = 'EXECUTION_POLICY_FOK';
const {from} = Buffer;
const immediateOrCancel = 'EXECUTION_POLICY_IOC';
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isDate = (n: string) => Date.parse(n) > Date.now();
const isDecimal = (n: string) => /^\d+(\.\d+)?$/.test(n);
const isHash = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPositive = (n: string) => isNumeric(n) && BigInt(n) > BigInt(0);
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const {isSafeInteger} = Number;
const maxMetadataBytes = 32768;
const method = 'addInvoice';
const msPerSecond = 1e3;
const preimageByteLength = 32;
const sha256 = (n: Buffer) => createHash('sha256').update(n).digest();
const type = 'tapchannel';

export type CreateAssetInvoiceArgs = AuthenticatedTapdArgs<{
  /** Asset Units To Receive Numeric String */
  amount?: string;
  /** Asset Id Hex String */
  asset_id?: string;
  /** Final CLTV Delta Number */
  cltv_delta?: number;
  /** Invoice Description String */
  description?: string;
  /** Hashed Description of Payment Hex String */
  description_hash?: string;
  /** Expires At ISO 8601 Date String */
  expires_at?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Hold Invoice Payment Hash Hex String */
  id?: string;
  /** Reject a Quote That Does Not Fill the Amount Bool */
  is_fill_or_kill?: boolean;
  /** Include Private Channels Bool */
  is_including_private_channels?: boolean;
  /** Minimum Asset Units Numeric String */
  min_amount?: string;
  /** Minimum Rate Asset Units Per BTC Decimal String */
  min_rate?: string;
  /** Millitokens To Receive String */
  mtokens?: string;
  /** RFQ Peer Public Key Hex String */
  peer_public_key?: string;
  /** Price Oracle Metadata String */
  price_oracle_metadata?: string;
  /** Payment Preimage Hex String */
  secret?: string;
  /** Tokens To Receive Number */
  tokens?: number;
}>;

export type CreateAssetInvoiceResult = {
  /** Fallback Chain Address */
  chain_address?: string;
  /** Created At ISO 8601 Date */
  created_at: string;
  /** Invoice Description */
  description?: string;
  /** Payment Hash Hex */
  id: string;
  /** Millitokens To Receive */
  mtokens: string;
  /** Payment Identifier Hex */
  payment?: string;
  /** Accepted Buy Quote */
  quote?: BuyQuote;
  /** BOLT 11 Encoded Payment Request */
  request: string;
  /** Payment Preimage Hex */
  secret?: string;
  /** Tokens To Receive Rounded Down */
  tokens: number;
};

type Tasks = {
  create: CreateAssetInvoiceResult;
  validate: undefined;
};

/** Create an invoice that is paid with an asset, over an asset channel

  The channel peer buys the asset for satoshis, at a rate in an RFQ quote

  tapd must run inside litd, with lnd and tapd in integrated mode

  Requires `channels:write` permission

  An `asset_id` or a `group_key` is required, but not both

  Exactly one of `amount`, `tokens`, or `mtokens` is required. With `tokens`
  or `mtokens`, the payer pays that satoshi value in the asset.

  Use an `id` to make a hold invoice. Do not give a `secret` with an `id`.

  A random `secret` is used when there is no `secret` and no `id`

  When there is no `min_amount`, the quote must fill the `amount`. Use `"0"` to
  accept a partial fill.

  The asset amount must be at least the minimum transportable amount of the
  quote. A smaller amount is a 400.

  `min_amount`, `min_rate`, and `is_fill_or_kill` need tapd v0.8.0 or later.
  Older tapd versions ignore them.

  {
    [amount]: <Asset Units To Receive Numeric String>
    [asset_id]: <Asset Id Hex String>
    [cltv_delta]: <Final CLTV Delta Number>
    [description]: <Invoice Description String>
    [description_hash]: <Hashed Description of Payment Hex String>
    [expires_at]: <Expires At ISO 8601 Date String>
    [group_key]: <Asset Group Key Hex String>
    [id]: <Hold Invoice Payment Hash Hex String>
    [is_fill_or_kill]: <Reject a Quote That Does Not Fill the Amount Bool>
    [is_including_private_channels]: <Include Private Channels Bool>
    [min_amount]: <Minimum Asset Units Numeric String>
    [min_rate]: <Minimum Rate Asset Units Per BTC Decimal String>
    [mtokens]: <Millitokens To Receive String>
    [peer_public_key]: <RFQ Peer Public Key Hex String>
    [price_oracle_metadata]: <Price Oracle Metadata String>
    [secret]: <Payment Preimage Hex String>
    tapd: <Authenticated tapd API Object>
    [tokens]: <Tokens To Receive Number>
  }

  @returns via cbk or Promise
  {
    [chain_address]: <Fallback Chain Address String>
    created_at: <Created At ISO 8601 Date String>
    [description]: <Invoice Description String>
    id: <Payment Hash Hex String>
    mtokens: <Millitokens To Receive String>
    [payment]: <Payment Identifier Hex String>
    [quote]: {
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
    request: <BOLT 11 Encoded Payment Request String>
    [secret]: <Payment Preimage Hex String>
    tokens: <Tokens To Receive Rounded Down Number>
  }
*/
const createAssetInvoice: TapdMethod<
  CreateAssetInvoiceArgs,
  CreateAssetInvoiceResult
> = (
  args: CreateAssetInvoiceArgs,
  cbk?: TapdCallback<CreateAssetInvoiceResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const values = [args.amount, args.tokens, args.mtokens];

          if (values.filter(n => n !== undefined).length !== 1) {
            return cbk([400, 'ExpectedOneOfAmountTokensOrMtokensForInvoice']);
          }

          if (args.amount !== undefined && !isPositive(args.amount)) {
            return cbk([400, 'ExpectedAssetAmountToCreateAssetInvoice']);
          }

          if (!args.asset_id && !args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyToCreateAssetInvoice']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'UnexpectedAssetIdAndGroupKeyForAssetInvoice']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToCreateAssetInvoice']);
          }

          const cltv = args.cltv_delta;

          if (cltv !== undefined && (!isSafeInteger(cltv) || cltv < 1)) {
            return cbk([400, 'ExpectedCltvDeltaToCreateAssetInvoice']);
          }

          if (!!args.description_hash && !isHash(args.description_hash)) {
            return cbk([400, 'ExpectedDescriptionHashToCreateAssetInvoice']);
          }

          if (args.expires_at !== undefined && !isDate(args.expires_at)) {
            return cbk([400, 'ExpectedFutureExpiresAtToCreateAssetInvoice']);
          }

          if (!!args.group_key && !isPublicKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToCreateAssetInvoice']);
          }

          if (!!args.id && !isHash(args.id)) {
            return cbk([400, 'ExpectedPaymentHashToCreateAssetHoldInvoice']);
          }

          if (!!args.id && !!args.secret) {
            return cbk([400, 'UnexpectedSecretForAssetHoldInvoice']);
          }

          if (args.min_amount !== undefined && !isNumeric(args.min_amount)) {
            return cbk([400, 'ExpectedNumericMinAmountForAssetInvoice']);
          }

          if (args.min_rate !== undefined && !isDecimal(args.min_rate)) {
            return cbk([400, 'ExpectedDecimalMinRateForAssetInvoice']);
          }

          if (args.mtokens !== undefined && !isPositive(args.mtokens)) {
            return cbk([400, 'ExpectedMillitokensToCreateAssetInvoice']);
          }

          if (!!args.peer_public_key && !isPublicKey(args.peer_public_key)) {
            return cbk([400, 'ExpectedPeerPublicKeyHexForAssetInvoice']);
          }

          const metadata = args.price_oracle_metadata || '';

          if (Buffer.byteLength(metadata) > maxMetadataBytes) {
            return cbk([400, 'ExpectedShorterOracleMetadataForAssetInvoice']);
          }

          if (!!args.secret && !isHash(args.secret)) {
            return cbk([400, 'ExpectedPreimageHexToCreateAssetInvoice']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToCreateAssetInvoice']);
          }

          const tokens = args.tokens;

          if (tokens !== undefined && (!isSafeInteger(tokens) || tokens < 1)) {
            return cbk([400, 'ExpectedTokensToCreateAssetInvoice']);
          }

          return cbk();
        },

        // Create the invoice
        create: [
          'validate',
          ({}, cbk) => {
            const expiresAt = args.expires_at;

            const secret = !!args.id
              ? undefined
              : !!args.secret
                ? from(args.secret, 'hex')
                : randomBytes(preimageByteLength);

            const expiry = !expiresAt
              ? undefined
              : Math.round((Date.parse(expiresAt) - Date.now()) / msPerSecond);

            const request = {
              asset_amount: args.amount || '0',
              asset_id: from(args.asset_id || '', 'hex'),
              asset_min_amt: args.min_amount,
              asset_rate_limit: !!args.min_rate
                ? decimalAsFixedPoint(args.min_rate)
                : undefined,
              execution_policy: !!args.is_fill_or_kill
                ? fillOrKill
                : immediateOrCancel,
              group_key: from(args.group_key || '', 'hex'),
              hodl_invoice: !args.id
                ? undefined
                : {payment_hash: from(args.id, 'hex')},
              invoice_request: {
                cltv_expiry: args.cltv_delta || undefined,
                description_hash: from(args.description_hash || '', 'hex'),
                expiry,
                memo: args.description || '',
                private: !!args.is_including_private_channels,
                r_preimage: secret,
                value: args.tokens || undefined,
                value_msat: args.mtokens || undefined,
              },
              peer_pubkey: from(args.peer_public_key || '', 'hex'),
              price_oracle_metadata: args.price_oracle_metadata || '',
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToCreateAssetInvoice']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCreateAssetInvoice']);
              }

              const knownError = assetChannelRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorCreatingAssetInvoice', {err}]);
              }

              const invoice = res?.invoice_result;

              if (!invoice || !invoice.payment_request) {
                return cbk([503, 'ExpectedPaymentRequestForAssetInvoice']);
              }

              if (!isBuffer(invoice.r_hash) || !invoice.r_hash.length) {
                return cbk([503, 'ExpectedPaymentHashForAssetInvoice']);
              }

              const id = invoice.r_hash.toString('hex');

              if (!!secret && sha256(secret).toString('hex') !== id) {
                return cbk([503, 'ExpectedPaymentHashOfSecretForAssetInvoice']);
              }

              try {
                const details = parsePaymentRequest({
                  request: invoice.payment_request,
                });

                const quote = res.accepted_buy_quote;
                const payment = invoice.payment_addr;

                return cbk(null, {
                  id,
                  chain_address: details.chain_addresses?.[0],
                  created_at: details.created_at,
                  description: details.description,
                  mtokens: details.mtokens,
                  payment:
                    isBuffer(payment) && !!payment.length
                      ? payment.toString('hex')
                      : undefined,
                  quote: !quote ? undefined : rpcBuyQuoteAsQuote(quote),
                  request: invoice.payment_request,
                  secret: secret?.toString('hex'),
                  tokens: details.tokens,
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'create'}, cbk),
    );
  });
};

export default createAssetInvoice;
