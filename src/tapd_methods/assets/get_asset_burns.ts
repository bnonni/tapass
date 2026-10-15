import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcAssetBurnAsBurn} from '../../tapd_responses/index.js';
import type {Burn} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {from} = Buffer;
const internalOrder = (n?: string) => from(n || '', 'hex').reverse();
const {isArray} = Array;
const isGroupKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const isHash = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const method = 'listBurns';
const type = 'default';

export type GetAssetBurnsArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Burn Anchor Transaction Id Hex String */
  transaction_id?: string;
}>;

export type GetAssetBurnsResult = {
  burns: Burn[];
};

type Tasks = {
  getBurns: GetAssetBurnsResult;
  validate: undefined;
};

/** Get the asset burns that this node made

  Requires `assets:read` permission

  {
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    tapd: <Authenticated tapd API Object>
    [transaction_id]: <Burn Anchor Transaction Id Hex String>
  }

  @returns via cbk or Promise
  {
    burns: [{
      amount: <Burned Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      is_collectible: <Asset Is Collectible Bool>
      [note]: <Burn Note String>
      transaction_id: <Burn Anchor Transaction Id Hex String>
    }]
  }
*/
const getAssetBurns: TapdMethod<GetAssetBurnsArgs, GetAssetBurnsResult> = (
  args: GetAssetBurnsArgs,
  cbk?: TapdCallback<GetAssetBurnsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (args.asset_id !== undefined && !isHash(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToGetAssetBurns']);
          }

          if (args.group_key !== undefined && !isGroupKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToGetAssetBurns']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetBurns']);
          }

          if (!!args.transaction_id && !isHash(args.transaction_id)) {
            return cbk([400, 'ExpectedTransactionIdHexToGetAssetBurns']);
          }

          return cbk();
        },

        // Get the burns
        getBurns: [
          'validate',
          ({}, cbk) => {
            // tapd compares the anchor transaction id in internal byte order
            const request = {
              anchor_txid: internalOrder(args.transaction_id),
              asset_id: from(args.asset_id || '', 'hex'),
              tweaked_group_key: from(args.group_key || '', 'hex'),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetBurns']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetBurns']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetBurns', {err}]);
              }

              if (!res || !isArray(res.burns)) {
                return cbk([503, 'ExpectedArrayOfBurnsInAssetBurnsResponse']);
              }

              try {
                return cbk(null, {burns: res.burns.map(rpcAssetBurnAsBurn)});
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getBurns'}, cbk),
    );
  });
};

export default getAssetBurns;
