import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAcceptedQuotes} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {buyQuote} from '../../fixtures/rfq_wire.js';
import {overTheWireResponse} from '../../fixtures/rfq_wire.js';
import {rpcBuyQuote} from '../../fixtures/rfq_wire.js';
import {rpcSellQuote} from '../../fixtures/rfq_wire.js';
import {sellQuote} from '../../fixtures/rfq_wire.js';

const tapdWith = (
  queryPeerAcceptedQuotes: (req: any, cbk: Function) => void,
) => {
  return {rfq: {queryPeerAcceptedQuotes}} as unknown as AuthenticatedTapd;
};

const quotes = overTheWireResponse('QueryPeerAcceptedQuotes', {
  buy_quotes: [rpcBuyQuote],
  sell_quotes: [rpcSellQuote],
});

// A real tapd response from a Polar node with no quotes
const empty = overTheWireResponse('QueryPeerAcceptedQuotes', {});

const tests = [
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAcceptedQuotes'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAcceptedQuotes'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAcceptedQuotes'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAcceptedQuotes', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {buy_quotes: []}))},
    description: 'Quotes are expected',
    error: [503, 'ExpectedQuotesInAcceptedQuotesResponse'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) =>
        cbk(null, {buy_quotes: [{}], sell_quotes: []}),
      ),
    },
    description: 'Valid quotes are expected',
    error: [503, 'ExpectedMaxAmountInRpcBuyQuote'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, empty))},
    description: 'No quotes are returned',
    expected: {buy_quotes: [], sell_quotes: []},
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, quotes))},
    description: 'Quotes are returned',
    expected: {buy_quotes: [buyQuote], sell_quotes: [sellQuote]},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getAcceptedQuotes(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getAcceptedQuotes(args), expected, 'Got quotes');
    }

    return;
  });
});
