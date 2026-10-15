import type {EventEmitter} from 'node:events';

import type {ClientReadableStream} from '@grpc/grpc-js';

const cancelError = 'Cancelled on client';

type Args = {
  emitter: EventEmitter;
  subscription: ClientReadableStream<unknown>;
};

/** Get a function that emits an error from a gRPC subscription proxy

  {
    emitter: <Event Subscription Proxy Object>
    subscription: <gRPC Subscription Object>
  }

  @returns
  <Error Emission Function>
*/
export default ({emitter, subscription}: Args) => {
  return (err?: {details?: string}) => {
    subscription.cancel();

    if (!!err && err.details === cancelError) {
      subscription.removeAllListeners();
    }

    // Exit early when there are no error listeners
    if (!emitter.listenerCount('error')) {
      return;
    }

    emitter.emit('error', err);

    return;
  };
};
