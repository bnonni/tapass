# Daemon

These methods make tapd macaroons, set the log level, and stop tapd.

- [createTapdMacaroon](#createtapdmacaroon): Create a tapd macaroon with specific permissions
- [setTapdDebugLevel](#settapddebuglevel): Set the log level of tapd
- [stopTapd](#stoptapd): Stop tapd

## createTapdMacaroon

Create a tapd macaroon with specific permissions

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

Example:

```js
import {createTapdMacaroon} from 'tapass';

const {macaroon} = await createTapdMacaroon({
  permissions: [{action: 'read', entity: 'assets'}],
  tapd,
});
```

## setTapdDebugLevel

Set the log level of tapd

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

Example:

```js
import {setTapdDebugLevel} from 'tapass';

await setTapdDebugLevel({level: 'debug', tapd});
```

## stopTapd

Stop tapd

Requires `daemon:write` permission

    {
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise

Example:

```js
import {stopTapd} from 'tapass';

await stopTapd({tapd});
```
