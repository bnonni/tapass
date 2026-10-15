import outpointAsTransaction from './outpoint_as_transaction.js';
import receiveStatuses from './receive_statuses.js';
import rpcAddrAsAddress from './rpc_addr_as_address.js';
import type {Address} from './rpc_addr_as_address.js';
import type {RpcAddr} from './rpc_addr_as_address.js';

const isInteger = (n: unknown) => typeof n === 'string' && /^-?\d+$/.test(n);
const microsPerMilli = 1e3;

export type RpcReceiveEvent = {
  address: RpcAddr | null;
  confirmation_height: number;
  error: string;
  outpoint: string;
  status: string;
  timestamp: string;
};

export type ReceiveUpdate = {
  address: Address;
  /** Confirmation Block Height */
  confirmation_height?: number;
  /** Receive Error */
  error?: string;
  /** Receive Status */
  status: string;
  /** Anchor Transaction Id Hex */
  transaction_id?: string;
  /** Anchor Transaction Output Index */
  transaction_vout?: number;
  /** Updated At ISO 8601 Date */
  updated_at: string;
};

/** Receive update from an RPC receive event

  {
    address: <RPC Address Object>
    confirmation_height: <Confirmation Block Height Number>
    error: <Receive Error String>
    outpoint: <Anchor Outpoint String>
    status: <Address Event Status String>
    timestamp: <Event Unix Microseconds Numeric String>
  }

  @throws
  <Error>

  @returns
  {
    address: <Address Object>
    [confirmation_height]: <Confirmation Block Height Number>
    [error]: <Receive Error String>
    status: <Receive Status String>
    [transaction_id]: <Anchor Transaction Id Hex String>
    [transaction_vout]: <Anchor Transaction Output Index Number>
    updated_at: <Updated At ISO 8601 Date String>
  }
*/
export default (event?: RpcReceiveEvent | null): ReceiveUpdate => {
  if (!event) {
    throw new Error('ExpectedRpcReceiveEventDetails');
  }

  if (!receiveStatuses[event.status]) {
    throw new Error('ExpectedKnownStatusInRpcReceiveEvent');
  }

  if (!isInteger(event.timestamp)) {
    throw new Error('ExpectedTimestampInRpcReceiveEvent');
  }

  // tapd sends the time of the event in microseconds
  const millis = Number(event.timestamp) / microsPerMilli;

  return {
    address: rpcAddrAsAddress(event.address),
    confirmation_height: event.confirmation_height || undefined,
    error: event.error || undefined,
    status: receiveStatuses[event.status],
    updated_at: new Date(millis).toISOString(),
    ...(!event.outpoint ? {} : outpointAsTransaction(event.outpoint)),
  };
};
