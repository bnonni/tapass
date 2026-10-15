import type {EventEmitter} from 'node:events';

import type {ClientReadableStream} from '@grpc/grpc-js';

const sumOf = (arr: number[]) => arr.reduce((sum, n) => sum + n, Number());

type Args = {
  emitter: EventEmitter;
  events: string[];
  subscription: ClientReadableStream<unknown>;
};

/** Cancel a gRPC subscription when all its event listeners are removed

  {
    emitter: <EventEmitter Subscription Proxy Object>
    events: [<Event Name String>]
    subscription: <gRPC Subscription Object>
  }
*/
export default ({emitter, events, subscription}: Args) => {
  // Cancel the subscription when all listeners are removed
  emitter.on('removeListener', () => {
    const counts = events.map(n => emitter.listenerCount(n));

    // Exit early when there are still active listeners
    if (!!sumOf(counts)) {
      return;
    }

    subscription.cancel();

    return;
  });
};
