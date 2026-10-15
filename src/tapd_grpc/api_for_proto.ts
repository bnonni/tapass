import grpc from '@grpc/grpc-js';
import type {ChannelCredentials, ChannelOptions} from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import grpcOptions from './grpc_options.js';

type Args = {
  credentials: ChannelCredentials;
  includes: string[];
  params: ChannelOptions;
  path: string;
  service: string;
  socket: string;
  type: string;
};

/** Get an api for a proto file

  {
    credentials: <gRPC Credentials Object>
    includes: [<Proto Import Directory Path String>]
    params: <gRPC Channel Options Object>
    path: <Proto File Path String>
    service: <Service Name String>
    socket: <Host:Port Network Address String>
    type: <RPC Type String>
  }

  @returns
  <API Object>
*/
export default (args: Args) => {
  const options = {...grpcOptions, includeDirs: args.includes};

  const rpc = grpc.loadPackageDefinition(loadSync(args.path, options)) as any;

  return new rpc[args.type][args.service](
    args.socket,
    args.credentials,
    args.params,
  );
};
