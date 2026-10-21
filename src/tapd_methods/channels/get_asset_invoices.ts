import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isMethodUnsupported} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {assetChannelRpcError} from '../../tapd_responses/index.js';
import {rpcAssetInvoiceAsInvoice} from '../../tapd_responses/index.js';
import type {AssetInvoice} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const asEnd = (n?: string) => (!n ? 0 : Math.ceil(Date.parse(n) / 1e3));
const asStart = (n?: string) => (!n ? 0 : Math.floor(Date.parse(n) / 1e3));
const defaultLimit = 100;
const {isArray} = Array;
const isDate = (n: string) => Date.parse(n) > 0;
const {isSafeInteger} = Number;
const isString = (n: unknown) => typeof n === 'string';
const lastPageFirstIndexOffset = 1;
const method = 'listInvoices';
const {parse} = JSON;
const {stringify} = JSON;
const type = 'tapchannel';

export type GetAssetInvoicesArgs = AuthenticatedTapdArgs<{
  /** Created At or After ISO 8601 Date String */
  created_after?: string;
  /** Created At or Before ISO 8601 Date String */
  created_before?: string;
  /** Only Unconfirmed Invoices Bool */
  is_unconfirmed?: boolean;
  /** Page Result Limit Number */
  limit?: number;
  /** Opaque Paging Token String */
  token?: string;
}>;

export type GetAssetInvoicesResult = {
  invoices: AssetInvoice[];
  /** Next Opaque Paging Token */
  next?: string;
};

type Tasks = {
  getInvoices: {invoices: unknown[]; token?: string};
  invoices: GetAssetInvoicesResult;
  validate: undefined;
};

/** Get asset invoices, newest first

  lnd pages over all invoices, then tapd keeps only the asset invoices, so a
  page can have fewer invoices than the limit. Use `next` until it is empty.

  Requires `channels:read` permission

  This method needs tapd v0.8.1 or later

  The invoice fields are the same as in lightning getInvoices. `assets` has the
  asset units of settled HTLCs only, so an unpaid invoice has no `assets`.

  A `limit` and a `token` are not supported together. The default
  `limit` is 100.

  {
    [created_after]: <Created At or After ISO 8601 Date String>
    [created_before]: <Created At or Before ISO 8601 Date String>
    [is_unconfirmed]: <Only Unconfirmed Invoices Bool>
    [limit]: <Page Result Limit Number>
    tapd: <Authenticated tapd API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    invoices: [{
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      [chain_address]: <Fallback Chain Address String>
      cltv_delta: <Final CLTV Delta Number>
      [confirmed_at]: <Settled at ISO 8601 Date String>
      [confirmed_index]: <Confirmed Index Number>
      created_at: <ISO 8601 Date String>
      description: <Description String>
      [description_hash]: <Description Hash Hex String>
      expires_at: <ISO 8601 Date String>
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required To Pay Bool>
        type: <Feature Type String>
      }]
      id: <Payment Hash Hex String>
      index: <Invoice Add Index Number>
      [is_canceled]: <Invoice is Canceled Bool>
      is_confirmed: <Invoice is Confirmed Bool>
      [is_held]: <HTLC is Held Bool>
      is_private: <Invoice is Private Bool>
      [is_push]: <Invoice is Push Payment Bool>
      mtokens: <Millitokens String>
      [payment]: <Payment Identifying Secret Hex String>
      payments: [{
        [canceled_at]: <Payment Canceled At ISO 8601 Date String>
        [confirmed_at]: <Payment Settled At ISO 8601 Date String>
        created_at: <Payment Held Since ISO 8601 Date String>
        created_height: <Payment Held Since Block Height Number>
        in_channel: <Incoming Payment Through Channel Id String>
        is_canceled: <Payment is Canceled Bool>
        is_confirmed: <Payment is Confirmed Bool>
        is_held: <Payment is Held Bool>
        messages: [{
          type: <Message Type Number String>
          value: <Raw Value Hex String>
        }]
        mtokens: <Incoming Payment Millitokens String>
        [pending_index]: <Pending Payment Channel HTLC Index Number>
        timeout: <HTLC CLTV Timeout Height Number>
        tokens: <Payment Tokens Number>
        [total_mtokens]: <Total Millitokens String>
      }]
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      [request]: <Bolt 11 Invoice String>
      secret: <Secret Preimage Hex String>
      tokens: <Tokens Number>
    }]
    [next]: <Next Opaque Paging Token String>
  }
*/
const getAssetInvoices: TapdMethod<
  GetAssetInvoicesArgs,
  GetAssetInvoicesResult
> = (
  args: GetAssetInvoicesArgs,
  cbk?: TapdCallback<GetAssetInvoicesResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!!args.created_after && !isDate(args.created_after)) {
            return cbk([400, 'ExpectedCreatedAfterDateToGetAssetInvoices']);
          }

          if (!!args.created_before && !isDate(args.created_before)) {
            return cbk([400, 'ExpectedCreatedBeforeDateToGetAssetInvoices']);
          }

          const limit = args.limit;

          if (limit !== undefined && (!isSafeInteger(limit) || limit < 1)) {
            return cbk([400, 'ExpectedPositiveLimitToGetAssetInvoices']);
          }

          if (!!args.limit && !!args.token) {
            return cbk([400, 'UnexpectedLimitWhenPagingAssetInvoices']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetInvoices']);
          }

          return cbk();
        },

        // Get the page of invoices
        getInvoices: [
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
                return cbk([400, 'ExpectedValidPagingTokenForInvoices', {err}]);
              }

              const values = [after, before, limit, offset];

              if (!values.every(isSafeInteger) || limit < 1) {
                return cbk([400, 'ExpectedValidPagingTokenForInvoices']);
              }
            }

            const request = {
              request: {
                creation_date_end: before,
                creation_date_start: after,
                index_offset: offset,
                num_max_invoices: limit,
                pending_only: args.is_unconfirmed === true,
                reversed: true,
              },
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetInvoices']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetInvoices']);
              }

              if (isMethodUnsupported({err})) {
                return cbk([501, 'ExpectedNewerTapdToGetAssetInvoices']);
              }

              const knownError = assetChannelRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetInvoices', {err}]);
              }

              if (!res || !isArray(res.invoices)) {
                return cbk([503, 'ExpectedAssetInvoicesInListResponse']);
              }

              if (!isString(res.first_index_offset)) {
                return cbk([503, 'ExpectedFirstIndexOffsetInAssetInvoices']);
              }

              const nextOffset = Number(res.first_index_offset);

              const isLastPage = nextOffset <= lastPageFirstIndexOffset;

              return cbk(null, {
                invoices: res.invoices,
                token: isLastPage
                  ? undefined
                  : stringify({after, before, limit, offset: nextOffset}),
              });
            });
          },
        ],

        // Map the invoices
        invoices: [
          'getInvoices',
          ({getInvoices}, cbk) => {
            try {
              const invoices = getInvoices.invoices
                .map(n => rpcAssetInvoiceAsInvoice(n as any))
                .sort((a, b) => b.created_at.localeCompare(a.created_at));

              return cbk(null, {invoices, next: getInvoices.token});
            } catch (err: any) {
              return cbk([503, err.message]);
            }
          },
        ],
      },
      returnResult({reject, resolve, of: 'invoices'}, cbk),
    );
  });
};

export default getAssetInvoices;
