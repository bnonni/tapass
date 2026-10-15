import {createHash} from 'node:crypto';
import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {sendAssetKeysend} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {fakeStream} from '../../fixtures/tapd_channel_responses.js';
import {makeLndPayment} from '../../fixtures/tapd_channel_responses.js';
import {overTheWireResponse} from '../../fixtures/tapd_channel_responses.js';

const assetId = '01'.repeat(32);
const destination = `03${'cc'.repeat(32)}`;

const succeeded = overTheWireResponse('SendPayment', {
  payment_result: makeLndPayment({status: 'SUCCEEDED'}),
});

const tapdWith = (events: [string, unknown][], onRequest?: Function) => {
  const sendPayment = (req: any) => {
    onRequest?.(req);

    return fakeStream(events);
  };

  return {tapchannel: {sendPayment}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith([['data', succeeded]]);

const args = {amount: '10', asset_id: assetId, destination, tapd};

const tests = [
  {
    args: {...args, amount: '0'},
    description: 'An asset amount is expected',
    error: [400, 'ExpectedAssetAmountToSendAssetKeysend'],
  },
  {
    args: {...args, asset_id: undefined},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToSendAssetKeysend'],
  },
  {
    args: {...args, destination: 'key'},
    description: 'A destination is expected',
    error: [400, 'ExpectedDestinationToSendAssetKeysend'],
  },
  {
    args: {...args, secret: 'secret'},
    description: 'A hex preimage is expected',
    error: [400, 'ExpectedPreimageHexToSendAssetKeysend'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToSendAssetKeysend'],
  },
  {
    args: {...args, tokens: 1.5},
    description: 'Integer tokens are expected',
    error: [400, 'ExpectedIntegerTokensToSendAssetKeysend'],
  },
  {
    args: {...args, tokens: 353},
    description: 'At least 354 tokens are expected',
    error: [400, 'ExpectedAtLeast354TokensToSendAssetKeysend'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith([['error', {details: 'permission denied'}]]),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToSendAssetKeysend'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(sendAssetKeysend(args), error, 'Got expected error');

    return;
  });
});

test('A keysend sends the preimage record and returns the payment', async () => {
  let sent: any;

  const secret = '05'.repeat(32);

  const paid = await sendAssetKeysend({
    ...args,
    secret,
    tapd: tapdWith([['data', succeeded]], (req: any) => (sent = req)),
  });

  equal(paid.secret, '08'.repeat(32), 'Got the payment preimage');
  deepStrictEqual(paid.quotes, [], 'A direct keysend has no quote');

  deepStrictEqual(sent.asset_amount, '10');
  deepStrictEqual(sent.payment_request.amt, 354);
  deepStrictEqual(sent.payment_request.dest, Buffer.from(destination, 'hex'));
  deepStrictEqual(sent.payment_request.dest_custom_records, {
    '5482373484': Buffer.from(secret, 'hex'),
  });
  deepStrictEqual(
    sent.payment_request.payment_hash,
    createHash('sha256').update(Buffer.from(secret, 'hex')).digest(),
  );
});

test('A random preimage is used when there is no secret', async () => {
  let sent: any;

  await sendAssetKeysend({
    ...args,
    tapd: tapdWith([['data', succeeded]], (req: any) => (sent = req)),
    tokens: 1000,
  });

  const preimage = sent.payment_request.dest_custom_records['5482373484'];

  equal(preimage.length, 32, 'Got a 32 byte preimage');
  equal(sent.payment_request.amt, 1000, 'Got the tokens');
  deepStrictEqual(
    sent.payment_request.payment_hash,
    createHash('sha256').update(preimage).digest(),
  );
});
