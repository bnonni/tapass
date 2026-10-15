import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcAddrAsAddress} from '../../tapd_responses/index.js';
import type {Address} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const asSeconds = (n?: string) => (!n ? 0 : Math.floor(Date.parse(n) / 1e3));
const defaultLimit = 100;
const {isArray} = Array;
const isDate = (n: string) => Date.parse(n) > 0;
const {isSafeInteger} = Number;
const maxLimit = 2147483647;
const method = 'queryAddrs';
const {parse} = JSON;
const {stringify} = JSON;
const type = 'default';

export type GetAssetAddressesArgs = AuthenticatedTapdArgs<{
  /** Created After ISO 8601 Date String */
  created_after?: string;
  /** Created Before ISO 8601 Date String */
  created_before?: string;
  /** Page Result Limit Number */
  limit?: number;
  /** Opaque Paging Token String */
  token?: string;
}>;

export type GetAssetAddressesResult = {
  addresses: Address[];
  /** Next Opaque Paging Token */
  next?: string;
};

type Tasks = {
  getAddresses: GetAssetAddressesResult;
  validate: undefined;
};

/** Get the Taproot Assets addresses that this node created, oldest first

  Requires `addresses:read` permission

  Use the `next` token with the same filters to get the next page

  {
    [created_after]: <Created After ISO 8601 Date String>
    [created_before]: <Created Before ISO 8601 Date String>
    [limit]: <Page Result Limit Number>
    tapd: <Authenticated tapd API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    addresses: [{
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
    }]
    [next]: <Next Opaque Paging Token String>
  }
*/
const getAssetAddresses: TapdMethod<
  GetAssetAddressesArgs,
  GetAssetAddressesResult
> = (
  args: GetAssetAddressesArgs,
  cbk?: TapdCallback<GetAssetAddressesResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const after = args.created_after;
          const before = args.created_before;

          if (after !== undefined && !isDate(after)) {
            return cbk([400, 'ExpectedValidCreatedAfterDateToGetAddresses']);
          }

          if (before !== undefined && !isDate(before)) {
            return cbk([400, 'ExpectedValidCreatedBeforeDateToGetAddresses']);
          }

          if (args.limit !== undefined && !isSafeInteger(args.limit)) {
            return cbk([400, 'ExpectedIntegerLimitToGetAssetAddresses']);
          }

          if (args.limit !== undefined && args.limit < 1) {
            return cbk([400, 'ExpectedPositiveLimitToGetAssetAddresses']);
          }

          if (args.limit !== undefined && args.limit > maxLimit) {
            return cbk([400, 'ExpectedSmallerLimitToGetAssetAddresses']);
          }

          if (!!args.limit && !!args.token) {
            return cbk([400, 'UnexpectedLimitWhenPagingAddressesWithToken']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetAddresses']);
          }

          return cbk();
        },

        // Get the addresses
        getAddresses: [
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
                  'ExpectedValidPagingTokenToGetAddresses',
                  {err},
                ]);
              }

              if (!isSafeInteger(limit) || limit < 1 || limit > maxLimit) {
                return cbk([400, 'ExpectedValidPagingTokenToGetAddresses']);
              }

              if (!isSafeInteger(offset) || offset < 0 || offset > maxLimit) {
                return cbk([400, 'ExpectedValidPagingTokenToGetAddresses']);
              }
            }

            const request = {
              created_after: asSeconds(args.created_after),
              created_before: asSeconds(args.created_before),
              limit,
              offset,
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetAddresses']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetAddresses']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorGettingAssetAddresses',
                  {err},
                ]);
              }

              if (!res || !isArray(res.addrs)) {
                return cbk([
                  503,
                  'ExpectedArrayOfAddressesInAddressesResponse',
                ]);
              }

              try {
                const addresses = res.addrs.map(rpcAddrAsAddress);

                // A full page means that there can be more results
                const isFullPage = addresses.length === limit;

                const next = stringify({limit, offset: offset + limit});

                return cbk(null, {
                  addresses,
                  next: isFullPage ? next : undefined,
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getAddresses'}, cbk),
    );
  });
};

export default getAssetAddresses;
