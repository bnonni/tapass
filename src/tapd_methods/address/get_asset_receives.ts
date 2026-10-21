import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {receiveStatuses} from '../../tapd_responses/index.js';
import {rpcAddrEventAsReceive} from '../../tapd_responses/index.js';
import type {Receive} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const asSeconds = (n?: string) => (!n ? 0 : Math.floor(Date.parse(n) / 1e3));
const defaultLimit = 100;
const {entries} = Object;
const invalidAddressError = 'unable to decode addr';
const {isArray} = Array;
const isDate = (n: string) => Date.parse(n) > 0;
const {isSafeInteger} = Number;
const maxLimit = 16384;
const maxOffset = 2147483647;
const method = 'addrReceives';
const newestFirst = 'SORT_DIRECTION_DESC';
const noStatusFilter = 'ADDR_EVENT_STATUS_UNKNOWN';
const {parse} = JSON;
const {stringify} = JSON;
const type = 'default';
const unknownAssetError = 'unknown asset=';

// Address event statuses by receive status type
const statuses = Object.fromEntries(
  entries(receiveStatuses)
    .filter(([status]) => status !== noStatusFilter)
    .map(([status, statusType]) => [statusType, status]),
);

export type GetAssetReceivesArgs = AuthenticatedTapdArgs<{
  /** Encoded Taproot Assets Address String */
  address?: string;
  /** Created After ISO 8601 Date String */
  created_after?: string;
  /** Created Before ISO 8601 Date String */
  created_before?: string;
  /** Page Result Limit Number */
  limit?: number;
  /** Receive Status String */
  status?:
    | 'completed'
    | 'proof_received'
    | 'transaction_confirmed'
    | 'transaction_detected';
  /** Opaque Paging Token String */
  token?: string;
}>;

export type GetAssetReceivesResult = {
  /** Next Opaque Paging Token */
  next?: string;
  receives: Receive[];
};

type Tasks = {
  getReceives: GetAssetReceivesResult;
  validate: undefined;
};

/** Get the inbound asset transfers to Taproot Assets addresses, newest first

  Requires `addresses:read` permission

  Use the `next` token with the same filters to get the next page

  A `limit` and a `token` are not supported together. The maximum
  `limit` is 16384.

  Paging and the newest first order need tapd v0.8.0 or later

  {
    [address]: <Encoded Taproot Assets Address String>
    [created_after]: <Created After ISO 8601 Date String>
    [created_before]: <Created Before ISO 8601 Date String>
    [limit]: <Page Result Limit Number>
    [status]: <Receive Status String> // completed, proof_received,
                                      // transaction_confirmed,
                                      // transaction_detected
    tapd: <Authenticated tapd API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    [next]: <Next Opaque Paging Token String>
    receives: [{
      address: {
        address: <Encoded Taproot Assets Address String>
        amount: <Asset Units To Receive Numeric String>
        [asset_id]: <Asset Id Hex String>
        asset_version: <Asset Version Number>
        [group_key]: <Asset Group Key Hex String>
        internal_key: <Internal Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        proof_courier: <Proof Courier Address String>
        script_key: <Script Key Hex String>
        [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
        taproot_output_key: <Taproot Output Key Hex String>
        version: <Address Version Number>
      }
      [confirmation_height]: <Confirmation Block Height Number>
      created_at: <Receive Detected At ISO 8601 Date String>
      is_proof_available: <Proof File Is Available Bool>
      status: <Receive Status String>
      [tapscript_sibling]: <Tapscript Sibling Hash Hex String>
      tokens: <Satoshis In the Anchor Output Number>
      transaction_id: <Anchor Transaction Id Hex String>
      transaction_vout: <Anchor Transaction Output Index Number>
    }]
  }
*/
const getAssetReceives: TapdMethod<
  GetAssetReceivesArgs,
  GetAssetReceivesResult
> = (
  args: GetAssetReceivesArgs,
  cbk?: TapdCallback<GetAssetReceivesResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const after = args.created_after;
          const before = args.created_before;

          if (args.address !== undefined && typeof args.address !== 'string') {
            return cbk([400, 'ExpectedAssetAddressStringToGetAssetReceives']);
          }

          if (after !== undefined && !isDate(after)) {
            return cbk([400, 'ExpectedValidCreatedAfterDateToGetReceives']);
          }

          if (before !== undefined && !isDate(before)) {
            return cbk([400, 'ExpectedValidCreatedBeforeDateToGetReceives']);
          }

          if (args.limit !== undefined && !isSafeInteger(args.limit)) {
            return cbk([400, 'ExpectedIntegerLimitToGetAssetReceives']);
          }

          if (args.limit !== undefined && args.limit < 1) {
            return cbk([400, 'ExpectedPositiveLimitToGetAssetReceives']);
          }

          if (args.limit !== undefined && args.limit > maxLimit) {
            return cbk([400, 'ExpectedSmallerLimitToGetAssetReceives']);
          }

          if (!!args.limit && !!args.token) {
            return cbk([400, 'UnexpectedLimitWhenPagingReceivesWithToken']);
          }

          if (args.status !== undefined && !statuses[args.status]) {
            return cbk([400, 'ExpectedKnownStatusToGetAssetReceives']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetReceives']);
          }

          return cbk();
        },

        // Get the receives
        getReceives: [
          'validate',
          ({}, cbk) => {
            let limit = args.limit || defaultLimit;
            let offset = 0;

            // tapd reads the offset as a row offset in the results
            if (!!args.token) {
              try {
                const pagingToken = parse(args.token);

                limit = pagingToken.limit;
                offset = pagingToken.offset;
              } catch (err) {
                return cbk([
                  400,
                  'ExpectedValidPagingTokenToGetReceives',
                  {err},
                ]);
              }

              if (!isSafeInteger(limit) || limit < 1 || limit > maxLimit) {
                return cbk([400, 'ExpectedValidPagingTokenToGetReceives']);
              }

              if (!isSafeInteger(offset) || offset < 0 || offset > maxOffset) {
                return cbk([400, 'ExpectedValidPagingTokenToGetReceives']);
              }
            }

            const request = {
              direction: newestFirst,
              end_timestamp: asSeconds(args.created_before),
              filter_addr: args.address || '',
              filter_status: !!args.status
                ? statuses[args.status]
                : noStatusFilter,
              limit,
              offset,
              start_timestamp: asSeconds(args.created_after),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetReceives']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetReceives']);
              }

              if (!!err && String(err.details).includes(invalidAddressError)) {
                return cbk([400, 'ExpectedValidAssetAddressToGetReceives']);
              }

              if (!!err && String(err.details).includes(unknownAssetError)) {
                return cbk([404, 'AssetNotFound']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetReceives', {err}]);
              }

              if (!res || !isArray(res.events)) {
                return cbk([
                  503,
                  'ExpectedArrayOfEventsInAddrReceivesResponse',
                ]);
              }

              try {
                const receives = res.events.map(rpcAddrEventAsReceive);

                // A full page means that there can be more results
                const isFullPage = receives.length === limit;

                const next = stringify({limit, offset: offset + limit});

                return cbk(null, {
                  next: isFullPage ? next : undefined,
                  receives,
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getReceives'}, cbk),
    );
  });
};

export default getAssetReceives;
