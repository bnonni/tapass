import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isMethodUnsupported} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {assetChannelRpcError} from '../../tapd_responses/index.js';
import {rpcAssetPaymentAsPayment} from '../../tapd_responses/index.js';
import type {AssetPayment} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const asEnd = (n?: string) => (!n ? 0 : Math.ceil(Date.parse(n) / 1e3));
const asStart = (n?: string) => (!n ? 0 : Math.floor(Date.parse(n) / 1e3));
const defaultLimit = 250;
const {isArray} = Array;
const isDate = (n: string) => Date.parse(n) > 0;
const {isSafeInteger} = Number;
const isString = (n: unknown) => typeof n === 'string';
const lastPageFirstIndexOffset = 1;
const method = 'listPayments';
const {parse} = JSON;
const {stringify} = JSON;
const type = 'tapchannel';

export type GetAssetPaymentsArgs = AuthenticatedTapdArgs<{
  /** Created At or After ISO 8601 Date String */
  created_after?: string;
  /** Created At or Before ISO 8601 Date String */
  created_before?: string;
  /** Page Result Limit Number */
  limit?: number;
  /** Opaque Paging Token String */
  token?: string;
}>;

export type GetAssetPaymentsResult = {
  payments: AssetPayment[];
  /** Next Opaque Paging Token */
  next?: string;
};

type Tasks = {
  getPayments: {payments: unknown[]; token?: string};
  payments: GetAssetPaymentsResult;
  validate: undefined;
};

/** Get confirmed payments that sent an asset, newest first

  lnd pages over all payments, then tapd keeps only the asset payments, so a
  page can have fewer payments than the limit. Use `next` until it is empty.

  Requires `channels:read` permission

  This method needs tapd v0.8.1 or later

  The payment fields are the same as in lightning getPayments

  A `limit` and a `token` are not supported together. The default
  `limit` is 250.

  {
    [created_after]: <Created At or After ISO 8601 Date String>
    [created_before]: <Created At or Before ISO 8601 Date String>
    [limit]: <Page Result Limit Number>
    tapd: <Authenticated tapd API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    payments: [{
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      attempts: [{
        [confirmed_at]: <Payment Attempt Succeeded At ISO 8601 Date String>
        created_at: <Attempt Was Started At ISO 8601 Date String>
        [failed_at]: <Payment Attempt Failed At ISO 8601 Date String>
        is_confirmed: <Payment Attempt Succeeded Bool>
        is_failed: <Payment Attempt Failed Bool>
        is_pending: <Payment Attempt is Waiting For Resolution Bool>
        route: {
          fee: <Route Fee Tokens Number>
          fee_mtokens: <Route Fee Millitokens String>
          hops: [{
            channel: <Standard Format Channel Id String>
            fee: <Fee Tokens Rounded Down Number>
            fee_mtokens: <Fee Millitokens String>
            forward: <Forward Tokens Number>
            forward_mtokens: <Forward Millitokens String>
            public_key: <Forward Edge Public Key Hex String>
            [timeout]: <Timeout Block Height Number>
          }]
          mtokens: <Total Fee-Inclusive Millitokens String>
          [payment]: <Payment Identifier Hex String>
          [timeout]: <Timeout Block Height Number>
          tokens: <Total Fee-Inclusive Tokens Number>
          [total_mtokens]: <Total Payment Millitokens String>
        }
      }]
      [confirmed_at]: <Payment Confirmed At ISO 8601 Date String>
      created_at: <Payment at ISO-8601 Date String>
      [destination]: <Destination Node Public Key Hex String>
      [fee]: <Paid Routing Fee Rounded Down Tokens Number>
      [fee_mtokens]: <Paid Routing Fee in Millitokens String>
      hops: [<First Route Hop Public Key Hex String>]
      id: <Payment Preimage Hash String>
      [index]: <Payment Add Index Number>
      is_confirmed: <Payment is Confirmed Bool>
      is_outgoing: <Transaction Is Outgoing Bool>
      mtokens: <Millitokens Sent to Destination String>
      [request]: <BOLT 11 Payment Request String>
      [safe_fee]: <Payment Forwarding Fee Rounded Up Tokens Number>
      safe_tokens: <Payment Tokens Rounded Up Number>
      [secret]: <Payment Preimage Hex String>
      tokens: <Rounded Down Tokens Sent to Destination Number>
    }]
    [next]: <Next Opaque Paging Token String>
  }
*/
const getAssetPayments: TapdMethod<
  GetAssetPaymentsArgs,
  GetAssetPaymentsResult
> = (
  args: GetAssetPaymentsArgs,
  cbk?: TapdCallback<GetAssetPaymentsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!!args.created_after && !isDate(args.created_after)) {
            return cbk([400, 'ExpectedCreatedAfterDateToGetAssetPayments']);
          }

          if (!!args.created_before && !isDate(args.created_before)) {
            return cbk([400, 'ExpectedCreatedBeforeDateToGetAssetPayments']);
          }

          const limit = args.limit;

          if (limit !== undefined && (!isSafeInteger(limit) || limit < 1)) {
            return cbk([400, 'ExpectedPositiveLimitToGetAssetPayments']);
          }

          if (!!args.limit && !!args.token) {
            return cbk([400, 'UnexpectedLimitWhenPagingAssetPayments']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetPayments']);
          }

          return cbk();
        },

        // Get the page of payments
        getPayments: [
          'validate',
          ({}, cbk) => {
            let after = asStart(args.created_after);
            let before = asEnd(args.created_before);
            let limit = args.limit || defaultLimit;
            let offset = 0;

            // When there is a token, the token has the page details
            if (!!args.token) {
              try {
                const pagingToken = parse(args.token);

                after = pagingToken.after;
                before = pagingToken.before;
                limit = pagingToken.limit;
                offset = pagingToken.offset;
              } catch (err) {
                return cbk([400, 'ExpectedValidPagingTokenForPayments', {err}]);
              }

              const values = [after, before, limit, offset];

              if (!values.every(isSafeInteger) || limit < 1) {
                return cbk([400, 'ExpectedValidPagingTokenForPayments']);
              }
            }

            const request = {
              request: {
                creation_date_end: before,
                creation_date_start: after,
                include_incomplete: false,
                index_offset: offset,
                max_payments: limit,
                reversed: true,
              },
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetPayments']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetPayments']);
              }

              if (isMethodUnsupported({err})) {
                return cbk([501, 'ExpectedNewerTapdToGetAssetPayments']);
              }

              const knownError = assetChannelRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetPayments', {err}]);
              }

              if (!res || !isArray(res.payments)) {
                return cbk([503, 'ExpectedAssetPaymentsInListResponse']);
              }

              if (!isString(res.first_index_offset)) {
                return cbk([503, 'ExpectedFirstIndexOffsetInAssetPayments']);
              }

              const nextOffset = Number(res.first_index_offset);

              const isLastPage = nextOffset <= lastPageFirstIndexOffset;

              return cbk(null, {
                payments: res.payments,
                token: isLastPage
                  ? undefined
                  : stringify({after, before, limit, offset: nextOffset}),
              });
            });
          },
        ],

        // Map the payments
        payments: [
          'getPayments',
          ({getPayments}, cbk) => {
            try {
              const payments = getPayments.payments
                .map(n => rpcAssetPaymentAsPayment(n as any))
                .sort((a, b) => b.created_at.localeCompare(a.created_at));

              return cbk(null, {payments, next: getPayments.token});
            } catch (err: any) {
              return cbk([503, err.message]);
            }
          },
        ],
      },
      returnResult({reject, resolve, of: 'payments'}, cbk),
    );
  });
};

export default getAssetPayments;
