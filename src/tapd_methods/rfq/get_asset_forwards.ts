import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isMethodUnsupported} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcForwardAsAssetForward} from '../../tapd_responses/index.js';
import type {AssetForward} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const asSeconds = (n?: string) => (!n ? 0 : Math.floor(Date.parse(n) / 1e3));
const defaultLimit = 100;
const {from} = Buffer;
const groupKeyError = 'error parsing group key';
const {isArray} = Array;
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isDate = (n: string) => Date.parse(n) > 0;
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const {isSafeInteger} = Number;
const maxLimit = 2147483647;
const method = 'forwardingHistory';
const {parse} = JSON;
const {stringify} = JSON;
const type = 'rfq';

export type GetAssetForwardsArgs = AuthenticatedTapdArgs<{
  /** Settled At Or After ISO 8601 Date String */
  after?: string;
  /** Asset Id Hex String */
  asset_id?: string;
  /** Settled At Or Before ISO 8601 Date String */
  before?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Page Result Limit Number */
  limit?: number;
  /** Peer Public Key Hex String */
  peer_public_key?: string;
  /** Opaque Paging Token String */
  token?: string;
}>;

export type GetAssetForwardsResult = {
  forwards: AssetForward[];
  /** Next Opaque Paging Token */
  next?: string;
};

type Tasks = {
  getForwards: GetAssetForwardsResult;
  validate: undefined;
};

/** Get the asset swaps that this edge node forwarded

  Requires `rfq:read` permission

  This method needs tapd v0.8.0 or later

  Use the `next` token with the same filters to get the next page

  A rate is a number of asset units per BTC, as an exact decimal string

  {
    [after]: <Settled At Or After ISO 8601 Date String>
    [asset_id]: <Asset Id Hex String>
    [before]: <Settled At Or Before ISO 8601 Date String>
    [group_key]: <Asset Group Key Hex String>
    [limit]: <Page Result Limit Number>
    [peer_public_key]: <Peer Public Key Hex String>
    tapd: <Authenticated tapd API Object>
    [token]: <Opaque Paging Token String>
  }

  @returns via cbk or Promise
  {
    forwards: [{
      amount: <Swapped Asset Units Numeric String>
      [asset_id]: <Asset Id Hex String>
      [failed_at]: <Forward Failed At ISO 8601 Date String>
      [group_key]: <Asset Group BIP340 Public Key Hex String>
      htlc_index: <Incoming HTLC Index Numeric String>
      incoming_channel: <Incoming Standard Format Channel Id String>
      incoming_mtokens: <Received Millitokens String>
      opened_at: <Forward Started At ISO 8601 Date String>
      outgoing_channel: <Outgoing Standard Format Channel Id String>
      outgoing_mtokens: <Sent Millitokens String>
      [peer_public_key]: <Peer Public Key Hex String>
      [rate]: <Rate Asset Units Per BTC Exact Decimal String>
      rfq_id: <RFQ Session Id Hex String>
      [settled_at]: <Forward Settled At ISO 8601 Date String>
      type: <Edge Node Policy Type String> // purchase, sale
    }]
    [next]: <Next Opaque Paging Token String>
  }
*/
const getAssetForwards: TapdMethod<
  GetAssetForwardsArgs,
  GetAssetForwardsResult
> = (
  args: GetAssetForwardsArgs,
  cbk?: TapdCallback<GetAssetForwardsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (args.after !== undefined && !isDate(args.after)) {
            return cbk([400, 'ExpectedValidAfterDateToGetAssetForwards']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'UnexpectedAssetIdAndGroupKeyForAssetForwards']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToGetAssetForwards']);
          }

          if (args.before !== undefined && !isDate(args.before)) {
            return cbk([400, 'ExpectedValidBeforeDateToGetAssetForwards']);
          }

          if (!!args.group_key && !isPublicKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToGetAssetForwards']);
          }

          const {limit} = args;

          if (limit !== undefined && !isSafeInteger(limit)) {
            return cbk([400, 'ExpectedIntegerLimitToGetAssetForwards']);
          }

          if (limit !== undefined && (limit < 1 || limit > maxLimit)) {
            return cbk([400, 'ExpectedPositiveLimitToGetAssetForwards']);
          }

          if (!!limit && !!args.token) {
            return cbk([400, 'UnexpectedLimitWhenPagingAssetForwards']);
          }

          const peer = args.peer_public_key;

          if (peer !== undefined && !isPublicKey(peer)) {
            return cbk([400, 'ExpectedPeerPublicKeyToGetAssetForwards']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetForwards']);
          }

          return cbk();
        },

        // Get the forwards
        getForwards: [
          'validate',
          ({}, cbk) => {
            let limit = args.limit || defaultLimit;
            let offset = 0;

            if (!!args.token) {
              try {
                const pagingToken = parse(args.token);

                limit = pagingToken.limit;
                offset = pagingToken.offset;
              } catch (err) {
                return cbk([400, 'ExpectedValidPagingTokenForForwards', {err}]);
              }

              if (!isSafeInteger(limit) || limit < 1 || limit > maxLimit) {
                return cbk([400, 'ExpectedValidPagingTokenForForwards']);
              }

              if (!isSafeInteger(offset) || offset < 0 || offset > maxLimit) {
                return cbk([400, 'ExpectedValidPagingTokenForForwards']);
              }
            }

            const hasAsset = !!args.asset_id || !!args.group_key;

            const request = {
              asset_specifier: !hasAsset
                ? undefined
                : !!args.asset_id
                  ? {asset_id: from(args.asset_id, 'hex')}
                  : {group_key: from(args.group_key || '', 'hex')},
              limit,
              max_timestamp: String(asSeconds(args.before)),
              min_timestamp: String(asSeconds(args.after)),
              offset,
              peer: !!args.peer_public_key
                ? from(args.peer_public_key, 'hex')
                : undefined,
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetForwards']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetForwards']);
              }

              if (!!err && String(err.details).includes(groupKeyError)) {
                return cbk([400, 'ExpectedValidGroupKeyToGetAssetForwards']);
              }

              if (isMethodUnsupported({err})) {
                return cbk([501, 'GetAssetForwardsMethodNotSupported']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetForwards', {err}]);
              }

              if (!res || !isArray(res.forwards)) {
                return cbk([503, 'ExpectedForwardsInAssetForwardsResponse']);
              }

              if (!isNumeric(res.total_count)) {
                return cbk([503, 'ExpectedTotalCountInAssetForwardsResponse']);
              }

              try {
                const forwards = res.forwards.map(rpcForwardAsAssetForward);

                const end = offset + forwards.length;

                const isLastPage =
                  !forwards.length || end >= Number(res.total_count);

                return cbk(null, {
                  forwards,
                  next: isLastPage
                    ? undefined
                    : stringify({limit, offset: end}),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getForwards'}, cbk),
    );
  });
};

export default getAssetForwards;
