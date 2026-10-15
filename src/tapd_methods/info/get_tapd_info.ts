import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const isHash = (n: unknown) =>
  typeof n === 'string' && /^[0-9a-f]{64}$/i.test(n);
const isPublicKey = (n: unknown) =>
  typeof n === 'string' && /^0[23][0-9a-f]{64}$/i.test(n);
const method = 'getInfo';
const type = 'default';

export type GetTapdInfoArgs = AuthenticatedTapdArgs;

export type GetTapdInfoResult = {
  /** lnd Node Alias */
  alias: string;
  /** Best Chain Block Hash Hex */
  current_block_hash: string;
  /** Best Chain Block Height */
  current_block_height: number;
  /** tapd Is Synced To Chain */
  is_synced_to_chain: boolean;
  /** lnd Version */
  lnd_version: string;
  /** Network Name */
  network: string;
  /** lnd Identity Public Key Hex */
  public_key: string;
  /** tapd Version */
  version: string;
};

type Tasks = {
  getInfo: GetTapdInfoResult;
  validate: undefined;
};

/** Get information about tapd and its lnd node

  Requires `daemon:read` permission

  {
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    alias: <lnd Node Alias String>
    current_block_hash: <Best Chain Block Hash Hex String>
    current_block_height: <Best Chain Block Height Number>
    is_synced_to_chain: <tapd Is Synced To Chain Bool>
    lnd_version: <lnd Version String>
    network: <Network Name String>
    public_key: <lnd Identity Public Key Hex String>
    version: <tapd Version String>
  }
*/
const getTapdInfo: TapdMethod<GetTapdInfoArgs, GetTapdInfoResult> = (
  args: GetTapdInfoArgs,
  cbk?: TapdCallback<GetTapdInfoResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToGetTapdInfo']);
          }

          return cbk();
        },

        // Get the info
        getInfo: [
          'validate',
          ({}, cbk) => {
            return args.tapd[type][method]({}, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToGetTapdInfo']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToGetTapdInfo']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorGettingTapdInfo', {err}]);
              }

              if (!res || !res.version) {
                return cbk([503, 'ExpectedVersionInTapdInfoResponse']);
              }

              if (!isHash(res.block_hash)) {
                return cbk([503, 'ExpectedBlockHashInTapdInfoResponse']);
              }

              if (!isPublicKey(res.lnd_identity_pubkey)) {
                return cbk([503, 'ExpectedLndPublicKeyInTapdInfoResponse']);
              }

              return cbk(null, {
                alias: res.node_alias,
                current_block_hash: res.block_hash,
                current_block_height: res.block_height,
                is_synced_to_chain: res.sync_to_chain,
                lnd_version: res.lnd_version,
                network: res.network,
                public_key: res.lnd_identity_pubkey,
                version: res.version,
              });
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'getInfo'}, cbk),
    );
  });
};

export default getTapdInfo;
