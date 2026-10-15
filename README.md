# tapass

Methods for the Taproot Assets daemon (tapd), in the style of
[lightning](https://github.com/alexbosworth/lightning).

## Install

    npm install tapass

tapass needs Node.js 22.12 or later.

## tapd Authentication

To connect to tapd, you need the TLS certificate and a macaroon. Encode each
file as base64:

    base64 -w0 ~/.tapd/tls.cert
    base64 -w0 ~/.tapd/data/mainnet/admin.macaroon

Then make an authenticated tapd object:

```js
import {authenticatedTapdGrpc} from 'tapass';

const {tapd} = authenticatedTapdGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded admin.macaroon',
  socket: '127.0.0.1:10029',
});
```

## Methods

- [createAssetAddress](#createassetaddress): Create a Taproot Assets address
  to receive an asset

### createAssetAddress

Create a Taproot Assets address to receive an asset

Requires `addresses:write` permission

An `asset_id` or a `group_key` is required, but not both

When there is a `group_key` and no `version`, tapd makes a V2 address

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

## Errors

Methods return errors as arrays: `[code, 'ErrorMessage', {err}]`.

- `400`: An argument is not correct.
- `403`: The macaroon does not have the permission for the method.
- `404`: tapd does not have the item, for example an asset.
- `503`: tapd returned an error, or tapd is not available.

## Development

    pnpm install
    pnpm test
    pnpm lint
    pnpm build

To copy the protos of a different tapd release into `protos/`:

    pnpm sync-protos v0.8.5
