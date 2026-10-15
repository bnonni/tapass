import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const method = 'stopDaemon';
const type = 'default';

export type StopTapdArgs = AuthenticatedTapdArgs;

type Tasks = {
  stop: undefined;
  validate: undefined;
};

/** Stop tapd

  Requires `daemon:write` permission

  {
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
*/
const stopTapd: TapdMethod<StopTapdArgs, void> = (
  args: StopTapdArgs,
  cbk?: TapdCallback<void>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToStopTapd']);
          }

          return cbk();
        },

        // Stop tapd
        stop: [
          'validate',
          ({}, cbk) => {
            return args.tapd[type][method]({}, (err: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToStopTapd']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToStopTapd']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorStoppingTapd', {err}]);
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

export default stopTapd;
