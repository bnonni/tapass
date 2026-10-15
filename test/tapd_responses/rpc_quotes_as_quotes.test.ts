import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcBuyQuoteAsQuote} from '../../src/tapd_responses/index.js';
import {rpcSellQuoteAsQuote} from '../../src/tapd_responses/index.js';
import {buyQuote} from '../fixtures/rfq_wire.js';
import {rpcBuyQuote} from '../fixtures/rfq_wire.js';
import {rpcSellQuote} from '../fixtures/rfq_wire.js';
import {sellQuote} from '../fixtures/rfq_wire.js';

const buyErrors = [
  {args: null, error: 'ExpectedRpcPeerAcceptedBuyQuote'},
  {
    args: {...rpcBuyQuote, asset_max_amount: 1},
    error: 'ExpectedMaxAmountInRpcBuyQuote',
  },
  {args: {...rpcBuyQuote, expiry: ''}, error: 'ExpectedExpiryInRpcBuyQuote'},
  {
    args: {...rpcBuyQuote, id: Buffer.alloc(0)},
    error: 'ExpectedQuoteIdInRpcBuyQuote',
  },
  {
    args: {...rpcBuyQuote, min_transportable_units: null},
    error: 'ExpectedMinTransportableUnitsInRpcBuyQuote',
  },
  {
    args: {...rpcBuyQuote, peer: 'peer'},
    error: 'ExpectedPeerPublicKeyInRpcBuyQuote',
  },
  {
    args: {...rpcBuyQuote, ask_asset_rate: null},
    error: 'ExpectedAskAssetRateInRpcBuyQuote',
  },
  {args: {...rpcBuyQuote, scid: ''}, error: 'ExpectedNumericShortChannelId'},
];

buyErrors.forEach(({args, error}) => {
  return test(`A buy quote error is ${error}`, () => {
    throws(() => rpcBuyQuoteAsQuote(args), new Error(error));
  });
});

const sellErrors = [
  {args: null, error: 'ExpectedRpcPeerAcceptedSellQuote'},
  {
    args: {...rpcSellQuote, asset_amount: ''},
    error: 'ExpectedAssetAmountInRpcSellQuote',
  },
  {args: {...rpcSellQuote, expiry: 'x'}, error: 'ExpectedExpiryInRpcSellQuote'},
  {args: {...rpcSellQuote, id: null}, error: 'ExpectedQuoteIdInRpcSellQuote'},
  {
    args: {...rpcSellQuote, min_transportable_msat: '1.5'},
    error: 'ExpectedMinTransportableMsatInRpcSellQuote',
  },
  {
    args: {...rpcSellQuote, peer: ''},
    error: 'ExpectedPeerPublicKeyInRpcSellQuote',
  },
  {
    args: {...rpcSellQuote, bid_asset_rate: null},
    error: 'ExpectedBidAssetRateInRpcSellQuote',
  },
];

sellErrors.forEach(({args, error}) => {
  return test(`A sell quote error is ${error}`, () => {
    throws(() => rpcSellQuoteAsQuote(args), new Error(error));
  });
});

test('A buy quote is mapped', () => {
  deepStrictEqual(rpcBuyQuoteAsQuote(rpcBuyQuote), buyQuote);
});

test('A sell quote is mapped', () => {
  deepStrictEqual(rpcSellQuoteAsQuote(rpcSellQuote), sellQuote);
});

test('A buy quote with an accepted fill and metadata is mapped', () => {
  const quote = rpcBuyQuoteAsQuote({
    ...rpcBuyQuote,
    accepted_max_amount: '400',
    price_oracle_metadata: 'meta',
  });

  deepStrictEqual(quote.accepted_max_amount, '400');
  deepStrictEqual(quote.price_oracle_metadata, 'meta');
});
