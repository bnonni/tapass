import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {defaultSocket} from '../grpc/index.js';
import {grpcSslCipherSuites} from '../grpc/index.js';
import {includeDirs} from '../grpc/index.js';
import {keepaliveTimeMs} from '../grpc/index.js';
import {keepaliveTimeoutMs} from '../grpc/index.js';
import {packageTypes} from '../grpc/index.js';
import {protoFiles} from '../grpc/index.js';
import {protosDir} from '../grpc/index.js';
import {serviceTypes} from '../grpc/index.js';
import apiForProto from './api_for_proto.js';
import grpcCredentials from './grpc_credentials.js';
import type {AuthenticatedTapd} from './types.js';
import type {TapdAuthentication} from './types.js';
import type {TapdServiceType} from './types.js';

const defaultProtosPath = fileURLToPath(new URL(protosDir, import.meta.url));
const {GRPC_SSL_CIPHER_SUITES} = process.env;
const {keys} = Object;

/** Initiate a gRPC API Methods Object for authenticated methods

  Both the cert and macaroon expect the entire serialized tapd generated file

  {
    [cert]: <Base64 or Hex Serialized tapd TLS Cert String>
    [macaroon]: <Base64 or Hex Serialized Macaroon String>
    [path]: <Path to Protos Directory With taprpc and lnrpc Directories String>
    [socket]: <Host:Port Network Address String>
  }

  @throws
  <Error>

  @returns
  {
    tapd: {
      assetwallet: <AssetWallet API Methods Object>
      default: <TaprootAssets API Methods Object>
      mailbox: <Mailbox API Methods Object>
      mint: <Mint API Methods Object>
      rfq: <Rfq API Methods Object>
      tapchannel: <TaprootAssetChannels API Methods Object>
      tapdev: <TapDev API Methods Object>
      universe: <Universe API Methods Object>
    }
  }
*/
export default (args: TapdAuthentication): {tapd: AuthenticatedTapd} => {
  const {credentials} = grpcCredentials(args);
  const protosPath = args.path || defaultProtosPath;

  if (!!args.cert && GRPC_SSL_CIPHER_SUITES !== grpcSslCipherSuites) {
    process.env.GRPC_SSL_CIPHER_SUITES = grpcSslCipherSuites;
  }

  const includes = includeDirs.map(dir => join(protosPath, dir));

  const params = {
    'grpc.keepalive_time_ms': keepaliveTimeMs,
    'grpc.keepalive_timeout_ms': keepaliveTimeoutMs,
    'grpc.max_receive_message_length': -1,
    'grpc.max_send_message_length': -1,
  };

  const types = keys(serviceTypes) as TapdServiceType[];

  // Assemble different services from their proto files
  return {
    tapd: types.reduce((services, type) => {
      const service = serviceTypes[type];

      services[type] = apiForProto({
        credentials,
        includes,
        params,
        service,
        path: join(protosPath, protoFiles[service]),
        socket: args.socket || defaultSocket,
        type: packageTypes[service],
      });

      return services;
    }, {} as AuthenticatedTapd),
  };
};
