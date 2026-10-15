import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import test from 'node:test';

import {subscribeToRfqEvents} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {buyQuote} from '../../fixtures/rfq_wire.js';
import {overTheWireResponse} from '../../fixtures/rfq_wire.js';
import {rpcBuyQuote} from '../../fixtures/rfq_wire.js';

const micros = '1700000000123456';

// A fake gRPC stream that records a cancel
const makeStream = () => {
  const stream = new EventEmitter() as EventEmitter & {
    cancel: () => void;
    isCancelled: boolean;
  };

  stream.isCancelled = false;
  stream.cancel = () => {
    stream.isCancelled = true;
  };

  return stream;
};

const tapdWith = (stream: EventEmitter) => {
  return {
    rfq: {subscribeRfqEventNtfns: () => stream},
  } as unknown as AuthenticatedTapd;
};

test('An authenticated tapd is expected', () => {
  throws(
    () => subscribeToRfqEvents({tapd: {} as AuthenticatedTapd}),
    /ExpectedAuthenticatedTapdToSubscribeToRfqEvents/,
  );
});

test('Events are mapped and emitted', () => {
  const stream = makeStream();
  const sub = subscribeToRfqEvents({tapd: tapdWith(stream)});

  const got: any[] = [];

  sub.on('accepted_buy_quote', n => got.push(['buy', n]));
  sub.on('accepted_htlc', n => got.push(['htlc', n]));

  stream.emit(
    'data',
    overTheWireResponse('SubscribeRfqEventNtfns', {
      peer_accepted_buy_quote: {
        peer_accepted_buy_quote: rpcBuyQuote,
        timestamp: micros,
      },
    }),
  );

  stream.emit(
    'data',
    overTheWireResponse('SubscribeRfqEventNtfns', {
      accept_htlc: {scid: '1099511693313', timestamp: micros},
    }),
  );

  deepStrictEqual(got, [
    ['buy', {at: '2023-11-14T22:13:20.123Z', ...buyQuote}],
    ['htlc', {at: '2023-11-14T22:13:20.123Z', channel: '1x1x1'}],
  ]);
});

test('An event that cannot be read is an error', () => {
  const stream = makeStream();
  const sub = subscribeToRfqEvents({tapd: tapdWith(stream)});

  const errors: unknown[] = [];

  sub.on('accepted_htlc', () => {});
  sub.on('error', err => errors.push(err));

  stream.emit('data', {});

  deepStrictEqual(errors, [[503, 'ExpectedKnownEventTypeInRpcRfqEvent']]);
  equal(stream.isCancelled, true, 'Subscription is cancelled');
});

test('Stream errors are mapped', () => {
  const cases = [
    {
      err: {code: 14, details: 'unavailable'},
      expected: [503, 'FailedToConnectToTapdToSubscribeToRfqEvents'],
    },
    {
      err: {code: 2, details: 'permission denied'},
      expected: [403, 'PermissionDeniedToSubscribeToRfqEvents'],
    },
    {
      err: 'err',
      expected: [503, 'UnexpectedErrorInRfqEventsSubscription', {err: 'err'}],
    },
  ];

  cases.forEach(({err, expected}) => {
    const stream = makeStream();
    const sub = subscribeToRfqEvents({tapd: tapdWith(stream)});

    const errors: unknown[] = [];

    sub.on('error', err => errors.push(err));

    stream.emit('error', err);

    deepStrictEqual(errors, [expected]);
  });
});

test('The subscription is cancelled when the listeners are removed', () => {
  const stream = makeStream();
  const sub = subscribeToRfqEvents({tapd: tapdWith(stream)});

  const errors: unknown[] = [];
  const listener = () => {};

  sub.on('accepted_sell_quote', listener);
  sub.on('error', err => errors.push(err));
  sub.removeListener('accepted_sell_quote', listener);

  equal(stream.isCancelled, true, 'Subscription is cancelled');

  stream.emit('error', {code: 1, details: 'Cancelled on client'});

  deepStrictEqual(errors, [], 'A client cancel is not an error');
  equal(stream.listenerCount('data'), 0, 'Stream listeners are removed');
});

test('End and status are relayed', () => {
  const stream = makeStream();
  const sub = subscribeToRfqEvents({tapd: tapdWith(stream)});

  const got: unknown[] = [];

  sub.on('end', () => got.push('end'));
  sub.on('status', n => got.push(n));

  stream.emit('status', {code: 0});
  stream.emit('end');

  deepStrictEqual(got, [{code: 0}, 'end']);
});
