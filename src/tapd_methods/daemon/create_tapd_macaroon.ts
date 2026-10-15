import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const disabledError = 'macaroon authentication disabled';
const hexAsBase64 = (n: string) => Buffer.from(n, 'hex').toString('base64');
const {isArray} = Array;
const isHex = (n: unknown) =>
  typeof n === 'string' && /^([0-9A-F]{2})+$/i.test(n);
const isPermission = (n: any) => !!n?.action && !!n?.entity;
const isRootKeyId = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const method = 'bakeMacaroon';
const permissionErrors = ['invalid permission', 'unsupported permission'];
const type = 'default';

export type CreateTapdMacaroonArgs = AuthenticatedTapdArgs<{
  /** Allow Permissions That tapd Does Not Know */
  is_external_allowed?: boolean;
  permissions: {
    /** Permission Action String */
    action: string;
    /** Permission Entity String */
    entity: string;
  }[];
  /** Root Key Id Numeric String */
  root_key_id?: string;
}>;

export type CreateTapdMacaroonResult = {
  /** Macaroon Base64 */
  macaroon: string;
};

type Tasks = {
  create: CreateTapdMacaroonResult;
  validate: undefined;
};

/** Create a tapd macaroon with specific permissions

  tapd adds no caveats. Add caveats to the macaroon after you create it.

  Use the entity `uri` and an RPC method URI as the action, to give access to
  one RPC method

  Requires `macaroon:write` permission

  {
    [is_external_allowed]: <Allow Permissions That tapd Does Not Know Bool>
    permissions: [{
      action: <Permission Action String>
      entity: <Permission Entity String>
    }]
    [root_key_id]: <Root Key Id Numeric String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    macaroon: <Macaroon Base64 String>
  }
*/
const createTapdMacaroon: TapdMethod<
  CreateTapdMacaroonArgs,
  CreateTapdMacaroonResult
> = (
  args: CreateTapdMacaroonArgs,
  cbk?: TapdCallback<CreateTapdMacaroonResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isArray(args.permissions) || !args.permissions.length) {
            return cbk([400, 'ExpectedPermissionsToCreateTapdMacaroon']);
          }

          if (!args.permissions.every(isPermission)) {
            return cbk([400, 'ExpectedActionAndEntityForTapdPermission']);
          }

          const rootKeyId = args.root_key_id;

          if (rootKeyId !== undefined && !isRootKeyId(rootKeyId)) {
            return cbk([400, 'ExpectedNumericRootKeyIdToCreateTapdMacaroon']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToCreateTapdMacaroon']);
          }

          return cbk();
        },

        // Create the macaroon
        create: [
          'validate',
          ({}, cbk) => {
            const request = {
              allow_external_permissions: !!args.is_external_allowed,
              permissions: args.permissions.map(n => ({
                action: n.action,
                entity: n.entity,
              })),
              root_key_id: args.root_key_id || '0',
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToCreateTapdMacaroon']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCreateTapdMacaroon']);
              }

              const details = String(err?.details);

              if (!!err && permissionErrors.some(n => details.includes(n))) {
                return cbk([400, 'ExpectedKnownPermissionsForTapdMacaroon']);
              }

              if (!!err && details.includes(disabledError)) {
                return cbk([501, 'MacaroonsAreDisabledInTapd']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorCreatingTapdMacaroon', {err}]);
              }

              if (!res || !isHex(res.macaroon)) {
                return cbk([503, 'ExpectedHexMacaroonInBakeMacaroonResponse']);
              }

              return cbk(null, {macaroon: hexAsBase64(res.macaroon)});
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'create'}, cbk),
    );
  });
};

export default createTapdMacaroon;
