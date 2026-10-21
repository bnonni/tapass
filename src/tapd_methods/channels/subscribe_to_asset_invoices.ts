import {EventEmitter} from 'node:events';

import {emitSubscriptionError} from '../../grpc/index.js';
import {handleRemoveListener} from '../../grpc/index.js';
import type {AuthenticatedTapd} from '../../tapd_grpc/index.js';
import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isMethodUnsupported} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcAssetInvoiceAsInvoice} from '../../tapd_responses/index.js';

const cancelError = 'Cancelled on client';
const events = ['error', 'invoice_updated'];
const isIndex = (n: unknown) => Number.isSafeInteger(n) && (n as number) > 0;
const method = 'subscribeInvoices';
const type = 'tapchannel';

export type SubscribeToAssetInvoicesArgs = {
  /** Invoice Add Index To Start After Number */
  added_after?: number;
  /** Invoice Confirmed Index To Start After Number */
  confirmed_after?: number;
  /** Authenticated tapd API Object */
  tapd: AuthenticatedTapd;
};

/** Subscribe to invoices that receive an asset

  tapd only sends updates of invoices that involve an asset

  Use `added_after` and `confirmed_after` to get past updates after an index

  Requires `channels:read` permission

  This method needs tapd v0.8.1 or later

  The invoice fields are the same as in lightning getInvoices. `assets` has the
  asset units of settled HTLCs only.

  {
    [added_after]: <Invoice Add Index To Start After Number>
    [confirmed_after]: <Invoice Confirmed Index To Start After Number>
    tapd: <Authenticated tapd API Object>
  }

  @throws
  <Error>

  @returns
  <Subscription EventEmitter Object>

  @event 'invoice_updated'
  {
    assets: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
    }]
    [chain_address]: <Fallback Chain Address String>
    cltv_delta: <Final CLTV Delta Number>
    [confirmed_at]: <Settled at ISO 8601 Date String>
    [confirmed_index]: <Confirmed Index Number>
    created_at: <ISO 8601 Date String>
    description: <Description String>
    [description_hash]: <Description Hash Hex String>
    expires_at: <ISO 8601 Date String>
    features: [{
      bit: <BOLT 09 Feature Bit Number>
      is_known: <Feature is Known Bool>
      is_required: <Feature Support is Required To Pay Bool>
      type: <Feature Type String>
    }]
    id: <Payment Hash Hex String>
    index: <Invoice Add Index Number>
    [is_canceled]: <Invoice is Canceled Bool>
    is_confirmed: <Invoice is Confirmed Bool>
    [is_held]: <HTLC is Held Bool>
    is_private: <Invoice is Private Bool>
    [is_push]: <Invoice is Push Payment Bool>
    mtokens: <Millitokens String>
    [payment]: <Payment Identifying Secret Hex String>
    payments: [{
      [canceled_at]: <Payment Canceled At ISO 8601 Date String>
      [confirmed_at]: <Payment Settled At ISO 8601 Date String>
      created_at: <Payment Held Since ISO 8601 Date String>
      created_height: <Payment Held Since Block Height Number>
      in_channel: <Incoming Payment Through Channel Id String>
      is_canceled: <Payment is Canceled Bool>
      is_confirmed: <Payment is Confirmed Bool>
      is_held: <Payment is Held Bool>
      messages: [{
        type: <Message Type Number String>
        value: <Raw Value Hex String>
      }]
      mtokens: <Incoming Payment Millitokens String>
      [pending_index]: <Pending Payment Channel HTLC Index Number>
      timeout: <HTLC CLTV Timeout Height Number>
      tokens: <Payment Tokens Number>
      [total_mtokens]: <Total Millitokens String>
    }]
    received: <Received Tokens Number>
    received_mtokens: <Received Millitokens String>
    [request]: <Bolt 11 Invoice String>
    secret: <Secret Preimage Hex String>
    tokens: <Tokens Number>
  }

  @event 'end'

  @event 'error'
  [<Error Code Number>, <Error Message String>, <Error Details Object>]
*/
export default (args: SubscribeToAssetInvoicesArgs) => {
  if (args.added_after !== undefined && !isIndex(args.added_after)) {
    throw new Error('ExpectedAddIndexToSubscribeToAssetInvoices');
  }

  if (args.confirmed_after !== undefined && !isIndex(args.confirmed_after)) {
    throw new Error('ExpectedConfirmedIndexToSubscribeToAssetInvoices');
  }

  if (!isTapd({method, tapd: args.tapd, type})) {
    throw new Error('ExpectedAuthenticatedTapdToSubscribeToAssetInvoices');
  }

  const emitter = new EventEmitter();

  const subscription = args.tapd[type][method]({
    request: {
      add_index: args.added_after || 0,
      settle_index: args.confirmed_after || 0,
    },
  });

  // The error helper only reads `details` to find a client cancel
  const emitError = emitSubscriptionError({emitter, subscription}) as (
    err: unknown,
  ) => void;

  // Cancel the subscription when all event listeners are removed
  handleRemoveListener({emitter, events, subscription});

  subscription.on('data', (data: unknown) => {
    try {
      return emitter.emit(
        'invoice_updated',
        rpcAssetInvoiceAsInvoice(data as any),
      );
    } catch (err: any) {
      return emitError([503, err.message]);
    }
  });

  subscription.on('end', () => emitter.emit('end'));

  subscription.on('error', (err: any) => {
    // Exit early when the client cancelled the subscription
    if (err?.details === cancelError) {
      return subscription.removeAllListeners();
    }

    if (isConnectionFailure({err})) {
      return emitError([503, 'FailedToConnectToTapdToSubscribeToInvoices']);
    }

    if (isPermissionDenied({err})) {
      return emitError([403, 'PermissionDeniedToSubscribeToAssetInvoices']);
    }

    if (isMethodUnsupported({err})) {
      return emitError([501, 'ExpectedNewerTapdToSubscribeToAssetInvoices']);
    }

    return emitError([
      503,
      'UnexpectedErrorInAssetInvoicesSubscription',
      {err},
    ]);
  });

  return emitter;
};
