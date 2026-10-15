import {deepStrictEqual} from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {confirmedFromPayment} from 'lightning/lnd_responses/index.js';
import {failureFromPayment} from 'lightning/lnd_responses/index.js';
import {pendingFromPayment} from 'lightning/lnd_responses/index.js';

import {subscribeToAssetInvoices} from '../../../src/index.js';
import {subscribeToAssetPayments} from '../../../src/index.js';
import {subscribeToPastAssetPayment} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcAssetInvoiceAsInvoice} from '../../../src/tapd_responses/index.js';
import {makeRpcAssetPayment} from '../../fixtures/tapd_channel_responses.js';
import {payment} from '../../fixtures/tapd_channel_responses.js';
import {rpcAssetInvoice} from '../../fixtures/tapd_channel_responses.js';

const assets = [
  {amount: '25', asset_id: '01'.repeat(32), group_key: undefined},
];

// A fake gRPC stream that records the request and if it was cancelled
const makeTapd = (method: string) => {
  const state: {isCancelled: boolean; request: unknown} = {
    isCancelled: false,
    request: undefined,
  };

  const stream = Object.assign(new EventEmitter(), state, {
    cancel: () => (stream.isCancelled = true),
  });

  const tapd = {
    tapchannel: {
      [method]: (req: unknown) => {
        stream.request = req;

        return stream;
      },
    },
  } as unknown as AuthenticatedTapd;

  return {stream, tapd};
};

const nextEvent = (emitter: EventEmitter, event: string) => {
  return new Promise(resolve => emitter.once(event, resolve));
};

test('Invoice subscription arguments are checked', () => {
  const {tapd} = makeTapd('subscribeInvoices');

  throws(
    () => subscribeToAssetInvoices({added_after: 0, tapd}),
    /ExpectedAddIndex/,
  );
  throws(
    () => subscribeToAssetInvoices({confirmed_after: 1.5, tapd}),
    /ExpectedConfirmedIndex/,
  );
  throws(
    () => subscribeToAssetInvoices({tapd: {} as AuthenticatedTapd}),
    /ExpectedAuthenticatedTapdToSubscribeToAssetInvoices/,
  );
});

test('Invoice updates are emitted', async () => {
  const {stream, tapd} = makeTapd('subscribeInvoices');

  const sub = subscribeToAssetInvoices({
    added_after: 3,
    confirmed_after: 2,
    tapd,
  });

  deepStrictEqual(stream.request, {request: {add_index: 3, settle_index: 2}});

  const updated = nextEvent(sub, 'invoice_updated');

  stream.emit('data', rpcAssetInvoice);

  deepStrictEqual(await updated, rpcAssetInvoiceAsInvoice(rpcAssetInvoice));

  const errored = nextEvent(sub, 'error');

  stream.emit('data', {});

  deepStrictEqual(await errored, [
    503,
    'ExpectedAssetAmountsInRpcAssetInvoice',
  ]);
});

const invoiceErrors = [
  {
    err: {code: 14, details: 'x'},
    error: [503, 'FailedToConnectToTapdToSubscribeToInvoices'],
  },
  {
    err: {details: 'permission denied'},
    error: [403, 'PermissionDeniedToSubscribeToAssetInvoices'],
  },
  {
    err: {code: 2, details: 'unknown request'},
    error: [501, 'ExpectedNewerTapdToSubscribeToAssetInvoices'],
  },
  {
    err: 'err',
    error: [503, 'UnexpectedErrorInAssetInvoicesSubscription', {err: 'err'}],
  },
];

invoiceErrors.forEach(({err, error}) => {
  return test(`Invoice subscription error ${JSON.stringify(error.slice(0, 2))}`, async () => {
    const {stream, tapd} = makeTapd('subscribeInvoices');

    const sub = subscribeToAssetInvoices({tapd});

    const errored = nextEvent(sub, 'error');

    stream.emit('error', err);

    deepStrictEqual(await errored, error);
    equal(stream.isCancelled, true, 'The stream is cancelled on an error');
  });
});

test('Removing the listeners cancels the invoice subscription', () => {
  const {stream, tapd} = makeTapd('subscribeInvoices');

  const sub = subscribeToAssetInvoices({tapd});

  const listener = () => {};

  sub.on('invoice_updated', listener);
  sub.removeListener('invoice_updated', listener);

  equal(stream.isCancelled, true);
});

test('Payment subscriptions check arguments', () => {
  throws(
    () => subscribeToAssetPayments({tapd: {} as AuthenticatedTapd}),
    /ExpectedAuthenticatedTapdToSubscribeToAssetPayments/,
  );

  const {tapd} = makeTapd('trackPayment');

  throws(
    () => subscribeToPastAssetPayment({id: 'id', tapd}),
    /ExpectedPaymentHashToSubscribeToPastAssetPayment/,
  );

  throws(
    () =>
      subscribeToPastAssetPayment({
        id: payment.id,
        tapd: {} as AuthenticatedTapd,
      }),
    /ExpectedAuthenticatedTapdToSubscribeToPastAssetPayment/,
  );
});

const paymentSubscriptions = [
  {
    method: 'subscribePayments',
    request: {request: {no_inflight_updates: false}},
    subscribe: (tapd: AuthenticatedTapd) => subscribeToAssetPayments({tapd}),
  },
  {
    method: 'trackPayment',
    request: {
      request: {
        no_inflight_updates: false,
        payment_hash: Buffer.from(payment.id, 'hex'),
      },
    },
    subscribe: (tapd: AuthenticatedTapd) => {
      return subscribeToPastAssetPayment({id: payment.id, tapd});
    },
  },
];

paymentSubscriptions.forEach(({method, request, subscribe}) => {
  test(`${method} emits paying, confirmed, and failed events`, async () => {
    const {stream, tapd} = makeTapd(method);

    const sub = subscribe(tapd);

    deepStrictEqual(stream.request, request);

    const paying = nextEvent(sub, 'paying');
    const inFlight = makeRpcAssetPayment({status: 'IN_FLIGHT'});

    stream.emit('data', inFlight);

    deepStrictEqual(await paying, {
      ...pendingFromPayment(inFlight.payment),
      assets,
    });

    const confirmed = nextEvent(sub, 'confirmed');
    const succeeded = makeRpcAssetPayment({status: 'SUCCEEDED'});

    stream.emit('data', succeeded);

    deepStrictEqual(await confirmed, {
      ...confirmedFromPayment(succeeded.payment),
      assets,
    });

    const failed = nextEvent(sub, 'failed');
    const failure = makeRpcAssetPayment({status: 'FAILED'});

    stream.emit('data', failure);

    deepStrictEqual(await failed, {
      ...failureFromPayment(failure.payment),
      assets,
    });

    const errored = nextEvent(sub, 'error');

    stream.emit('data', {});

    deepStrictEqual(await errored, [
      503,
      'ExpectedRpcAssetPaymentInPaymentUpdate',
    ]);
  });

  test(`${method} maps stream errors`, async () => {
    const {stream, tapd} = makeTapd(method);

    const sub = subscribe(tapd);

    const errored = nextEvent(sub, 'error');

    stream.emit('error', {details: 'permission denied'});

    equal(((await errored) as any)[0], 403, 'Got permission failure');
  });
});

test('An unknown past payment is not found', async () => {
  const {stream, tapd} = makeTapd('trackPayment');

  const sub = subscribeToPastAssetPayment({id: payment.id, tapd});

  const errored = nextEvent(sub, 'error');

  stream.emit('error', {
    details: "error tracking payment: payment isn't initiated",
  });

  deepStrictEqual(await errored, [404, 'SentAssetPaymentNotFound']);
});

test('An older tapd cannot track asset payments', async () => {
  const {stream, tapd} = makeTapd('trackPayment');

  const sub = subscribeToPastAssetPayment({id: payment.id, tapd});

  const errored = nextEvent(sub, 'error');

  stream.emit('error', {code: 2, details: 'unknown request'});

  deepStrictEqual(await errored, [501, 'ExpectedNewerTapdToTrackAssetPayment']);
});

test('A client cancel is not emitted as an error', () => {
  const {stream, tapd} = makeTapd('subscribePayments');

  const sub = subscribeToAssetPayments({tapd});

  let hasError = false;

  sub.on('error', () => (hasError = true));

  stream.emit('error', {details: 'Cancelled on client'});

  equal(hasError, false);
});
