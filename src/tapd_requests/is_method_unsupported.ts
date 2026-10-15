import grpc from '@grpc/grpc-js';

const unimplementedCode = grpc.status.UNIMPLEMENTED;
const unknownRequestText = 'unknown request';

type Err = {code?: number; details?: string};

/** Determine if an error shows that the daemon does not have the RPC

  A standalone tapd returns the unimplemented status. litd returns an unknown
  request error for an RPC that is not in its permissions list.

  {
    [err]: {
      [code]: <gRPC Status Code Number>
      [details]: <gRPC Status Details String>
    }
  }

  @returns
  <Is Method Unsupported Bool>
*/
export default ({err}: {err?: Err | null}) => {
  // Exit early when there is no error
  if (!err) {
    return false;
  }

  return err.code === unimplementedCode || err.details === unknownRequestText;
};
