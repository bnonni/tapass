import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {from} = Buffer;
const groupKeyError = 'error parsing group key';
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPositive = (n: string) => isNumeric(n) && BigInt(n) > BigInt(0);
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const method = 'addAssetSellOffer';
const type = 'rfq';

export type AddAssetSellOfferArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Maximum Asset Units To Sell Numeric String */
  max_amount: string;
}>;

type Tasks = {
  addOffer: undefined;
  validate: undefined;
};

/** Add or update an offer to sell an asset

  tapd uses sell offers to accept or reject the buy quote requests of peers

  Requires `rfq:write` permission

  An `asset_id` or a `group_key` is required, but not both

  {
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    max_amount: <Maximum Asset Units To Sell Numeric String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
*/
const addAssetSellOffer: TapdMethod<AddAssetSellOfferArgs, void> = (
  args: AddAssetSellOfferArgs,
  cbk?: TapdCallback<void>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.asset_id && !args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyToAddAssetSellOffer']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'UnexpectedAssetIdAndGroupKeyForAssetSellOffer']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToAddAssetSellOffer']);
          }

          if (!!args.group_key && !isPublicKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToAddAssetSellOffer']);
          }

          if (!isPositive(args.max_amount)) {
            return cbk([400, 'ExpectedMaxAmountToAddAssetSellOffer']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToAddAssetSellOffer']);
          }

          return cbk();
        },

        // Add the sell offer
        addOffer: [
          'validate',
          ({}, cbk) => {
            const request = {
              asset_specifier: !!args.asset_id
                ? {asset_id: from(args.asset_id, 'hex')}
                : {group_key: from(args.group_key || '', 'hex')},
              max_units: args.max_amount,
            };

            return args.tapd[type][method](request, (err: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToAddAssetSellOffer']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToAddAssetSellOffer']);
              }

              if (!!err && String(err.details).includes(groupKeyError)) {
                return cbk([400, 'ExpectedValidGroupKeyToAddAssetSellOffer']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorAddingAssetSellOffer', {err}]);
              }

              return cbk();
            });
          },
        ],
      },
      returnResult({reject, resolve}, cbk),
    );
  });
};

export default addAssetSellOffer;
