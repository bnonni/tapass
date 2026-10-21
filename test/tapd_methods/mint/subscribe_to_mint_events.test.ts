import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import EventEmitter from 'node:events';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {subscribeToMintEvents} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcBatchAsBatch} from '../../../src/tapd_responses/index.js';
import {mintResponses} from '../../fixtures/tapd_mint_responses.js';

const [frozen, , , , finalized] = mintResponses.mintEvents;

// A fake gRPC stream that records the request and the cancel calls
const makeStream = () => {
  const stream = Object.assign(new EventEmitter(), {cancels: 0, request: {}});

  return Object.assign(stream, {cancel: () => (stream.cancels += 1)});
};

const tapdWith = (stream: ReturnType<typeof makeStream>) => {
  const subscribeMintEvents = (req: object) => {
    stream.request = req;

    return stream;
  };

  return {mint: {subscribeMintEvents}} as unknown as AuthenticatedTapd;
};

test('An authenticated tapd is expected', () => {
  throws(
    () => subscribeToMintEvents({tapd: {} as AuthenticatedTapd}),
    new Error('ExpectedAuthenticatedTapdToSubscribeToMintEvents'),
  );
});

test('Real mint events are emitted as batch events', () => {
  const events: any[] = [];
  const stream = makeStream();

  const sub = subscribeToMintEvents({tapd: tapdWith(stream)});

  sub.on('batch', event => events.push(event));

  stream.emit('data', frozen);
  stream.emit('data', finalized);

  deepStrictEqual(stream.request, {short_response: false});

  deepStrictEqual(events, [
    {
      at: new Date(Number(frozen.timestamp) / 1e3).toISOString(),
      batch: rpcBatchAsBatch({batch: frozen.batch}),
      error: undefined,
      state: 'frozen',
    },
    {
      at: new Date(Number(finalized.timestamp) / 1e3).toISOString(),
      batch: rpcBatchAsBatch({batch: finalized.batch}),
      error: undefined,
      state: 'finalized',
    },
  ]);
});

test('A failed state change has the error', () => {
  const events: any[] = [];
  const stream = makeStream();

  const sub = subscribeToMintEvents({tapd: tapdWith(stream)});

  sub.on('batch', event => events.push(event));

  stream.emit('data', {...frozen, error: 'unable to fund', batch_state: 'X'});

  equal(events[0].error, 'unable to fund');
  equal(events[0].state, 'unknown');
});

test('A bad event is an error, and the stream is cancelled', () => {
  const errors: any[] = [];
  const stream = makeStream();

  const sub = subscribeToMintEvents({tapd: tapdWith(stream)});

  sub.on('batch', () => {});
  sub.on('error', err => errors.push(err));

  stream.emit('data', {...frozen, timestamp: undefined});
  stream.emit('data', {...frozen, batch: null});

  deepStrictEqual(errors, [
    [503, 'ExpectedTimestampInMintEvent'],
    [503, 'ExpectedRpcMintingBatch'],
  ]);
  equal(stream.cancels, 2);
});

test('A stream error is emitted, and end and status pass through', () => {
  const emitted: any[] = [];
  const stream = makeStream();

  const sub = subscribeToMintEvents({tapd: tapdWith(stream)});

  sub.on('batch', () => {});
  sub.on('end', () => emitted.push('end'));
  sub.on('error', err => emitted.push(err));
  sub.on('status', status => emitted.push(status));

  stream.emit('status', {code: 0});
  stream.emit('error', {details: 'connection dropped'});
  stream.emit('end');

  deepStrictEqual(emitted, [
    {code: 0},
    [503, 'FailedToConnectToTapdToSubscribeToMintEvents'],
    'end',
  ]);
  equal(stream.cancels, 1);
});

test('Permission and unexpected errors are mapped', () => {
  const cases = [
    {
      err: {code: 2, details: 'permission denied'},
      expected: [403, 'PermissionDeniedToSubscribeToMintEvents'],
    },
    {
      err: {details: 'failure'},
      expected: [
        503,
        'UnexpectedErrorInMintEventsSubscription',
        {err: {details: 'failure'}},
      ],
    },
  ];

  cases.forEach(({err, expected}) => {
    const stream = makeStream();
    const sub = subscribeToMintEvents({tapd: tapdWith(stream)});
    const errors: any[] = [];

    sub.on('error', err => errors.push(err));

    stream.emit('error', err);

    deepStrictEqual(errors, [expected]);
    equal(stream.cancels, 1, 'An error cancels the stream');
  });
});

test('The stream is cancelled when all batch listeners are removed', () => {
  const stream = makeStream();

  const sub = subscribeToMintEvents({tapd: tapdWith(stream)});

  const errors: any[] = [];
  const listener = () => {};

  sub.on('batch', listener);
  sub.on('error', err => errors.push(err));

  equal(stream.cancels, 0);

  sub.removeListener('batch', listener);

  equal(stream.cancels, 1);

  stream.emit('error', {code: 1, details: 'Cancelled on client'});

  deepStrictEqual(errors, [], 'A client cancel is not an error');
  equal(stream.listenerCount('data'), 0, 'Stream listeners are removed');
});
