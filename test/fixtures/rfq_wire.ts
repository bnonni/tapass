import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import grpcOptions from '../../src/tapd_grpc/grpc_options.js';

const protos = fileURLToPath(new URL('../../protos/', import.meta.url));

const definition = loadSync(join(protos, 'taprpc/rfqrpc/rfq.proto'), {
  ...grpcOptions,
  includeDirs: [join(protos, 'taprpc'), join(protos, 'lnrpc')],
});

const {service} = (grpc.loadPackageDefinition(definition) as any).rfqrpc.Rfq;

/** Request the way tapd reads it, after a trip through the RFQ protos

  <RFQ RPC Name String>
  <Request Object>
*/
export const overTheWireRequest = (rpc: string, request: object) => {
  const {requestDeserialize, requestSerialize} = service[rpc];

  return requestDeserialize(requestSerialize(request));
};

/** Response the way the client reads it, after a trip through the RFQ protos

  <RFQ RPC Name String>
  <Response Object>
*/
export const overTheWireResponse = (rpc: string, response: object) => {
  const {responseDeserialize, responseSerialize} = service[rpc];

  return responseDeserialize(responseSerialize(response));
};

const peer = `02${'aa'.repeat(32)}`;

/** RPC buy quote as the client gets it from tapd */
export const rpcBuyQuote = overTheWireResponse('QueryPeerAcceptedQuotes', {
  buy_quotes: [
    {
      accepted_max_amount: '0',
      ask_asset_rate: {coefficient: '12345', scale: 2},
      asset_max_amount: '1000',
      asset_spec: {group_pub_key: Buffer.alloc(0), id: Buffer.alloc(32, 1)},
      expiry: '1800000000',
      id: Buffer.alloc(32, 2),
      min_transportable_units: '3',
      peer,
      price_oracle_metadata: '',
      scid: '879609302319104001',
    },
  ],
}).buy_quotes[0];

/** RPC sell quote as the client gets it from tapd */
export const rpcSellQuote = overTheWireResponse('QueryPeerAcceptedQuotes', {
  sell_quotes: [
    {
      accepted_max_amount: '50000',
      asset_amount: '20',
      asset_spec: {group_pub_key: Buffer.alloc(32, 4), id: Buffer.alloc(0)},
      bid_asset_rate: {coefficient: '5', scale: 3},
      expiry: '1800000000',
      id: Buffer.alloc(32, 3),
      min_transportable_msat: '354001',
      peer,
      price_oracle_metadata: '{"user":"alice"}',
      scid: '1099511693313',
    },
  ],
}).sell_quotes[0];

/** Buy quote from the RPC buy quote */
export const buyQuote = {
  accepted_max_amount: undefined,
  asset_id: Buffer.alloc(32, 1).toString('hex'),
  channel: '800000x1500x1',
  expires_at: '2027-01-15T08:00:00.000Z',
  group_key: undefined,
  id: Buffer.alloc(32, 2).toString('hex'),
  max_amount: '1000',
  min_transportable_amount: '3',
  peer_public_key: peer,
  price_oracle_metadata: undefined,
  rate: '123.45',
};

/** Sell quote from the RPC sell quote */
export const sellQuote = {
  accepted_max_mtokens: '50000',
  amount: '20',
  asset_id: undefined,
  channel: '1x1x1',
  expires_at: '2027-01-15T08:00:00.000Z',
  group_key: Buffer.alloc(32, 4).toString('hex'),
  id: Buffer.alloc(32, 3).toString('hex'),
  min_transportable_mtokens: '354001',
  peer_public_key: peer,
  price_oracle_metadata: '{"user":"alice"}',
  rate: '0.005',
};
