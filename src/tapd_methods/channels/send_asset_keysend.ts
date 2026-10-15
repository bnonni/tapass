import {createHash} from 'node:crypto';
import {randomBytes} from 'node:crypto';

import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isTapd} from '../../tapd_requests/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';
import assetPaymentArgsError from './asset_payment_args_error.js';
import assetPaymentRequest from './asset_payment_request.js';
import type {AssetPaymentRequestArgs} from './asset_payment_request.js';
import sendAssetPayment from './send_asset_payment.js';
import type {SendAssetPaymentResult} from './send_asset_payment.js';

const isHash = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPositive = (n: string) => isNumeric(n) && BigInt(n) > BigInt(0);
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const {isSafeInteger} = Number;
const keySendRecordType = '5482373484';
const method = 'sendPayment';
// tapd needs at least the HTLC dust limit, litcli also sends this amount
const minTokens = 354;
const name = 'SendAssetKeysend';
const preimageByteLength = 32;
const sha256 = (n: Buffer) => createHash('sha256').update(n).digest();
const type = 'tapchannel';

export type SendAssetKeysendArgs = AuthenticatedTapdArgs<
  Omit<AssetPaymentRequestArgs, 'is_overpay_allowed'> & {
    /** Asset Units To Send Numeric String */
    amount: string;
    /** Destination Peer Public Key Hex String */
    destination: string;
    /** Payment Preimage Hex String */
    secret?: string;
    /** Tokens That Carry the Asset Units Number */
    tokens?: number;
  }
>;

export type SendAssetKeysendResult = SendAssetPaymentResult;

type Tasks = {
  send: SendAssetKeysendResult;
  validate: undefined;
};

/** Send an asset to a channel peer with a keysend payment

  tapd only sends an asset keysend payment to a direct asset channel peer

  tapd must run inside litd, with lnd and tapd in integrated mode

  Requires `channels:write` permission

  An `asset_id` or a `group_key` is required, but not both

  The default `tokens` is 354, the smallest amount that tapd accepts

  A random `secret` is used when there is no `secret`

  Without `max_fee` or `max_fee_mtokens`, only routes with no fee are used,
  the same as lnd

  {
    amount: <Asset Units To Send Numeric String>
    [asset_id]: <Asset Id Hex String>
    destination: <Destination Peer Public Key Hex String>
    [group_key]: <Asset Group Key Hex String>
    [max_fee]: <Maximum Fee Tokens Number>
    [max_fee_mtokens]: <Maximum Fee Millitokens String>
    [max_paths]: <Maximum Payment Paths Number>
    [pathfinding_timeout]: <Time To Spend Finding a Route Milliseconds Number>
    [peer_public_key]: <RFQ Peer Public Key Hex String>
    [price_oracle_metadata]: <Price Oracle Metadata String>
    [secret]: <Payment Preimage Hex String>
    tapd: <Authenticated tapd API Object>
    [tokens]: <Tokens That Carry the Asset Units Number>
  }

  @returns via cbk or Promise
  {
    confirmed_at: <Payment Confirmed At ISO 8601 Date String>
    created_at: <Payment Created At ISO 8601 Date String>
    destination: <Payment Destination Public Key Hex String>
    fee: <Total Fee Tokens Paid Rounded Down Number>
    fee_mtokens: <Total Fee Millitokens Paid String>
    hops: [{
      channel: <Standard Format Channel Id String>
      channel_capacity: <Channel Capacity Tokens Number>
      fee: <Fee Tokens Rounded Down Number>
      fee_mtokens: <Fee Millitokens String>
      forward: <Forward Tokens Number>
      forward_mtokens: <Forward Millitokens String>
      public_key: <Public Key Hex String>
      timeout: <Timeout Block Height Number>
    }]
    id: <Payment Hash Hex String>
    [index]: <Payment Index Number String>
    mtokens: <Total Millitokens Paid String>
    paths: [{
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [<Hop Object>]
      mtokens: <Total Millitokens Paid String>
    }]
    quotes: [<Accepted Sell Quote Object>]
    safe_fee: <Total Fee Tokens Paid Rounded Up Number>
    safe_tokens: <Total Tokens Paid, Rounded Up Number>
    secret: <Payment Preimage Hex String>
    timeout: <Expiration Block Height Number>
    tokens: <Total Tokens Paid Rounded Down Number>
  }
*/
const sendAssetKeysend: TapdMethod<
  SendAssetKeysendArgs,
  SendAssetKeysendResult
> = (
  args: SendAssetKeysendArgs,
  cbk?: TapdCallback<SendAssetKeysendResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isPositive(args.amount)) {
            return cbk([400, 'ExpectedAssetAmountToSendAssetKeysend']);
          }

          const argsError = assetPaymentArgsError({args, name});

          if (!!argsError) {
            return cbk(argsError);
          }

          if (!args.destination || !isPublicKey(args.destination)) {
            return cbk([400, 'ExpectedDestinationToSendAssetKeysend']);
          }

          if (!!args.secret && !isHash(args.secret)) {
            return cbk([400, 'ExpectedPreimageHexToSendAssetKeysend']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToSendAssetKeysend']);
          }

          const tokens = args.tokens;

          if (tokens !== undefined && !isSafeInteger(tokens)) {
            return cbk([400, 'ExpectedIntegerTokensToSendAssetKeysend']);
          }

          if (tokens !== undefined && tokens < minTokens) {
            return cbk([400, 'ExpectedAtLeast354TokensToSendAssetKeysend']);
          }

          return cbk();
        },

        // Send the keysend payment
        send: [
          'validate',
          ({}, cbk) => {
            const common = assetPaymentRequest(args);

            const preimage = !!args.secret
              ? Buffer.from(args.secret, 'hex')
              : randomBytes(preimageByteLength);

            const request = {
              ...common,
              asset_amount: args.amount,
              payment_request: {
                ...common.payment_request,
                amt: args.tokens || minTokens,
                dest: Buffer.from(args.destination, 'hex'),
                dest_custom_records: {[keySendRecordType]: preimage},
                payment_hash: sha256(preimage),
              },
            };

            return sendAssetPayment({name, request, tapd: args.tapd}, cbk);
          },
        ],
      },
      returnResult({reject, resolve, of: 'send'}, cbk),
    );
  });
};

export default sendAssetKeysend;
