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

const invalidAddressError = 'unable to decode addr';
const method = 'decodeAddr';
const type = 'default';

export type DecodeAssetAddressArgs = AuthenticatedTapdArgs<{
  /** Encoded Taproot Assets Address String */
  address: string;
}>;

export type DecodeAssetAddressResult = Address;

type Tasks = {
  decode: DecodeAssetAddressResult;
  validate: undefined;
};

/** Decode a Taproot Assets address

  Requires `addresses:read` permission

  The address must be for the network of tapd

  {
    address: <Encoded Taproot Assets Address String>
    tapd: <Authenticated tapd API Object>
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
const decodeAssetAddress: TapdMethod<
  DecodeAssetAddressArgs,
  DecodeAssetAddressResult
> = (
  args: DecodeAssetAddressArgs,
  cbk?: TapdCallback<DecodeAssetAddressResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.address || typeof args.address !== 'string') {
            return cbk([400, 'ExpectedAssetAddressToDecode']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToDecodeAssetAddress']);
          }

          return cbk();
        },

        // Decode the address
        decode: [
          'validate',
          ({}, cbk) => {
            const request = {addr: args.address};

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToDecodeAssetAddress']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToDecodeAssetAddress']);
              }

              if (!!err && String(err.details).includes(invalidAddressError)) {
                return cbk([400, 'ExpectedValidAssetAddressToDecode']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorDecodingAssetAddress', {err}]);
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
      returnResult({reject, resolve, of: 'decode'}, cbk),
    );
  });
};

export default decodeAssetAddress;
