# Usage

## Promises and Callbacks

Each method takes one object of arguments and returns a Promise:

```js
import {getAssetBalances} from 'tapass';

const {balances} = await getAssetBalances({tapd});
```

If you give a callback as the second argument, the method calls the callback
instead:

```js
getAssetBalances({tapd}, (err, res) => {
  if (!!err) {
    return console.error(err);
  }

  return console.log(res.balances);
});
```

## Subscriptions

A method with a name that starts with `subscribeTo` returns an EventEmitter.
The [API reference](api/README.md) shows the events of each subscription.

```js
import {subscribeToAssetReceives} from 'tapass';

const sub = subscribeToAssetReceives({tapd});

sub.on('receive', receive => console.log(receive.status));

sub.on('error', err => console.error(err));

sub.on('end', () => console.log('tapd closed the stream'));
```

- A subscription method throws an Error if an argument is not correct.
- Each subscription emits `end` when tapd closes the stream.
- Each subscription emits `error` when the stream fails. If there is no
  `error` listener, the subscription does not emit errors.
- To stop a subscription, remove all its listeners, for example with
  `sub.removeAllListeners()`. tapass then cancels the gRPC stream.

The `error` event gives an error array. Refer to [Errors](errors.md). For a
stream failure in `subscribeToAssetReceives`, `subscribeToAssetSends`, and
`subscribeToMintEvents`, the event gives the gRPC error object.

## Arguments and Results

The [API reference](api/README.md) shows the arguments and the result of each
method. A key in brackets, for example `[group_key]`, is optional. If the
method has no value for an optional key in a result, the key is `undefined`.

The values use these types:

- Keys are snake_case.
- Asset units are numeric strings, for example `'1000'`, because tapd uses
  64-bit amounts.
- Tokens (sats) are numbers.
- Dates are ISO 8601 strings.
- Ids, keys, and hashes are hex strings. Macaroons are base64 strings.

The asset channel methods map lnd payments, invoices, and payment requests
with the mappers of [lightning](https://github.com/alexbosworth/lightning).
These results use the lightning shapes.

## Errors

A method that fails gives an error array, for example
`[404, 'AssetNotFound']`. Refer to [Errors](errors.md).

## TypeScript

tapass includes TypeScript types. For each method, the package exports the
type of the arguments, for example `CreateAssetAddressArgs`. If the method
returns data, the package also exports the type of the result, for example
`CreateAssetAddressResult`.

```ts
import {createAssetAddress} from 'tapass';
import type {CreateAssetAddressArgs} from 'tapass';

const args: CreateAssetAddressArgs = {amount: '100', asset_id, tapd};

const {address} = await createAssetAddress(args);
```

The package also exports the types of shared objects, for example `Asset`,
`Balance`, `Batch`, `Proof`, and `Transfer`.
