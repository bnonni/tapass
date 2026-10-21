# Addresses

Taproot Assets addresses, and the inbound transfers to these addresses.

- [createAssetAddress](#createassetaddress): Create a Taproot Assets address to receive an asset
- [decodeAssetAddress](#decodeassetaddress): Decode a Taproot Assets address
- [getAssetAddresses](#getassetaddresses): Get the Taproot Assets addresses that this node created, oldest first
- [getAssetReceives](#getassetreceives): Get the inbound asset transfers to Taproot Assets addresses, newest first
- [subscribeToAssetReceives](#subscribetoassetreceives): Subscribe to inbound asset transfers to Taproot Assets addresses

## createAssetAddress

Create a Taproot Assets address to receive an asset

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

Example:

```js
import {createAssetAddress} from 'tapass';

const {address} = await createAssetAddress({amount: '100', asset_id, tapd});
```

## decodeAssetAddress

Decode a Taproot Assets address

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

Example:

```js
import {decodeAssetAddress} from 'tapass';

const {amount, asset_id} = await decodeAssetAddress({address, tapd});
```

## getAssetAddresses

Get the Taproot Assets addresses that this node created, oldest first

Requires `addresses:read` permission

Use the `next` token with the same filters to get the next page

    {
      [created_after]: <Created After ISO 8601 Date String>
      [created_before]: <Created Before ISO 8601 Date String>
      [limit]: <Page Result Limit Number>
      tapd: <Authenticated tapd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      addresses: [{
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
      }]
      [next]: <Next Opaque Paging Token String>
    }

Example:

```js
import {getAssetAddresses} from 'tapass';

const {addresses} = await getAssetAddresses({tapd});
```

## getAssetReceives

Get the inbound asset transfers to Taproot Assets addresses, newest first

Requires `addresses:read` permission

Use the `next` token with the same filters to get the next page

A `limit` and a `token` are not supported together. The maximum
`limit` is 16384.

Paging and the newest first order need tapd v0.8.0 or later

    {
      [address]: <Encoded Taproot Assets Address String>
      [created_after]: <Created After ISO 8601 Date String>
      [created_before]: <Created Before ISO 8601 Date String>
      [limit]: <Page Result Limit Number>
      [status]: <Receive Status String> // completed, proof_received,
                                        // transaction_confirmed,
                                        // transaction_detected
      tapd: <Authenticated tapd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      [next]: <Next Opaque Paging Token String>
      receives: [{
        address: {
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
        [confirmation_height]: <Confirmation Block Height Number>
        created_at: <Receive Detected At ISO 8601 Date String>
        is_proof_available: <Proof File Is Available Bool>
        status: <Receive Status String>
        [tapscript_sibling]: <Tapscript Sibling Hash Hex String>
        tokens: <Satoshis In the Anchor Output Number>
        transaction_id: <Anchor Transaction Id Hex String>
        transaction_vout: <Anchor Transaction Output Index Number>
      }]
    }

Example:

```js
import {getAssetReceives} from 'tapass';

const {receives} = await getAssetReceives({tapd});
```

## subscribeToAssetReceives

Subscribe to inbound asset transfers to Taproot Assets addresses

Requires `assets:read` permission

With `created_after`, tapd also sends the past events after that date

    {
      [address]: <Encoded Taproot Assets Address String>
      [created_after]: <Replay Events After ISO 8601 Date String>
      tapd: <Authenticated tapd API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'receive'
    {
      address: {
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
      [confirmation_height]: <Confirmation Block Height Number>
      [error]: <Receive Error String>
      status: <Receive Status String>
      [transaction_id]: <Anchor Transaction Id Hex String>
      [transaction_vout]: <Anchor Transaction Output Index Number>
      updated_at: <Updated At ISO 8601 Date String>
    }
    @event 'end'

    @event 'error'
    [<Error Code Number>, <Error Message String>, <Error Details Object>]

    @event 'status'
    <gRPC Status Object>

Example:

```js
import {subscribeToAssetReceives} from 'tapass';

const sub = subscribeToAssetReceives({tapd});

sub.on('receive', receive => console.log(receive));
```
