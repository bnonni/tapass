import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const isLevel = (n: unknown) => typeof n === 'string' && /^[\w=,.-]+$/.test(n);
const method = 'debugLevel';
const type = 'default';

export type SetTapdDebugLevelArgs = AuthenticatedTapdArgs<{
  /** Log Level Specification String */
  level: string;
}>;

type Tasks = {
  set: undefined;
  validate: undefined;
};

/** Set the log level of tapd

  Use a level for all subsystems, for example `debug`, or a level for each
  subsystem, for example `TADB=trace,FRTR=info`

  In litd integrated mode, tapd has no log subsystems. Then only a level for
  all subsystems works.

  Requires `daemon:write` permission

  {
    level: <Log Level Specification String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
*/
const setTapdDebugLevel: TapdMethod<SetTapdDebugLevelArgs, void> = (
  args: SetTapdDebugLevelArgs,
  cbk?: TapdCallback<void>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isLevel(args.level)) {
            return cbk([400, 'ExpectedLogLevelToSetTapdDebugLevel']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToSetTapdDebugLevel']);
          }

          return cbk();
        },

        // Set the log level
        set: [
          'validate',
          ({}, cbk) => {
            const request = {level_spec: args.level, show: false};

            return args.tapd[type][method](request, (err: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToSetTapdDebugLevel']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToSetTapdDebugLevel']);
              }

              // tapd returns the log level parse errors as unknown errors
              if (!!err) {
                return cbk([400, 'FailedToSetTapdDebugLevel', {err}]);
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

export default setTapdDebugLevel;
