# Errors

A method that fails gives an error array:

    [code, 'ErrorMessage', {err}]

- `code`: a status code number. The codes are the same as HTTP status codes.
- `'ErrorMessage'`: a PascalCase string, for example `AssetNotFound`.
- `{err}`: an optional object with details, for example the gRPC error from
  tapd.

With a Promise, the method rejects with the array. With a callback, the method
gives the array as the first argument of the callback. For the errors of
subscriptions, refer to [Subscriptions](usage.md#subscriptions).

```js
import {getAssetMetadata} from 'tapass';

try {
  await getAssetMetadata({asset_id, tapd});
} catch (err) {
  const [code, message] = err;

  if (code === 404) {
    console.log(message); // AssetNotFound
  }
}
```

## Codes

- `400`: An argument is not correct.
- `403`: The macaroon does not have the permission for the method.
- `404`: tapd does not have the item, for example an asset.
- `409`: The item already exists, for example a proof.
- `501`: tapd does not have the RPC or the feature. Some RPCs need a newer
  tapd.
- `503`: tapd returned an error, or tapd is not available.
