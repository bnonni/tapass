import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcBuyQuoteAsQuote} from '../../tapd_responses/index.js';
import {rpcSellQuoteAsQuote} from '../../tapd_responses/index.js';
import type {BuyQuote} from '../../tapd_responses/index.js';
import type {SellQuote} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {isArray} = Array;
const method = 'queryPeerAcceptedQuotes';
const type = 'rfq';

export type GetAcceptedQuotesArgs = AuthenticatedTapdArgs;

export type GetAcceptedQuotesResult = {
  buy_quotes: BuyQuote[];
  sell_quotes: SellQuote[];
};

type Tasks = {
  getQuotes: GetAcceptedQuotesResult;
  validate: undefined;
};

/** Get the quotes that peers accepted for the orders of this node

  Requires `rfq:read` permission

  A rate is a number of asset units per BTC, as an exact decimal string

  {
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    buy_quotes: [{
      [accepted_max_amount]: <Accepted Maximum Asset Units Numeric String>
      [asset_id]: <Asset Id Hex String>
      channel: <Channel To Pay Over Standard Format Channel Id String>
      expires_at: <Quote Expires At ISO 8601 Date String>
      [group_key]: <Asset Group BIP340 Public Key Hex String>
      id: <Quote Request Id Hex String>
      max_amount: <Maximum Asset Units Numeric String>
      min_transportable_amount: <Minimum Asset Units In One HTLC String>
      peer_public_key: <Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      rate: <Ask Rate Asset Units Per BTC Exact Decimal String>
    }]
    sell_quotes: [{
      [accepted_max_mtokens]: <Accepted Maximum Payment Millitokens String>
      amount: <Asset Units Numeric String>
      [asset_id]: <Asset Id Hex String>
      channel: <Channel To Pay Over Standard Format Channel Id String>
      expires_at: <Quote Expires At ISO 8601 Date String>
      [group_key]: <Asset Group BIP340 Public Key Hex String>
      id: <Quote Request Id Hex String>
      min_transportable_mtokens: <Minimum Millitokens To Send One Unit String>
      peer_public_key: <Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      rate: <Bid Rate Asset Units Per BTC Exact Decimal String>
    }]
  }
*/
const getAcceptedQuotes: TapdMethod<
  GetAcceptedQuotesArgs,
  GetAcceptedQuotesResult
> = (
  args: GetAcceptedQuotesArgs,
  cbk?: TapdCallback<GetAcceptedQuotesResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAcceptedQuotes']);
          }

          return cbk();
        },

        // Get the accepted quotes
        getQuotes: [
          'validate',
          ({}, cbk) => {
            return args.tapd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAcceptedQuotes']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAcceptedQuotes']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorGettingAcceptedQuotes',
                  {err},
                ]);
              }

              if (
                !res ||
                !isArray(res.buy_quotes) ||
                !isArray(res.sell_quotes)
              ) {
                return cbk([503, 'ExpectedQuotesInAcceptedQuotesResponse']);
              }

              try {
                return cbk(null, {
                  buy_quotes: res.buy_quotes.map(rpcBuyQuoteAsQuote),
                  sell_quotes: res.sell_quotes.map(rpcSellQuoteAsQuote),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getQuotes'}, cbk),
    );
  });
};

export default getAcceptedQuotes;
