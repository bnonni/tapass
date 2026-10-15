import {EventEmitter} from 'node:events';

import {emitSubscriptionError} from '../../grpc/index.js';
import {handleRemoveListener} from '../../grpc/index.js';
import type {AuthenticatedTapd} from '../../tapd_grpc/index.js';
import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcRfqEventAsEvent} from '../../tapd_responses/index.js';

const cancelError = 'Cancelled on client';
const events = ['accepted_buy_quote', 'accepted_htlc', 'accepted_sell_quote'];
const method = 'subscribeRfqEventNtfns';
const type = 'rfq';

export type SubscribeToRfqEventsArgs = {
  /** Authenticated tapd API Object */
  tapd: AuthenticatedTapd;
};

/** Subscribe to RFQ events

  Requires `rfq:read` permission

  A rate is a number of asset units per BTC, as an exact decimal string

  {
    tapd: <Authenticated tapd API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'accepted_buy_quote'
  {
    [accepted_max_amount]: <Accepted Maximum Asset Units Numeric String>
    [asset_id]: <Asset Id Hex String>
    at: <Event At ISO 8601 Date String>
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

  @event 'accepted_htlc'
  {
    at: <Event At ISO 8601 Date String>
    channel: <Payment Standard Format Channel Id String>
  }

  @event 'accepted_sell_quote'
  {
    [accepted_max_mtokens]: <Accepted Maximum Payment Millitokens String>
    amount: <Asset Units Numeric String>
    [asset_id]: <Asset Id Hex String>
    at: <Event At ISO 8601 Date String>
    channel: <Channel To Pay Over Standard Format Channel Id String>
    expires_at: <Quote Expires At ISO 8601 Date String>
    [group_key]: <Asset Group BIP340 Public Key Hex String>
    id: <Quote Request Id Hex String>
    min_transportable_mtokens: <Minimum Millitokens To Send One Unit String>
    peer_public_key: <Peer Public Key Hex String>
    [price_oracle_metadata]: <Price Oracle Metadata String>
    rate: <Bid Rate Asset Units Per BTC Exact Decimal String>
  }

  @event 'end'

  @event 'error'
  [<Error Code Number>, <Error Message String>, <Error Details Object>]
*/
export default ({tapd}: SubscribeToRfqEventsArgs) => {
  if (!isTapd({method, tapd, type})) {
    throw new Error('ExpectedAuthenticatedTapdToSubscribeToRfqEvents');
  }

  const emitter = new EventEmitter();
  const subscription = tapd[type][method]({});

  // The error helper only reads `details` to find a client cancel
  const emitError = emitSubscriptionError({emitter, subscription}) as (
    err: unknown,
  ) => void;

  // Cancel the subscription when all event listeners are removed
  handleRemoveListener({emitter, events, subscription});

  subscription.on('data', (data: unknown) => {
    try {
      const {data: details, event} = rpcRfqEventAsEvent(data as any);

      return emitter.emit(event, details);
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
      return emitError([503, 'FailedToConnectToTapdToSubscribeToRfqEvents']);
    }

    if (isPermissionDenied({err})) {
      return emitError([403, 'PermissionDeniedToSubscribeToRfqEvents']);
    }

    return emitError([503, 'UnexpectedErrorInRfqEventsSubscription', {err}]);
  });

  subscription.on('status', (status: unknown) =>
    emitter.emit('status', status),
  );

  return emitter;
};
