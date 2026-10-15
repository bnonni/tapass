import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcRfqEventAsEvent} from '../../src/tapd_responses/index.js';
import {buyQuote} from '../fixtures/rfq_wire.js';
import {overTheWireResponse} from '../fixtures/rfq_wire.js';
import {rpcBuyQuote} from '../fixtures/rfq_wire.js';
import {rpcSellQuote} from '../fixtures/rfq_wire.js';
import {sellQuote} from '../fixtures/rfq_wire.js';

const at = '2023-11-14T22:13:20.123Z';
const micros = '1700000000123456';

const event = (rpc: object) =>
  overTheWireResponse('SubscribeRfqEventNtfns', rpc);

test('An accepted buy quote event is mapped', () => {
  const rpc = event({
    peer_accepted_buy_quote: {
      peer_accepted_buy_quote: rpcBuyQuote,
      timestamp: micros,
    },
  });

  deepStrictEqual(rpcRfqEventAsEvent(rpc), {
    data: {at, ...buyQuote},
    event: 'accepted_buy_quote',
  });
});

test('An accepted sell quote event is mapped', () => {
  const rpc = event({
    peer_accepted_sell_quote: {
      peer_accepted_sell_quote: rpcSellQuote,
      timestamp: micros,
    },
  });

  deepStrictEqual(rpcRfqEventAsEvent(rpc), {
    data: {at, ...sellQuote},
    event: 'accepted_sell_quote',
  });
});

test('An accepted HTLC event is mapped', () => {
  const rpc = event({accept_htlc: {scid: '1099511693313', timestamp: micros}});

  deepStrictEqual(rpcRfqEventAsEvent(rpc), {
    data: {at, channel: '1x1x1'},
    event: 'accepted_htlc',
  });
});

test('Event errors are thrown', () => {
  throws(() => rpcRfqEventAsEvent(null), /ExpectedRpcRfqEvent/);
  throws(() => rpcRfqEventAsEvent({}), /ExpectedKnownEventTypeInRpcRfqEvent/);
  throws(
    () => rpcRfqEventAsEvent({accept_htlc: null, event: 'accept_htlc'}),
    /ExpectedTimestampInRpcAcceptHtlcEvent/,
  );
  throws(
    () =>
      rpcRfqEventAsEvent({
        event: 'peer_accepted_buy_quote',
        peer_accepted_buy_quote: {
          peer_accepted_buy_quote: null,
          timestamp: 'x',
        },
      }),
    /ExpectedTimestampInRpcAcceptedBuyQuoteEvent/,
  );
  throws(
    () =>
      rpcRfqEventAsEvent({
        event: 'peer_accepted_sell_quote',
        peer_accepted_sell_quote: null,
      }),
    /ExpectedTimestampInRpcAcceptedSellQuoteEvent/,
  );
});
