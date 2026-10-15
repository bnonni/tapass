import EventEmitter from 'node:events';

import {emitSubscriptionError} from '../../grpc/index.js';
import {handleRemoveListener} from '../../grpc/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {batchStates} from '../../tapd_responses/index.js';
import {rpcBatchAsBatch} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';

const events = ['batch'];
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const method = 'subscribeMintEvents';
const microsecondsPerMillisecond = 1e3;
const type = 'mint';

export type SubscribeToMintEventsArgs = AuthenticatedTapdArgs;

/** Subscribe to the state changes of mint batches

  Requires `mint:read` permission

  {
    tapd: <Authenticated tapd API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  // A mint batch changed state, or it failed to change state
  @event 'batch'
  {
    at: <Event At ISO 8601 Date String>
    batch: {
      assets: [{
        amount: <Asset Units Numeric String>
        [group_anchor]: <Name of the Asset That Anchors a New Group String>
        [group_internal_key]: <Group Internal Public Key Hex String>
        [group_key]: <Group Key Hex String>
        [group_tapscript_root]: <Group Tapscript Root Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_new_group: <Asset Starts a New Group Bool>
        [metadata]: <Metadata Hex String>
        [metadata_hash]: <Metadata Hash Hex String>
        [metadata_type]: <Metadata Type String> // json, opaque
        name: <Asset Name String>
        [script_key]: <Script Key Hex String>
        version: <Asset Version Number>
      }]
      created_at: <Created At ISO 8601 Date String>
      created_height: <Block Height When Created Number>
      id: <Batch Key Hex String>
      [psbt]: <Genesis Transaction PSBT Hex String>
      state: <Batch State String>
      [transaction_id]: <Genesis Transaction Id Hex String>
      unsealed_assets: []
    }
    [error]: <State Change Error String>
    state: <Last Done Batch State String>
  }
*/
export default ({tapd}: SubscribeToMintEventsArgs): EventEmitter => {
  if (!isTapd({method, type, tapd})) {
    throw new Error('ExpectedAuthenticatedTapdToSubscribeToMintEvents');
  }

  const emitter = new EventEmitter();
  const subscription = tapd[type][method]({short_response: false});

  const errored = emitSubscriptionError({emitter, subscription});

  // Terminate the subscription when all listeners are removed
  handleRemoveListener({emitter, events, subscription});

  subscription.on('end', () => emitter.emit('end'));
  subscription.on('error', (err: any) => errored(err));
  subscription.on('status', (n: unknown) => emitter.emit('status', n));

  subscription.on('data', (event: any) => {
    try {
      if (!event || !isNumeric(event.timestamp)) {
        throw new Error('ExpectedTimestampInMintEvent');
      }

      const batch = rpcBatchAsBatch({batch: event.batch});

      const ms = Number(event.timestamp) / microsecondsPerMillisecond;

      // Notify listeners of the batch event
      return emitter.emit('batch', {
        batch,
        at: new Date(ms).toISOString(),
        error: event.error || undefined,
        state: batchStates[event.batch_state] || 'unknown',
      });
    } catch (err: any) {
      return errored([503, err.message] as any);
    }
  });

  return emitter;
};
