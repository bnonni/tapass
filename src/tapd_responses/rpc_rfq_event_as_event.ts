import rpcBuyQuoteAsQuote from './rpc_buy_quote_as_quote.js';
import type {BuyQuote} from './rpc_buy_quote_as_quote.js';
import type {RpcBuyQuote} from './rpc_buy_quote_as_quote.js';
import rpcSellQuoteAsQuote from './rpc_sell_quote_as_quote.js';
import type {RpcSellQuote} from './rpc_sell_quote_as_quote.js';
import type {SellQuote} from './rpc_sell_quote_as_quote.js';
import shortChannelIdAsChannel from './short_channel_id_as_channel.js';

const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const microsecondsPerMs = BigInt(1e3);

/** ISO 8601 date from a unix timestamp in microseconds */
const dateFromMicros = (n: string) => {
  return new Date(Number(BigInt(n) / microsecondsPerMs)).toISOString();
};

export type RpcRfqEvent = {
  accept_htlc?: {scid: string; timestamp: string} | null;
  event?: string;
  peer_accepted_buy_quote?: {
    peer_accepted_buy_quote: RpcBuyQuote | null;
    timestamp: string;
  } | null;
  peer_accepted_sell_quote?: {
    peer_accepted_sell_quote: RpcSellQuote | null;
    timestamp: string;
  } | null;
};

export type RfqEvent =
  | {data: BuyQuote & {at: string}; event: 'accepted_buy_quote'}
  | {data: SellQuote & {at: string}; event: 'accepted_sell_quote'}
  | {data: {at: string; channel: string}; event: 'accepted_htlc'};

/** Event from an RPC RFQ event

  {
    [accept_htlc]: {
      scid: <Short Channel Id Numeric String>
      timestamp: <Unix Microseconds Numeric String>
    }
    event: <Set Event Name String>
    [peer_accepted_buy_quote]: {
      peer_accepted_buy_quote: <RPC Peer Accepted Buy Quote Object>
      timestamp: <Unix Microseconds Numeric String>
    }
    [peer_accepted_sell_quote]: {
      peer_accepted_sell_quote: <RPC Peer Accepted Sell Quote Object>
      timestamp: <Unix Microseconds Numeric String>
    }
  }

  @throws
  <Error>

  @returns
  {
    data: {
      at: <Event At ISO 8601 Date String>
      ...<Buy Quote, Sell Quote, or Channel Object>
    }
    event: <Event Name String> // accepted_buy_quote, accepted_sell_quote,
                               // accepted_htlc
  }
*/
export default (event?: RpcRfqEvent | null): RfqEvent => {
  if (!event) {
    throw new Error('ExpectedRpcRfqEvent');
  }

  switch (event.event) {
    case 'accept_htlc': {
      const htlc = event.accept_htlc;

      if (!htlc || !isNumeric(htlc.timestamp)) {
        throw new Error('ExpectedTimestampInRpcAcceptHtlcEvent');
      }

      return {
        data: {
          at: dateFromMicros(htlc.timestamp),
          channel: shortChannelIdAsChannel(htlc.scid),
        },
        event: 'accepted_htlc',
      };
    }

    case 'peer_accepted_buy_quote': {
      const accepted = event.peer_accepted_buy_quote;

      if (!accepted || !isNumeric(accepted.timestamp)) {
        throw new Error('ExpectedTimestampInRpcAcceptedBuyQuoteEvent');
      }

      return {
        data: {
          at: dateFromMicros(accepted.timestamp),
          ...rpcBuyQuoteAsQuote(accepted.peer_accepted_buy_quote),
        },
        event: 'accepted_buy_quote',
      };
    }

    case 'peer_accepted_sell_quote': {
      const accepted = event.peer_accepted_sell_quote;

      if (!accepted || !isNumeric(accepted.timestamp)) {
        throw new Error('ExpectedTimestampInRpcAcceptedSellQuoteEvent');
      }

      return {
        data: {
          at: dateFromMicros(accepted.timestamp),
          ...rpcSellQuoteAsQuote(accepted.peer_accepted_sell_quote),
        },
        event: 'accepted_sell_quote',
      };
    }

    default:
      throw new Error('ExpectedKnownEventTypeInRpcRfqEvent');
  }
};
