import {EventEmitter} from 'node:events';

import {emitSubscriptionError} from '../../grpc/index.js';
import {handleRemoveListener} from '../../grpc/index.js';
import type {AuthenticatedTapd} from '../../tapd_grpc/index.js';
import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isMethodUnsupported} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import emitAssetPayment from './emit_asset_payment.js';

const cancelError = 'Cancelled on client';
const events = ['confirmed', 'error', 'failed', 'paying'];
const isHash = (n: unknown) => /^[0-9A-F]{64}$/i.test(String(n));
const method = 'trackPayment';
const notInitiatedError = `payment isn't initiated`;
const type = 'tapchannel';

export type SubscribeToPastAssetPaymentArgs = {
  /** Payment Hash Hex String */
  id: string;
  /** Authenticated tapd API Object */
  tapd: AuthenticatedTapd;
};

/** Subscribe to the status of a past asset payment

  The events are the same as in lightning subscribeToPastPayment, and each
  event also has the asset amounts of the payment

  tapd only sends updates of a payment that involves an asset

  If lnd has no payment with the `id`, the `error` event is a 404

  Requires `channels:read` permission

  This method needs tapd v0.8.1 or later

  {
    id: <Payment Hash Hex String>
    tapd: <Authenticated tapd API Object>
  }

  @throws
  <Error>

  @returns
  <Subscription EventEmitter Object>

  @event 'confirmed'
  {
    assets: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
    }]
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
    [request]: <BOLT 11 Payment Request String>
    safe_fee: <Total Fee Tokens Paid Rounded Up Number>
    safe_tokens: <Total Tokens Paid, Rounded Up Number>
    secret: <Payment Preimage Hex String>
    timeout: <Expiration Block Height Number>
    tokens: <Total Tokens Paid Rounded Down Number>
  }

  @event 'failed'
  {
    assets: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
    }]
    id: <Payment Hash Hex String>
    is_canceled: <Payment Canceled Bool>
    is_insufficient_balance: <Failed Due To Lack of Balance Bool>
    is_invalid_payment: <Failed Due to Payment Rejected At Destination Bool>
    is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
    is_route_not_found: <Failed Due to Absence of Path Through Graph Bool>
  }

  @event 'paying'
  {
    assets: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
    }]
    created_at: <Payment Created At ISO 8601 Date String>
    destination: <Payment Destination Public Key Hex String>
    id: <Payment Hash Hex String>
    index: <Payment Index Number String>
    mtokens: <Total Millitokens Pending String>
    paths: [{
      fee: <Total Fee Tokens Pending Rounded Down Number>
      fee_mtokens: <Total Fee Millitokens Pending String>
      hops: [{
        channel: <Standard Format Channel Id String>
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        [timeout]: <Timeout Block Height Number>
      }]
      mtokens: <Total Millitokens Pending String>
      [payment]: <Payment Identifier Hex String>
      [timeout]: <Expiration Block Height Number>
      tokens: <Total Tokens Pending Rounded Down Number>
      [total_mtokens]: <Total Payment Millitokens String>
    }]
    [request]: <BOLT 11 Payment Request String>
    safe_tokens: <Total Tokens Pending Rounded Up Number>
    timeout: <Expiration Block Height Number>
    tokens: <Total Tokens Pending Rounded Down Number>
  }

  @event 'end'

  @event 'error'
  [<Error Code Number>, <Error Message String>, <Error Details Object>]
*/
export default ({id, tapd}: SubscribeToPastAssetPaymentArgs) => {
  if (!isHash(id)) {
    throw new Error('ExpectedPaymentHashToSubscribeToPastAssetPayment');
  }

  if (!isTapd({method, tapd, type})) {
    throw new Error('ExpectedAuthenticatedTapdToSubscribeToPastAssetPayment');
  }

  const emitter = new EventEmitter();

  const subscription = tapd[type][method]({
    request: {no_inflight_updates: false, payment_hash: Buffer.from(id, 'hex')},
  });

  // The error helper only reads `details` to find a client cancel
  const emitError = emitSubscriptionError({emitter, subscription}) as (
    err: unknown,
  ) => void;

  // Cancel the subscription when all event listeners are removed
  handleRemoveListener({emitter, events, subscription});

  subscription.on('data', (data: unknown) => {
    return emitAssetPayment({data, emitError, emitter});
  });

  subscription.on('end', () => emitter.emit('end'));

  subscription.on('error', (err: any) => {
    // Exit early when the client cancelled the subscription
    if (err?.details === cancelError) {
      return subscription.removeAllListeners();
    }

    if (isConnectionFailure({err})) {
      return emitError([503, 'FailedToConnectToTapdToTrackAssetPayment']);
    }

    if (isPermissionDenied({err})) {
      return emitError([403, 'PermissionDeniedToTrackAssetPayment']);
    }

    if (isMethodUnsupported({err})) {
      return emitError([501, 'ExpectedNewerTapdToTrackAssetPayment']);
    }

    if (String(err?.details).includes(notInitiatedError)) {
      return emitError([404, 'SentAssetPaymentNotFound']);
    }

    return emitError([503, 'UnexpectedErrorTrackingAssetPayment', {err}]);
  });

  return emitter;
};
