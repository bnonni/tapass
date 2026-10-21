import rpcAddrAsAddress from './rpc_addr_as_address.js';
import type {Address} from './rpc_addr_as_address.js';
import type {RpcAddr} from './rpc_addr_as_address.js';
import rpcTransferAsTransfer from './rpc_transfer_as_transfer.js';
import type {RpcTransfer} from './rpc_transfer_as_transfer.js';
import type {Transfer} from './rpc_transfer_as_transfer.js';

const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const {isArray} = Array;
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^-?\d+$/.test(n);
const microsPerMs = 1e3;
const noChange = -1;
const parcelTypes: Record<string, SendEvent['parcel_type']> = {
  PARCEL_TYPE_ADDRESS: 'address',
  PARCEL_TYPE_PENDING: 'pending',
  PARCEL_TYPE_PRE_ANCHORED: 'pre_anchored',
  PARCEL_TYPE_PRE_SIGNED: 'pre_signed',
};
const reversedHex = (n: Buffer) => Buffer.from(n).reverse().toString('hex');
const sendStatePrefix = 'SendState';
const weightUnitsPerVbyte = 4;
const weightUnitsPerKw = 1e3;

export type RpcSendEvent = {
  addresses: RpcAddr[];
  anchor_transaction: {
    anchor_psbt: Buffer;
    chain_fees_sats: string;
    change_output_index: number;
    final_tx: Buffer;
    lnd_locked_utxos: {output_index: number; txid: Buffer}[];
    target_fee_rate_sat_kw: number;
  } | null;
  error: string;
  next_send_state: string;
  parcel_type: string;
  passive_virtual_packets: Buffer[];
  send_state: string;
  timestamp: string;
  transfer: RpcTransfer | null;
  transfer_label: string;
  virtual_packets: Buffer[];
};

export type SendEvent = {
  /** Recipient Addresses */
  addresses: Address[];
  anchor?: {
    /** Change Output Index */
    change_output_index?: number;
    /** Chain Fee Tokens */
    fee: number;
    /** Target Fee Tokens Per Virtual Byte */
    fee_tokens_per_vbyte: number;
    locked_utxos: {
      /** Locked Transaction Id Hex */
      transaction_id: string;
      /** Locked Transaction Output Index */
      transaction_vout: number;
    }[];
    /** Anchor Transaction PSBT Hex */
    psbt: string;
    /** Signed Anchor Transaction Hex */
    transaction?: string;
  };
  /** Event At ISO 8601 Date */
  at: string;
  /** Send State Error */
  error?: string;
  /** Transfer Label */
  label?: string;
  /** Next Send State */
  next_state?: string;
  /** Parcel Type */
  parcel_type: 'address' | 'pending' | 'pre_anchored' | 'pre_signed';
  /** Passive Virtual Packets Hex */
  passive_virtual_packets: string[];
  /** Executed Send State */
  state: string;
  /** Transfer */
  transfer?: Transfer;
  /** Virtual Packets Hex */
  virtual_packets: string[];
};

/** Send state name from a tapd send state

  For example SendStateAnchorSign becomes anchor_sign

  <tapd Send State String>

  @returns
  <Send State Name String>
*/
const stateFrom = (state: string) => {
  // Exit early when the state does not have the known format
  if (!state.startsWith(sendStatePrefix)) {
    return state;
  }

  return state
    .slice(sendStatePrefix.length)
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase();
};

/** Send event from an RPC send event

  {
    addresses: [<RPC Address Object>]
    [anchor_transaction]: {
      anchor_psbt: <Anchor Transaction PSBT Buffer Object>
      chain_fees_sats: <Chain Fee Satoshis Numeric String>
      change_output_index: <Change Output Index Number> // -1 is no change
      final_tx: <Signed Anchor Transaction Buffer Object>
      lnd_locked_utxos: [{
        output_index: <Output Index Number>
        txid: <Transaction Id Internal Order Buffer Object>
      }]
      target_fee_rate_sat_kw: <Target Fee Rate Satoshis Per Kw Number>
    }
    error: <Send State Error String>
    next_send_state: <Next Send State String>
    parcel_type: <Parcel Type String>
    passive_virtual_packets: [<Passive Virtual Packet Buffer Object>]
    send_state: <Executed Send State String>
    timestamp: <Event At Unix Microseconds Numeric String>
    [transfer]: <RPC Transfer Object>
    transfer_label: <Transfer Label String>
    virtual_packets: [<Virtual Packet Buffer Object>]
  }

  @throws
  <Error>

  @returns
  {
    addresses: [<Address Object>]
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
    parcel_type: <Parcel Type String> // address, pending, pre_anchored,
                                      // pre_signed
    passive_virtual_packets: [<Passive Virtual Packet Hex String>]
    state: <Executed Send State String>
    [transfer]: <Transfer Object>
    virtual_packets: [<Virtual Packet Hex String>]
  }
*/
export default (event?: RpcSendEvent | null): SendEvent => {
  if (!event) {
    throw new Error('ExpectedRpcSendEventDetails');
  }

  if (!isArray(event.addresses)) {
    throw new Error('ExpectedArrayOfAddressesInRpcSendEvent');
  }

  if (!parcelTypes[event.parcel_type]) {
    throw new Error('ExpectedKnownParcelTypeInRpcSendEvent');
  }

  if (!event.send_state) {
    throw new Error('ExpectedSendStateInRpcSendEvent');
  }

  if (!isNumeric(event.timestamp)) {
    throw new Error('ExpectedTimestampInRpcSendEvent');
  }

  if (!isArray(event.virtual_packets)) {
    throw new Error('ExpectedArrayOfVirtualPacketsInRpcSendEvent');
  }

  if (!isArray(event.passive_virtual_packets)) {
    throw new Error('ExpectedArrayOfPassivePacketsInRpcSendEvent');
  }

  const anchor = event.anchor_transaction;

  if (!!anchor && !isBuffer(anchor.anchor_psbt)) {
    throw new Error('ExpectedAnchorPsbtInRpcSendEvent');
  }

  if (!!anchor && !isNumeric(anchor.chain_fees_sats)) {
    throw new Error('ExpectedChainFeesInRpcSendEvent');
  }

  if (!!anchor && !isArray(anchor.lnd_locked_utxos)) {
    throw new Error('ExpectedArrayOfLockedUtxosInRpcSendEvent');
  }

  const at = new Date(Math.floor(Number(event.timestamp) / microsPerMs));
  const feeRate = anchor?.target_fee_rate_sat_kw || 0;

  return {
    addresses: event.addresses.map(rpcAddrAsAddress),
    anchor: !anchor
      ? undefined
      : {
          change_output_index:
            anchor.change_output_index === noChange
              ? undefined
              : anchor.change_output_index,
          fee: Number(anchor.chain_fees_sats),
          fee_tokens_per_vbyte:
            (feeRate * weightUnitsPerVbyte) / weightUnitsPerKw,
          // tapd sends the locked transaction ids in internal byte order
          locked_utxos: anchor.lnd_locked_utxos.map(utxo => ({
            transaction_id: reversedHex(utxo.txid),
            transaction_vout: utxo.output_index,
          })),
          psbt: anchor.anchor_psbt.toString('hex'),
          transaction: hexOf(anchor.final_tx),
        },
    at: at.toISOString(),
    error: event.error || undefined,
    label: event.transfer_label || undefined,
    next_state: !event.next_send_state
      ? undefined
      : stateFrom(event.next_send_state),
    parcel_type: parcelTypes[event.parcel_type],
    passive_virtual_packets: event.passive_virtual_packets.map(n => {
      return n.toString('hex');
    }),
    state: stateFrom(event.send_state),
    transfer: !event.transfer
      ? undefined
      : rpcTransferAsTransfer(event.transfer),
    virtual_packets: event.virtual_packets.map(n => n.toString('hex')),
  };
};
