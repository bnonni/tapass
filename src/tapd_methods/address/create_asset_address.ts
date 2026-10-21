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

const addressVersions = [
  'ADDR_VERSION_V0',
  'ADDR_VERSION_V1',
  'ADDR_VERSION_V2',
];
const {from} = Buffer;
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isHex = (n: string) => !!n && !(n.length % 2) && /^[0-9A-F]*$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const method = 'newAddr';
const notFoundError = 'unable to find asset or group';
const type = 'default';
const unspecifiedVersion = 'ADDR_VERSION_UNSPECIFIED';

export type CreateAssetAddressArgs = AuthenticatedTapdArgs<{
  /** Asset Units To Receive Numeric String */
  amount?: string;
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Proof Courier Address String */
  proof_courier?: string;
  /** Address Version Number */
  version?: number;
}>;

export type CreateAssetAddressResult = Address;

type Tasks = {
  createAddress: CreateAssetAddressResult;
  validate: undefined;
};

/** Create a Taproot Assets address to receive an asset

  Requires `addresses:write` permission

  An `asset_id` or a `group_key` is required, but not both

  When there is a `group_key` and no `version`, tapd makes a V2 address

  A V2 address for a grouped asset must use the `group_key`

  An `amount` is required, except for a V2 address of a normal asset. The
  `amount` of a collectible must be 1.

  {
    [amount]: <Asset Units To Receive Numeric String>
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    [proof_courier]: <Proof Courier Address String>
    tapd: <Authenticated tapd API Object>
    [version]: <Address Version Number> // 0 || 1 || 2
  }

  @returns via cbk or Promise
  {
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
*/
const createAssetAddress: TapdMethod<
  CreateAssetAddressArgs,
  CreateAssetAddressResult
> = (
  args: CreateAssetAddressArgs,
  cbk?: TapdCallback<CreateAssetAddressResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (args.amount !== undefined && !isNumeric(args.amount)) {
            return cbk([400, 'ExpectedNumericAmountToCreateAssetAddress']);
          }

          if (!args.asset_id && !args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyToCreateAssetAddress']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'UnexpectedAssetIdAndGroupKeyForAssetAddress']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToCreateAssetAddress']);
          }

          if (!!args.group_key && !isHex(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToCreateAssetAddress']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToCreateAssetAddress']);
          }

          if (args.version !== undefined && !addressVersions[args.version]) {
            return cbk([400, 'ExpectedKnownVersionToCreateAssetAddress']);
          }

          return cbk();
        },

        // Create the address
        createAddress: [
          'validate',
          ({}, cbk) => {
            const request = {
              address_version:
                args.version === undefined
                  ? unspecifiedVersion
                  : addressVersions[args.version],
              amt: args.amount || '0',
              asset_id: from(args.asset_id || '', 'hex'),
              group_key: from(args.group_key || '', 'hex'),
              proof_courier_addr: args.proof_courier || '',
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToCreateAssetAddress']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToCreateAssetAddress']);
              }

              if (!!err && String(err.details).includes(notFoundError)) {
                const isGroup = !!args.group_key;

                return cbk([
                  404,
                  isGroup ? 'AssetGroupNotFound' : 'AssetNotFound',
                ]);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorCreatingAssetAddress', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseForAssetAddressCreation']);
              }

              try {
                return cbk(null, rpcAddrAsAddress(res));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'createAddress'}, cbk),
    );
  });
};

export default createAssetAddress;
