import EventEmitter from 'node:events';

import {emitSubscriptionError} from '../../grpc/index.js';
import {handleRemoveListener} from '../../grpc/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcReceiveEventAsReceiveUpdate} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';

const event = 'receive';
const isDate = (n: string) => Date.parse(n) > 0;
const method = 'subscribeReceiveEvents';
const microsPerMilli = 1e3;
const type = 'default';

export type SubscribeToAssetReceivesArgs = AuthenticatedTapdArgs<{
  /** Encoded Taproot Assets Address String */
  address?: string;
  /** Replay Events After ISO 8601 Date String */
  created_after?: string;
}>;

/** Subscribe to inbound asset transfers to Taproot Assets addresses

  Requires `assets:read` permission

  With `created_after`, tapd also sends the past events after that date

  {
    [address]: <Encoded Taproot Assets Address String>
    [created_after]: <Replay Events After ISO 8601 Date String>
    tapd: <Authenticated tapd API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'receive'
  {
    address: {
      address: <Encoded Taproot Assets Address String>
      amount: <Asset Units To Receive Numeric String>
      [asset_id]: <Asset Id Hex String>
      asset_version: <Asset Version Number>
      [group_key]: <Asset Group Key Hex String>
      internal_key: <Internal Key Hex String>
      is_collectible: <Asset Is Collectible Bool>
      proof_courier: <Proof Courier Address String>
      script_key: <Script Key Hex String>
      [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
      taproot_output_key: <Taproot Output Key Hex String>
      version: <Address Version Number>
    }
    [confirmation_height]: <Confirmation Block Height Number>
    [error]: <Receive Error String>
    status: <Receive Status String>
    [transaction_id]: <Anchor Transaction Id Hex String>
    [transaction_vout]: <Anchor Transaction Output Index Number>
    updated_at: <Updated At ISO 8601 Date String>
  }
  @event 'end'

  @event 'error'
  <gRPC Error Object> or [<Error Code Number>, <Error Message String>]

  @event 'status'
  <gRPC Status Object>
*/
export default (args: SubscribeToAssetReceivesArgs) => {
  if (args.address !== undefined && typeof args.address !== 'string') {
    throw new Error('ExpectedAssetAddressStringToSubscribeToAssetReceives');
  }

  if (args.created_after !== undefined && !isDate(args.created_after)) {
    throw new Error('ExpectedValidCreatedAfterDateToSubscribeToReceives');
  }

  if (!isTapd({method, type, tapd: args.tapd})) {
    throw new Error('ExpectedAuthenticatedTapdToSubscribeToAssetReceives');
  }

  const emitter = new EventEmitter();

  // tapd reads the start time in microseconds
  const start = !args.created_after
    ? 0
    : Date.parse(args.created_after) * microsPerMilli;

  const subscription = args.tapd[type][method]({
    filter_addr: args.address || '',
    start_timestamp: start,
  });

  const errored = emitSubscriptionError({emitter, subscription});

  // Terminate the subscription when all listeners are removed
  handleRemoveListener({emitter, subscription, events: [event]});

  subscription.on('end', () => emitter.emit('end'));
  subscription.on('error', (err: any) => errored(err));
  subscription.on('status', (n: unknown) => emitter.emit('status', n));

  subscription.on('data', (data: any) => {
    try {
      emitter.emit(event, rpcReceiveEventAsReceiveUpdate(data));
    } catch (err: any) {
      // Exit early when there are no error listeners
      if (!emitter.listenerCount('error')) {
        return;
      }

      emitter.emit('error', [503, err.message]);
    }

    return;
  });

  return emitter;
};
