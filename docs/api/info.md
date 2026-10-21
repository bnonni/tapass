# Info

Information about tapd and its lnd node.

- [getTapdInfo](#gettapdinfo): Get information about tapd and its lnd node

## getTapdInfo

Get information about tapd and its lnd node

Requires `daemon:read` permission

    {
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      alias: <lnd Node Alias String>
      current_block_hash: <Best Chain Block Hash Hex String>
      current_block_height: <Best Chain Block Height Number>
      is_synced_to_chain: <lnd Is Synced To Chain Bool>
      lnd_version: <lnd Version String>
      network: <Network Name String>
      public_key: <lnd Identity Public Key Hex String>
      version: <tapd Version String>
    }

Example:

```js
import {getTapdInfo} from 'tapass';

const {is_synced_to_chain, version} = await getTapdInfo({tapd});
```
