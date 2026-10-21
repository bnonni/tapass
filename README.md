# tapass

[![npm](https://img.shields.io/npm/v/tapass)](https://www.npmjs.com/package/tapass)
[![CI](https://github.com/bnonni/tapass/actions/workflows/ci.yml/badge.svg)](https://github.com/bnonni/tapass/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Methods for the Taproot Assets daemon (tapd), in the style of
[lightning](https://github.com/alexbosworth/lightning).

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Contributing](#contributing)
- [License](#license)

## Background

[Taproot Assets](https://github.com/lightninglabs/taproot-assets) (tapd) is a
daemon that mints and transfers assets on Bitcoin. tapd sends assets on-chain,
and over Lightning channels that are funded with an asset.

tapass is a client for the tapd gRPC API. Each method takes an object of
arguments and returns an object with snake_case keys, as in lightning. tapass
uses the protos of tapd v0.8.5. It has methods for all RPCs of the tapd
services TaprootAssets, Mint, Rfq, and TaprootAssetChannels.

Related packages:

- [lightning](https://github.com/alexbosworth/lightning): methods for lnd.
- [litterm](https://github.com/bnonni/litterm): methods for Lightning
  Terminal (litd).

## Install

```sh
npm install tapass lightning
```

tapass needs Node.js 22.12 or later. The package is ESM only.

lightning is a peer dependency. The asset channel methods use it to return lnd
payments, invoices, and payment requests in the same shape as lightning.

## Usage

```js
import {authenticatedTapdGrpc} from 'tapass';
import {createAssetAddress} from 'tapass';
import {getAssetBalances} from 'tapass';

const {tapd} = authenticatedTapdGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded admin.macaroon',
  socket: '127.0.0.1:10029',
});

const {balances} = await getAssetBalances({tapd});

const {address} = await createAssetAddress({amount: '100', asset_id, tapd});
```

Refer to these pages for more:

- [Authentication](docs/authentication.md): get the cert and the macaroon, and
  connect to tapd in litd.
- [Usage](docs/usage.md): promises, callbacks, subscriptions, values, and
  TypeScript types.
- [Errors](docs/errors.md): the error codes and how to read them.

## API

The [API reference](docs/api/README.md) shows the arguments, the result, and
an example for each method.

- [Addresses](docs/api/addresses.md): Taproot Assets addresses and the
  transfers to them.
- [Assets](docs/api/assets.md): assets, balances, groups, metadata, outputs,
  and burns.
- [Asset Channels](docs/api/asset-channels.md): asset channels, invoices, and
  payments.
- [Daemon](docs/api/daemon.md): macaroons, log levels, and stop.
- [Info](docs/api/info.md): information about tapd.
- [Mint](docs/api/mint.md): mint batches.
- [Proofs](docs/api/proofs.md): decode, export, unpack, and verify proofs.
- [RFQ](docs/api/rfq.md): offers, orders, and quotes for asset prices.
- [Send](docs/api/send.md): on-chain sends, transfers, and burns.

## Contributing

Open an issue or a pull request on
[GitHub](https://github.com/bnonni/tapass). To build and test tapass, refer to
[Contributing](docs/CONTRIBUTING.md). The [roadmap](ROADMAP.md) shows the
planned work.

## License

[MIT](LICENSE) © 2025 bnonni
