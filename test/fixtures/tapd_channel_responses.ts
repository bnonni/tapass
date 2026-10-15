import {EventEmitter} from 'node:events';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import grpcOptions from '../../src/tapd_grpc/grpc_options.js';

const file = new URL('./tapd_channel_responses.json', import.meta.url);
const protos = fileURLToPath(new URL('../../protos/', import.meta.url));

// Bytes are stored as {$hex}, the decoder gives them back as Buffer objects
const reviver = (_: string, value: any) => {
  return typeof value?.$hex === 'string'
    ? Buffer.from(value.$hex, 'hex')
    : value;
};

/** Real responses from the Polar regtest nodes, with the v0.8.5 protos

  decodeAssetPayReq: tapd v0.7.0 DecodeAssetPayReq of an invoice of alice
  knownPreimageRequest: lnd v0.20.0 payment request of alice, with a known
    preimage of 32 0x11 bytes
  lndInvoice: lnd v0.20.0 open invoice of alice, from lnd ListInvoices
*/
export const responses: Record<string, any> = JSON.parse(
  readFileSync(file, 'utf8'),
  reviver,
);

const definition = loadSync(
  join(protos, 'taprpc/tapchannelrpc/tapchannel.proto'),
  {
    ...grpcOptions,
    includeDirs: [join(protos, 'taprpc'), join(protos, 'lnrpc'), protos],
  },
);

const {service} = (grpc.loadPackageDefinition(definition) as any).tapchannelrpc
  .TaprootAssetChannels;

/** Request the way tapd reads it, after a trip through the tapchannel protos

  <tapchannel RPC Name String>
  <Request Object>
*/
export const overTheWireRequest = (rpc: string, request: object) => {
  const {requestDeserialize, requestSerialize} = service[rpc];

  return requestDeserialize(requestSerialize(request));
};

/** Response the way the client reads it, after a trip through the protos

  <tapchannel RPC Name String>
  <Response Object>
*/
export const overTheWireResponse = (rpc: string, response: object) => {
  const {responseDeserialize, responseSerialize} = service[rpc];

  return responseDeserialize(responseSerialize(response));
};

const destination = `03${'cc'.repeat(32)}`;
const hash = Buffer.alloc(32, 7);
const preimage = Buffer.alloc(32, 8);

/** RPC asset amount, before the trip through the protos */
export const assetAmount = {
  amount: '25',
  asset_id: Buffer.alloc(32, 1),
  group_key: Buffer.alloc(0),
};

/** lnd payment in a state, before the trip through the protos

  {
    status: <Payment Status String> // SUCCEEDED, FAILED, IN_FLIGHT
  }
*/
export const makeLndPayment = ({status}: {status: string}) => {
  const htlcStatus = status === 'IN_FLIGHT' ? 'IN_FLIGHT' : status;

  return {
    creation_date: '1700000000',
    creation_time_ns: '1700000000000000000',
    failure_reason:
      status === 'FAILED' ? 'FAILURE_REASON_NO_ROUTE' : 'FAILURE_REASON_NONE',
    fee_msat: '1000',
    fee_sat: '1',
    htlcs: [
      {
        attempt_id: '1',
        attempt_time_ns: '1700000000100000000',
        preimage: status === 'SUCCEEDED' ? preimage : Buffer.alloc(0),
        resolve_time_ns: status === 'IN_FLIGHT' ? '0' : '1700000000200000000',
        route: {
          hops: [
            {
              amt_to_forward_msat: '5000000',
              chan_capacity: '100000',
              chan_id: '879609302319104001',
              custom_records: {},
              expiry: 500,
              fee_msat: '0',
              mpp_record: {
                payment_addr: Buffer.alloc(32, 9),
                total_amt_msat: '5000000',
              },
              pub_key: destination,
              tlv_payload: true,
            },
          ],
          total_amt: '5001',
          total_amt_msat: '5001000',
          total_fees: '1',
          total_fees_msat: '1000',
          total_time_lock: 500,
        },
        status: htlcStatus,
      },
    ],
    payment_hash: hash.toString('hex'),
    payment_index: '3',
    payment_preimage:
      status === 'SUCCEEDED'
        ? preimage.toString('hex')
        : Buffer.alloc(32).toString('hex'),
    payment_request: '',
    status,
    value_msat: '5000000',
    value_sat: '5000',
  };
};

/** RPC asset payment in a state, the way the client reads it

  {
    status: <Payment Status String> // SUCCEEDED, FAILED, IN_FLIGHT
  }
*/
export const makeRpcAssetPayment = ({status}: {status: string}) => {
  return overTheWireResponse('ListPayments', {
    payments: [
      {asset_amounts: [assetAmount], payment: makeLndPayment({status})},
    ],
  }).payments[0];
};

/** RPC asset invoice with the real lnd invoice, the way the client reads it */
export const rpcAssetInvoice = overTheWireResponse('ListInvoices', {
  invoices: [{asset_amounts: [assetAmount], invoice: responses.lndInvoice}],
}).invoices[0];

/** Payment hash and preimage of the payment templates */
export const payment = {
  destination,
  id: hash.toString('hex'),
  secret: preimage.toString('hex'),
};

/** Fake stream that sends events after the caller adds its listeners

  [[<Event Name String>, <Event Data Object>]]

  @returns
  <EventEmitter Object With a Cancel Method>
*/
export const fakeStream = (events: [string, unknown][]) => {
  const stream = Object.assign(new EventEmitter(), {cancel: () => {}});

  setImmediate(() =>
    events.forEach(([event, data]) => stream.emit(event, data)),
  );

  return stream;
};
