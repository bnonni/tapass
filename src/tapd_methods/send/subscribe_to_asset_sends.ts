import {EventEmitter} from 'node:events';

import {emitSubscriptionError} from '../../grpc/index.js';
import {handleRemoveListener} from '../../grpc/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcSendEventAsSendEvent} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';

const events = ['send'];
const {from} = Buffer;
const isDate = (n: string) => Date.parse(n) > 0;
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const method = 'subscribeSendEvents';
const microsPerMs = 1e3;
const type = 'default';

export type SubscribeToAssetSendsArgs = AuthenticatedTapdArgs<{
  /** Transfer Label String */
  label?: string;
  /** Recipient Script Key Hex String */
  script_key?: string;
  /** Replay Events From ISO 8601 Date String */
  start_at?: string;
}>;

/** Subscribe to the state changes of outbound asset sends

  Requires `assets:read` permission

  A `start_at` date in the past replays the events from that date. Without a
  `start_at`, the events start now.

  {
    [label]: <Transfer Label String>
    [script_key]: <Recipient Script Key Hex String>
    [start_at]: <Replay Events From ISO 8601 Date String>
    tapd: <Authenticated tapd API Object>
  }

  @throws
  <Error>

  @returns
  <EventEmitter Object>

  @event 'send'
  {
    addresses: [{
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
    }]
    [anchor]: {
      [change_output_index]: <Change Output Index Number>
      fee: <Chain Fee Tokens Number>
      fee_tokens_per_vbyte: <Target Fee Tokens Per Virtual Byte Number>
      locked_utxos: [{
        transaction_id: <Locked Transaction Id Hex String>
        transaction_vout: <Locked Transaction Output Index Number>
      }]
      psbt: <Anchor Transaction PSBT Hex String>
      [transaction]: <Signed Anchor Transaction Hex String>
    }
    at: <Event At ISO 8601 Date String>
    [error]: <Send State Error String>
    [label]: <Transfer Label String>
    [next_state]: <Next Send State String>
    parcel_type: <Parcel Type String> // address, pending, pre_anchored, ...
    passive_virtual_packets: [<Passive Virtual Packet Hex String>]
    state: <Executed Send State String> // for example anchor_sign, complete
    [transfer]: {
      [block_hash]: <Anchor Block Hash Hex String>
      [block_height]: <Anchor Block Height Number>
      created_at: <Transfer Created At ISO 8601 Date String>
      fee: <Anchor Transaction Chain Fee Tokens Number>
      height_hint: <Anchor Transaction Confirmation Height Hint Number>
      inputs: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        script_key: <Script Key Hex String>
        transaction_id: <Spent Anchor Transaction Id Hex String>
        transaction_vout: <Spent Anchor Transaction Output Index Number>
      }]
      [label]: <Transfer Label String>
      outputs: [{
        [address]: <Taproot Assets Address Of the Recipient String>
        amount: <Asset Units Numeric String>
        anchor: {
          internal_key: <Anchor Internal Key Hex String>
          merkle_root: <Anchor Taproot Merkle Root Hex String>
          output_script: <Output Script Hex String>
          passive_assets_count: <Count Of Passive Assets In the Anchor Number>
          taproot_asset_root: <Taproot Asset Root Commitment Hex String>
          [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
          tokens: <Anchor Output Tokens Number>
          transaction_id: <Anchor Transaction Id Hex String>
          transaction_vout: <Anchor Transaction Output Index Number>
        }
        [asset_id]: <Asset Id Hex String>
        asset_version: <Asset Version Number>
        [group_key]: <Asset Group Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_local: <Script Key Belongs To This Node Bool>
        is_split_root: <Output Is the Split Root Bool>
        [lock_time]: <Lock Time Number>
        [proof]: <Proof File Hex String>
        [proof_courier]: <Proof Courier Address String>
        [proof_delivery]: <Proof Delivery State String> // complete, pending
        [relative_lock_time]: <Relative Lock Time Number>
        script_key: <Script Key Hex String>
        [split_root_hash]: <Split Commitment Root Hash Hex String>
      }]
      [transaction]: <Raw Anchor Transaction Hex String>
      transaction_id: <Anchor Transaction Id Hex String>
    }
    virtual_packets: [<Virtual Packet Hex String>]
  }
*/
export default (args: SubscribeToAssetSendsArgs) => {
  if (!isTapd({method, type, tapd: args.tapd})) {
    throw new Error('ExpectedAuthenticatedTapdToSubscribeToAssetSends');
  }

  if (!!args.script_key && !isPublicKey(args.script_key)) {
    throw new Error('ExpectedScriptKeyHexToSubscribeToAssetSends');
  }

  if (args.start_at !== undefined && !isDate(args.start_at)) {
    throw new Error('ExpectedValidStartDateToSubscribeToAssetSends');
  }

  if (!!args.start_at && Date.parse(args.start_at) > Date.now()) {
    throw new Error('ExpectedPastStartDateToSubscribeToAssetSends');
  }

  const emitter = new EventEmitter();
  const start = !args.start_at ? 0 : Date.parse(args.start_at) * microsPerMs;

  const subscription = args.tapd[type][method]({
    filter_label: args.label || '',
    filter_script_key: from(args.script_key || '', 'hex'),
    start_timestamp: String(start),
  });

  const errored = emitSubscriptionError({emitter, subscription});

  // Terminate the subscription when all listeners are removed
  handleRemoveListener({emitter, events, subscription});

  subscription.on('end', () => emitter.emit('end'));
  subscription.on('error', (err: any) => errored(err));
  subscription.on('status', (n: unknown) => emitter.emit('status', n));

  // Emit a mapper error only when there is an error listener
  const emitMapError = (err: Error) => {
    if (!!emitter.listenerCount('error')) {
      emitter.emit('error', [503, err.message]);
    }
  };

  subscription.on('data', (event: any) => {
    try {
      emitter.emit('send', rpcSendEventAsSendEvent(event));
    } catch (err: any) {
      emitMapError(err);
    }
  });

  return emitter;
};
