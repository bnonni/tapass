# tapass

Methods for working with the Taproot Assets Daemon. An extension of [@alexbosworth/lightning](https://github.com/alexbosworth/lightning.git).

## TAPD Authentication

To connect to TAPD, authentication details are required.

To export your credentials, run `base64` on the tls.cert and admin.macaroon files to get the encoded
authentication data to create the TAPD connection. You can find these files in
the TAPD directory. (~/.tapd or ~/Library/Application Support/Tapd)

    base64 -w0 ~/.tapd/tls.cert
    base64 -w0 ~/.tapd/data/mainnet/admin.macaroon

You can then use these to interact with your TAPD directly.

```ts
import { authenticatedTapdGrpc } from 'tapass';
// cjs: const { authenticatedTapdGrpc } = require('tapass');

const { tapd } = authenticatedTapdGrpc({
    cert: 'base64 encoded tls.cert from taproot-assets dir',
    macaroon: 'base64 encoded admin.macaroon from taproot-assets dir',
    socket: '127.0.0.1:10029',
});
```

## Methods

TODO
