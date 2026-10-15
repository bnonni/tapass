import grpc from '@grpc/grpc-js';

const connectionFailureMessages = [
  'channel is in state transient_failure',
  'connect failed',
  'connection dropped',
  'econnrefused',
  'econnreset',
  'failed to connect to all addresses',
  'no connection established',
  'server is shutting down',
];

const isString = (n: unknown) => typeof n === 'string';
const unavailableCode = grpc.status.UNAVAILABLE;

type Err = {code?: number; details?: string; message?: string};

/** Determine if an error represents a failure to connect to the daemon

  {
    [err]: {
      [code]: <gRPC Status Code Number>
      [details]: <gRPC Status Details String>
      [message]: <Error Message String>
    }
  }

  @returns
  <Is Connection Failure Bool>
*/
export default ({err}: {err?: Err | null}) => {
  // Exit early when there is no error
  if (!err) {
    return false;
  }

  // Exit early when the connection is reported as unavailable
  if (err.code === unavailableCode) {
    return true;
  }

  const text = [err.details, err.message].filter(isString).join(' ');

  const normalized = text.toLowerCase();

  return !!connectionFailureMessages.find(n => normalized.includes(n));
};
