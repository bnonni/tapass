import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcGroupedAssetsAsGroup} from '../../tapd_responses/index.js';
import type {Group} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {entries} = Object;
const method = 'listGroups';
const type = 'default';

export type GetAssetGroupsArgs = AuthenticatedTapdArgs;

export type GetAssetGroupsResult = {
  groups: Group[];
};

type Tasks = {
  getGroups: GetAssetGroupsResult;
  validate: undefined;
};

/** Get the asset groups of the assets that this node owns

  Requires `assets:read` permission

  {
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    groups: [{
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        is_collectible: <Asset Is Collectible Bool>
        [lock_time]: <Lock Time Number>
        meta_hash: <Asset Metadata Hash Hex String>
        name: <Asset Name String>
        [relative_lock_time]: <Relative Lock Time Number>
        version: <Asset Version Number>
      }]
      key: <Tweaked Group Key Hex String>
    }]
  }
*/
const getAssetGroups: TapdMethod<GetAssetGroupsArgs, GetAssetGroupsResult> = (
  args: GetAssetGroupsArgs,
  cbk?: TapdCallback<GetAssetGroupsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetAssetGroups']);
          }

          return cbk();
        },

        // Get the groups
        getGroups: [
          'validate',
          ({}, cbk) => {
            return args.tapd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetAssetGroups']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetAssetGroups']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingAssetGroups', {err}]);
              }

              if (!res || !res.groups) {
                return cbk([503, 'ExpectedGroupsInAssetGroupsResponse']);
              }

              try {
                const groups = entries(res.groups as object)
                  .map(([key, group]) => rpcGroupedAssetsAsGroup({group, key}))
                  .sort((a, b) => a.key.localeCompare(b.key));

                return cbk(null, {groups});
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getGroups'}, cbk),
    );
  });
};

export default getAssetGroups;
