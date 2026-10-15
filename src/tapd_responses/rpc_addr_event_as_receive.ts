import outpointAsTransaction from './outpoint_as_transaction.js';
import receiveStatuses from './receive_statuses.js';
import rpcAddrAsAddress from './rpc_addr_as_address.js';
import type {Address} from './rpc_addr_as_address.js';
import type {RpcAddr} from './rpc_addr_as_address.js';

const dateFrom = (n: string) => new Date(Number(n) * 1e3).toISOString();
const hexOf = (n: Buffer) => (!n.length ? undefined : n.toString('hex'));
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);

export type RpcAddrEvent = {
  addr: RpcAddr | null;
  confirmation_height: number;
  creation_time_unix_seconds: string;
  has_proof: boolean;
  outpoint: string;
  status: string;
  taproot_sibling: Buffer;
  utxo_amt_sat: string;
};

export type Receive = {
  address: Address;
  /** Confirmation Block Height */
  confirmation_height?: number;
  /** Receive Detected At ISO 8601 Date */
  created_at: string;
  /** Proof File Is Available */
  is_proof_available: boolean;
  /** Receive Status */
  status: string;
  /** Tapscript Sibling Hash Hex */
  tapscript_sibling?: string;
  /** Satoshis In the Anchor Output */
  tokens: number;
  /** Anchor Transaction Id Hex */
  transaction_id: string;
  /** Anchor Transaction Output Index */
  transaction_vout: number;
};

/** Receive from an RPC address event

  {
    addr: <RPC Address Object>
    confirmation_height: <Confirmation Block Height Number>
    creation_time_unix_seconds: <Created At Unix Seconds Numeric String>
    has_proof: <Proof File Is Available Bool>
    outpoint: <Anchor Outpoint String>
    status: <Address Event Status String>
    taproot_sibling: <Tapscript Sibling Hash Buffer Object>
    utxo_amt_sat: <Satoshis In the Anchor Output Numeric String>
  }

  @throws
  <Error>

  @returns
  {
    address: <Address Object>
    [confirmation_height]: <Confirmation Block Height Number>
    created_at: <Receive Detected At ISO 8601 Date String>
    is_proof_available: <Proof File Is Available Bool>
    status: <Receive Status String>
    [tapscript_sibling]: <Tapscript Sibling Hash Hex String>
    tokens: <Satoshis In the Anchor Output Number>
    transaction_id: <Anchor Transaction Id Hex String>
    transaction_vout: <Anchor Transaction Output Index Number>
  }
*/
export default (event?: RpcAddrEvent | null): Receive => {
  if (!event) {
    throw new Error('ExpectedRpcAddressEventDetails');
  }

  if (!isNumeric(event.creation_time_unix_seconds)) {
    throw new Error('ExpectedCreationTimeInRpcAddressEvent');
  }

  if (!receiveStatuses[event.status]) {
    throw new Error('ExpectedKnownStatusInRpcAddressEvent');
  }

  if (!isBuffer(event.taproot_sibling)) {
    throw new Error('ExpectedTaprootSiblingInRpcAddressEvent');
  }

  if (!isNumeric(event.utxo_amt_sat)) {
    throw new Error('ExpectedUtxoAmountInRpcAddressEvent');
  }

  return {
    address: rpcAddrAsAddress(event.addr),
    confirmation_height: event.confirmation_height || undefined,
    created_at: dateFrom(event.creation_time_unix_seconds),
    is_proof_available: event.has_proof,
    status: receiveStatuses[event.status],
    tapscript_sibling: hexOf(event.taproot_sibling),
    tokens: Number(event.utxo_amt_sat),
    ...outpointAsTransaction(event.outpoint),
  };
};
