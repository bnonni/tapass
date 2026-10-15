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
const method = 'addAssetBuyOffer';
const type = 'rfq';

export type AddAssetBuyOfferArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Maximum Asset Units To Buy Numeric String */
  max_amount: string;
}>;

type Tasks = {
  addOffer: undefined;
  validate: undefined;
};

/** Add or update an offer to buy an asset

  tapd uses buy offers to accept or reject the sell quote requests of peers,
  before it checks the price

  Requires `rfq:write` permission

  An `asset_id` or a `group_key` is required, but not both

  {
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    max_amount: <Maximum Asset Units To Buy Numeric String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
*/
const addAssetBuyOffer: TapdMethod<AddAssetBuyOfferArgs, void> = (
  args: AddAssetBuyOfferArgs,
  cbk?: TapdCallback<void>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.asset_id && !args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyToAddAssetBuyOffer']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'UnexpectedAssetIdAndGroupKeyForAssetBuyOffer']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToAddAssetBuyOffer']);
          }

          if (!!args.group_key && !isPublicKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToAddAssetBuyOffer']);
          }

          if (!isPositive(args.max_amount)) {
            return cbk([400, 'ExpectedMaxAmountToAddAssetBuyOffer']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToAddAssetBuyOffer']);
          }

          return cbk();
        },

        // Add the buy offer
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
                return cbk([503, 'FailedToConnectToTapdToAddAssetBuyOffer']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToAddAssetBuyOffer']);
              }

              if (!!err && String(err.details).includes(groupKeyError)) {
                return cbk([400, 'ExpectedValidGroupKeyToAddAssetBuyOffer']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorAddingAssetBuyOffer', {err}]);
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

export default addAssetBuyOffer;
