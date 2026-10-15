import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import EventEmitter from 'node:events';
import test from 'node:test';

import {subscribeToAssetReceives} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcReceiveEventAsReceiveUpdate} from '../../../src/tapd_responses/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const [addr] = responses.queryAddrs.addrs;

const rpcEvent = {
  address: addr,
  confirmation_height: 0,
  error: '',
  outpoint: `${'ab'.repeat(32)}:0`,
  status: 'ADDR_EVENT_STATUS_TRANSACTION_DETECTED',
  timestamp: '1700000000123456',
};

// A fake gRPC stream: an event emitter with a cancel method
const makeStream = () => {
  const stream = new EventEmitter() as EventEmitter & {
    cancelled: number;
    cancel: () => void;
  };

  stream.cancelled = 0;
  stream.cancel = () => {
    stream.cancelled += 1;
  };

  return stream;
};

const tapdWith = (stream: EventEmitter, requests: any[] = []) => {
  const subscribeReceiveEvents = (req: any) => {
    requests.push(req);

    return stream;
  };

  return {default: {subscribeReceiveEvents}} as unknown as AuthenticatedTapd;
};

test('Arguments are checked', () => {
  const tapd = tapdWith(makeStream());

  throws(
    () => subscribeToAssetReceives({address: 1 as any, tapd}),
    new Error('ExpectedAssetAddressStringToSubscribeToAssetReceives'),
  );

  throws(
    () => subscribeToAssetReceives({created_after: 'date', tapd}),
    new Error('ExpectedValidCreatedAfterDateToSubscribeToReceives'),
  );

  throws(
    () => subscribeToAssetReceives({tapd: {} as AuthenticatedTapd}),
    new Error('ExpectedAuthenticatedTapdToSubscribeToAssetReceives'),
  );
});

test('The request has the address and the start time in microseconds', () => {
  const requests: any[] = [];
  const tapd = tapdWith(makeStream(), requests);

  subscribeToAssetReceives({tapd});

  subscribeToAssetReceives({
    address: addr.encoded,
    created_after: '2023-11-14T22:13:20.123Z',
    tapd,
  });

  deepStrictEqual(requests, [
    {filter_addr: '', start_timestamp: 0},
    {filter_addr: addr.encoded, start_timestamp: 1700000000123000},
  ]);
});

test('Receive events are mapped and emitted', () => {
  const stream = makeStream();
  const sub = subscribeToAssetReceives({tapd: tapdWith(stream)});
  const updates: any[] = [];

  sub.on('receive', update => updates.push(update));

  stream.emit('data', rpcEvent);

  deepStrictEqual(updates, [rpcReceiveEventAsReceiveUpdate(rpcEvent)]);
});

test('A bad event is emitted as an error', () => {
  const stream = makeStream();
  const sub = subscribeToAssetReceives({tapd: tapdWith(stream)});
  const errors: any[] = [];

  // Without an error listener, a bad event does not throw
  stream.emit('data', {});

  sub.on('error', err => errors.push(err));

  stream.emit('data', {});

  deepStrictEqual(errors, [[503, 'ExpectedKnownStatusInRpcReceiveEvent']]);
});

test('Stream errors, status, and end are passed on', () => {
  const stream = makeStream();
  const sub = subscribeToAssetReceives({tapd: tapdWith(stream)});
  const events: any[] = [];

  sub.on('end', () => events.push('end'));
  sub.on('error', err => events.push(err));
  sub.on('status', status => events.push(status));

  stream.emit('status', {code: 0});
  stream.emit('error', {details: 'failure'});
  stream.emit('end');

  deepStrictEqual(events, [{code: 0}, {details: 'failure'}, 'end']);
  equal(stream.cancelled, 1, 'An error cancels the stream');
});

test('Removing all receive listeners cancels the stream', () => {
  const stream = makeStream();
  const sub = subscribeToAssetReceives({tapd: tapdWith(stream)});
  const listener = () => {};

  sub.on('receive', listener);
  sub.removeListener('receive', listener);

  equal(stream.cancelled, 1, 'Stream is cancelled');
});
