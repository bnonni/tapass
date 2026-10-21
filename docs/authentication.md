# Authentication

tapass connects to the gRPC port of tapd. The default port is 10029.

## Get the Cert and the Macaroon

To connect to tapd, you need the TLS certificate and a macaroon. Encode each
file as base64 (hex also works):

    base64 -w0 ~/.tapd/tls.cert
    base64 -w0 ~/.tapd/data/mainnet/admin.macaroon

For a different network, replace `mainnet` with the network name, for example
`testnet` or `regtest`.

## Connect

```js
import {authenticatedTapdGrpc} from 'tapass';

const {tapd} = authenticatedTapdGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded admin.macaroon',
  socket: '127.0.0.1:10029',
});
```

All arguments of `authenticatedTapdGrpc` are optional:

- `cert`: the tapd TLS certificate, base64 or hex. Give it if tapd uses a
  self-signed cert.
- `macaroon`: the macaroon, base64 or hex.
- `path`: a protos directory with `taprpc` and `lnrpc` directories. The
  default is the `protos/` directory of the package.
- `socket`: the `host:port` of tapd. The default is `localhost:10029`.

`authenticatedTapdGrpc` throws an Error if the macaroon is not base64 or hex.

Each method in the [API reference](api/README.md) shows the permission that it
needs. To limit access, use a macaroon that has only these permissions. To
make such a macaroon, use [createTapdMacaroon](api/daemon.md#createtapdmacaroon).

## Connect to tapd in litd

If tapd runs in litd integrated mode, the litd port also serves tapd. Use
these values:

- `cert`: the litd TLS certificate, `~/.lit/tls.cert`.
- `macaroon`: the tapd macaroon, `~/.tapd/data/mainnet/admin.macaroon`.
- `socket`: the litd port, for example `127.0.0.1:8443`.

```js
import {authenticatedTapdGrpc} from 'tapass';

const {tapd} = authenticatedTapdGrpc({
  cert: 'base64 encoded ~/.lit/tls.cert',
  macaroon: 'base64 encoded ~/.tapd/data/mainnet/admin.macaroon',
  socket: '127.0.0.1:8443',
});
```

For the litd methods, use [litterm](https://github.com/bnonni/litterm).
