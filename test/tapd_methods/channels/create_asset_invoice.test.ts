import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {createAssetInvoice} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {overTheWireResponse} from '../../fixtures/tapd_channel_responses.js';
import {responses} from '../../fixtures/tapd_channel_responses.js';
import {buyQuote} from '../../fixtures/rfq_wire.js';
import {rpcBuyQuote} from '../../fixtures/rfq_wire.js';

const assetId = '01'.repeat(32);
const {preimage, request} = responses.knownPreimageRequest;
const id = '02d449a31fbb267c8f352e9968a79e3e5fc95c1bbeaa502fd6454ebde5a4bedc';

// The response the way the client reads it from AddInvoice
const response = overTheWireResponse('AddInvoice', {
  accepted_buy_quote: rpcBuyQuote,
  invoice_result: {
    add_index: '2',
    payment_addr: Buffer.alloc(32, 6),
    payment_request: request,
    r_hash: Buffer.from(id, 'hex'),
  },
});

const tapdWith = (addInvoice: (req: any, cbk: Function) => void) => {
  return {tapchannel: {addInvoice}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, response));

const failWith = (details: string) => tapdWith((_, cbk) => cbk({details}));

const args = {amount: '100', asset_id: assetId, secret: preimage, tapd};

const tests = [
  {
    args: {...args, tokens: 1},
    description: 'Only one amount is expected',
    error: [400, 'ExpectedOneOfAmountTokensOrMtokensForInvoice'],
  },
  {
    args: {...args, amount: undefined},
    description: 'An amount is expected',
    error: [400, 'ExpectedOneOfAmountTokensOrMtokensForInvoice'],
  },
  {
    args: {...args, amount: '0'},
    description: 'A positive asset amount is expected',
    error: [400, 'ExpectedAssetAmountToCreateAssetInvoice'],
  },
  {
    args: {...args, asset_id: undefined},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToCreateAssetInvoice'],
  },
  {
    args: {...args, group_key: `02${'aa'.repeat(32)}`},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'UnexpectedAssetIdAndGroupKeyForAssetInvoice'],
  },
  {
    args: {...args, asset_id: 'id'},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToCreateAssetInvoice'],
  },
  {
    args: {...args, cltv_delta: 0},
    description: 'A CLTV delta is positive',
    error: [400, 'ExpectedCltvDeltaToCreateAssetInvoice'],
  },
  {
    args: {...args, description_hash: 'hash'},
    description: 'A description hash is expected',
    error: [400, 'ExpectedDescriptionHashToCreateAssetInvoice'],
  },
  {
    args: {...args, expires_at: '2020-01-01T00:00:00.000Z'},
    description: 'A future expiry is expected',
    error: [400, 'ExpectedFutureExpiresAtToCreateAssetInvoice'],
  },
  {
    args: {...args, asset_id: undefined, group_key: 'key'},
    description: 'A group key is expected',
    error: [400, 'ExpectedGroupKeyHexToCreateAssetInvoice'],
  },
  {
    args: {...args, id: 'hash', secret: undefined},
    description: 'A hold invoice payment hash is expected',
    error: [400, 'ExpectedPaymentHashToCreateAssetHoldInvoice'],
  },
  {
    args: {...args, id},
    description: 'A hold invoice has no secret',
    error: [400, 'UnexpectedSecretForAssetHoldInvoice'],
  },
  {
    args: {...args, min_amount: 'x'},
    description: 'A numeric minimum amount is expected',
    error: [400, 'ExpectedNumericMinAmountForAssetInvoice'],
  },
  {
    args: {...args, min_rate: '1.2.3'},
    description: 'A decimal minimum rate is expected',
    error: [400, 'ExpectedDecimalMinRateForAssetInvoice'],
  },
  {
    args: {...args, amount: undefined, mtokens: '0'},
    description: 'Positive millitokens are expected',
    error: [400, 'ExpectedMillitokensToCreateAssetInvoice'],
  },
  {
    args: {...args, peer_public_key: 'key'},
    description: 'A peer public key is expected',
    error: [400, 'ExpectedPeerPublicKeyHexForAssetInvoice'],
  },
  {
    args: {...args, price_oracle_metadata: 'x'.repeat(32769)},
    description: 'Price oracle metadata has a maximum size',
    error: [400, 'ExpectedShorterOracleMetadataForAssetInvoice'],
  },
  {
    args: {...args, secret: 'secret'},
    description: 'A hex preimage is expected',
    error: [400, 'ExpectedPreimageHexToCreateAssetInvoice'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToCreateAssetInvoice'],
  },
  {
    args: {...args, amount: undefined, tokens: 0},
    description: 'Positive tokens are expected',
    error: [400, 'ExpectedTokensToCreateAssetInvoice'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'x'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToCreateAssetInvoice'],
  },
  {
    args: {...args, tapd: failWith('permission denied')},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToCreateAssetInvoice'],
  },
  {
    args: {
      ...args,
      tapd: failWith('no asset channels available for quote negotiation'),
    },
    description: 'A missing asset channel is returned',
    error: [503, 'NoAssetChannelForQuoteNegotiation'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCreatingAssetInvoice', {err: 'err'}],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A payment request is expected',
    error: [503, 'ExpectedPaymentRequestForAssetInvoice'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => {
        return cbk(null, {
          invoice_result: {payment_request: request, r_hash: Buffer.alloc(0)},
        });
      }),
    },
    description: 'A payment hash is expected',
    error: [503, 'ExpectedPaymentHashForAssetInvoice'],
  },
  {
    args: {...args, secret: '00'.repeat(32)},
    description: 'The payment hash must match the secret',
    error: [503, 'ExpectedPaymentHashOfSecretForAssetInvoice'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => {
        return cbk(null, {
          invoice_result: {
            payment_request: 'request',
            r_hash: Buffer.from(id, 'hex'),
          },
        });
      }),
    },
    description: 'A valid payment request is expected',
    error: [503, 'ExpectedLnPrefix'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(createAssetInvoice(args), (err: any) => {
      deepStrictEqual(err.slice(0, error.length === 3 ? 3 : 2), error);

      return true;
    });

    return;
  });
});

test('An asset invoice is created', async () => {
  const invoice = await createAssetInvoice(args);

  deepStrictEqual(invoice, {
    chain_address: undefined,
    created_at: '2026-10-15T22:29:45.000Z',
    description: 'asset-invoice',
    id,
    mtokens: '2000000',
    payment: '06'.repeat(32),
    quote: buyQuote,
    request,
    secret: preimage,
    tokens: 2000,
  });
});

test('The invoice request has the invoice details', async () => {
  let sent: any;

  const hold = await createAssetInvoice({
    cltv_delta: 40,
    description: 'asset-invoice',
    description_hash: '07'.repeat(32),
    expires_at: new Date(Date.now() + 3600e3).toISOString(),
    group_key: `02${'aa'.repeat(32)}`,
    id,
    is_fill_or_kill: true,
    is_including_private_channels: true,
    min_amount: '0',
    min_rate: '12.5',
    peer_public_key: `03${'bb'.repeat(32)}`,
    price_oracle_metadata: '{}',
    tapd: tapdWith((req, cbk) => {
      sent = req;

      return cbk(null, response);
    }),
    tokens: 2000,
  });

  equal(hold.secret, undefined, 'A hold invoice has no secret');

  equal(sent.asset_amount, '0');
  deepStrictEqual(sent.asset_id, Buffer.alloc(0));
  equal(sent.asset_min_amt, '0');
  deepStrictEqual(sent.asset_rate_limit, {coefficient: '125', scale: 1});
  equal(sent.execution_policy, 'EXECUTION_POLICY_FOK');
  deepStrictEqual(sent.group_key, Buffer.from(`02${'aa'.repeat(32)}`, 'hex'));
  deepStrictEqual(sent.hodl_invoice, {payment_hash: Buffer.from(id, 'hex')});
  equal(sent.invoice_request.cltv_expiry, 40);
  deepStrictEqual(sent.invoice_request.description_hash, Buffer.alloc(32, 7));
  equal(Math.abs(sent.invoice_request.expiry - 3600) <= 1, true, 'Got expiry');
  equal(sent.invoice_request.memo, 'asset-invoice');
  equal(sent.invoice_request.private, true);
  equal(sent.invoice_request.r_preimage, undefined);
  equal(sent.invoice_request.value, 2000);
  deepStrictEqual(sent.peer_pubkey, Buffer.from(`03${'bb'.repeat(32)}`, 'hex'));
});
