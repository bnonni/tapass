import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import test from 'node:test';

import {subscribeToAssetSends} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_send_responses.js';

const [first, , last] = responses.sendEvents;

// A fake gRPC stream that records the request and the cancel calls
const makeStream = () => {
  const stream = new EventEmitter() as EventEmitter & {
    cancels: number;
    cancel: () => void;
    request?: any;
  };

  stream.cancels = 0;
  stream.cancel = () => {
    stream.cancels += 1;
  };

  return stream;
};

const tapdWith = (stream: ReturnType<typeof makeStream>) => {
  const subscribeSendEvents = (req: any) => {
    stream.request = req;

    return stream;
  };

  return {default: {subscribeSendEvents}} as unknown as AuthenticatedTapd;
};

const errors = [
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: 'ExpectedAuthenticatedTapdToSubscribeToAssetSends',
  },
  {
    args: {script_key: 'key', tapd: tapdWith(makeStream())},
    description: 'A hex script key is expected',
    error: 'ExpectedScriptKeyHexToSubscribeToAssetSends',
  },
  {
    args: {start_at: 'date', tapd: tapdWith(makeStream())},
    description: 'A valid start date is expected',
    error: 'ExpectedValidStartDateToSubscribeToAssetSends',
  },
  {
    args: {start_at: '2999-01-01T00:00:00.000Z', tapd: tapdWith(makeStream())},
    description: 'A start date in the past is expected',
    error: 'ExpectedPastStartDateToSubscribeToAssetSends',
  },
];

errors.forEach(({args, description, error}) => {
  return test(description, () => {
    throws(() => subscribeToAssetSends(args), new Error(error));
  });
});

test('Real send events are emitted', () => {
  const stream = makeStream();
  const sends: any[] = [];

  const sub = subscribeToAssetSends({tapd: tapdWith(stream)});

  sub.on('send', send => sends.push(send));

  stream.emit('data', first);
  stream.emit('data', last);

  deepStrictEqual(
    sends.map(n => n.state),
    ['start_handle_addr_parcel', 'complete'],
  );

  equal(sends[1].transfer.outputs.length, 2);
});

test('The request has the filters', () => {
  const stream = makeStream();
  const scriptKey = `02${'11'.repeat(32)}`;

  subscribeToAssetSends({
    label: 'label',
    script_key: scriptKey,
    start_at: '2023-11-14T22:13:20.000Z',
    tapd: tapdWith(stream),
  });

  deepStrictEqual(stream.request, {
    filter_label: 'label',
    filter_script_key: Buffer.from(scriptKey, 'hex'),
    start_timestamp: '1700000000000000',
  });

  const empty = makeStream();

  subscribeToAssetSends({tapd: tapdWith(empty)});

  deepStrictEqual(empty.request, {
    filter_label: '',
    filter_script_key: Buffer.alloc(0),
    start_timestamp: '0',
  });
});

test('An event that is not valid is emitted as an error', () => {
  const stream = makeStream();
  const errors: any[] = [];

  const sub = subscribeToAssetSends({tapd: tapdWith(stream)});

  sub.on('error', err => errors.push(err));

  stream.emit('data', {});

  deepStrictEqual(errors, [[503, 'ExpectedArrayOfAddressesInRpcSendEvent']]);

  // A bad event without error listeners does not throw
  sub.removeAllListeners('error');
  sub.on('send', () => {});
  stream.emit('data', {});
});

test('A stream error is emitted and the stream is cancelled', () => {
  const stream = makeStream();
  const errors: any[] = [];

  const sub = subscribeToAssetSends({tapd: tapdWith(stream)});

  sub.on('error', err => errors.push(err));

  stream.emit('error', {details: 'failure'});

  deepStrictEqual(errors, [
    [
      503,
      'UnexpectedErrorInAssetSendsSubscription',
      {err: {details: 'failure'}},
    ],
  ]);
  equal(stream.cancels, 1);
});

test('Connection and permission errors are mapped', () => {
  const cases = [
    {
      err: {code: 14, details: 'unavailable'},
      expected: [503, 'FailedToConnectToTapdToSubscribeToAssetSends'],
    },
    {
      err: {code: 2, details: 'permission denied'},
      expected: [403, 'PermissionDeniedToSubscribeToAssetSends'],
    },
  ];

  cases.forEach(({err, expected}) => {
    const stream = makeStream();
    const sub = subscribeToAssetSends({tapd: tapdWith(stream)});
    const errors: any[] = [];

    sub.on('error', err => errors.push(err));

    stream.emit('error', err);

    deepStrictEqual(errors, [expected]);
    equal(stream.cancels, 1, 'An error cancels the stream');
  });
});

test('The end and status of the stream are emitted', () => {
  const stream = makeStream();
  const statuses: any[] = [];
  let isEnded = false;

  const sub = subscribeToAssetSends({tapd: tapdWith(stream)});

  sub.on('end', () => (isEnded = true));
  sub.on('status', n => statuses.push(n));

  stream.emit('status', {code: 0});
  stream.emit('end');

  deepStrictEqual(statuses, [{code: 0}]);
  equal(isEnded, true);
});

test('The stream is cancelled when all send listeners are removed', () => {
  const stream = makeStream();

  const sub = subscribeToAssetSends({tapd: tapdWith(stream)});

  const errors: any[] = [];
  const listener = () => {};

  sub.on('send', listener);
  sub.on('error', err => errors.push(err));
  sub.removeListener('send', listener);

  equal(stream.cancels, 1);

  stream.emit('error', {code: 1, details: 'Cancelled on client'});

  deepStrictEqual(errors, [], 'A client cancel is not an error');
  equal(stream.listenerCount('data'), 0, 'Stream listeners are removed');
});
