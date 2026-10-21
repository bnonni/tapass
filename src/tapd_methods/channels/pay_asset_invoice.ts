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

const isRfqId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const method = 'sendPayment';
const name = 'PayAssetInvoice';
const type = 'tapchannel';

export type PayAssetInvoiceArgs = AuthenticatedTapdArgs<
  AssetPaymentRequestArgs & {
    /** BOLT 11 Payment Request String */
    request: string;
    /** Accepted Sell Quote Id Hex String */
    rfq_id?: string;
  }
>;

export type PayAssetInvoiceResult = SendAssetPaymentResult;

type Tasks = {
  pay: PayAssetInvoiceResult;
  validate: undefined;
};

/** Pay a payment request with an asset, over an asset channel

  The channel peer sells satoshis for the asset, at a rate in an RFQ quote

  tapd must run inside litd, with lnd and tapd in integrated mode

  Requires `channels:write` permission

  An `asset_id` or a `group_key` is required, but not both

  Use an `rfq_id` of an accepted sell quote to pay with that quote

  Without `max_fee` or `max_fee_mtokens`, only routes with no fee are used,
  the same as lnd

  `max_fee` and `max_fee_mtokens` are not supported together

  The default `pathfinding_timeout` is 25 seconds. The default `max_paths` is 1.

  tapd rejects a payment that is too small to carry one asset unit, unless
  `is_overpay_allowed` is set

  A payment request that is already paid is a 409

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
    request: <BOLT 11 Payment Request String>
    [rfq_id]: <Accepted Sell Quote Id Hex String>
    tapd: <Authenticated tapd API Object>
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
      fee: <Fee Tokens Rounded Down Number>
      fee_mtokens: <Fee Millitokens String>
      forward: <Forward Tokens Number>
      forward_mtokens: <Forward Millitokens String>
      public_key: <Public Key Hex String>
      [timeout]: <Timeout Block Height Number>
    }]
    id: <Payment Hash Hex String>
    index: <Payment Index Number String>
    mtokens: <Total Millitokens Paid String>
    paths: [{
      fee: <Total Fee Tokens Paid Rounded Down Number>
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [{
        channel: <Standard Format Channel Id String>
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        [timeout]: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens Paid String>
      [payment]: <Payment Identifier Hex String>
      [timeout]: <Expiration Block Height Number>
      tokens: <Total Tokens Paid Rounded Down Number>
      [total_mtokens]: <Total Payment Millitokens String>
    }]
    quotes: [{
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
    }]
    [request]: <BOLT 11 Payment Request String>
    safe_fee: <Total Fee Tokens Paid Rounded Up Number>
    safe_tokens: <Total Tokens Paid, Rounded Up Number>
    secret: <Payment Preimage Hex String>
    timeout: <Expiration Block Height Number>
    tokens: <Total Tokens Paid Rounded Down Number>
  }
*/
const payAssetInvoice: TapdMethod<
  PayAssetInvoiceArgs,
  PayAssetInvoiceResult
> = (args: PayAssetInvoiceArgs, cbk?: TapdCallback<PayAssetInvoiceResult>) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const argsError = assetPaymentArgsError({args, name});

          if (!!argsError) {
            return cbk(argsError);
          }

          if (!args.request || typeof args.request !== 'string') {
            return cbk([400, 'ExpectedPaymentRequestToPayAssetInvoice']);
          }

          if (!!args.rfq_id && !isRfqId(args.rfq_id)) {
            return cbk([400, 'ExpectedRfqIdHexToPayAssetInvoice']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToPayAssetInvoice']);
          }

          return cbk();
        },

        // Pay the payment request
        pay: [
          'validate',
          ({}, cbk) => {
            const common = assetPaymentRequest(args);

            const request = {
              ...common,
              payment_request: {
                ...common.payment_request,
                payment_request: args.request,
              },
              rfq_id: Buffer.from(args.rfq_id || '', 'hex'),
            };

            return sendAssetPayment({name, request, tapd: args.tapd}, cbk);
          },
        ],
      },
      returnResult({reject, resolve, of: 'pay'}, cbk),
    );
  });
};

export default payAssetInvoice;
