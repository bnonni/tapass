# Roadmap

This file shows the planned work for tapass. The order can change.

## Done

- Release 0.1.0 (2026-10-15): the gRPC client for tapd v0.8.5, and `createAssetAddress`.
- Release 0.2.0 (2026-10-15): methods for all RPCs of the tapd services TaprootAssets, Mint, Rfq, and TaprootAssetChannels. `lightning` is a peer dependency.
- CI (2026-10-19): GitHub Actions runs lint, test, and build on each push to `main` and on each pull request.
- Live test (2026-10-19): `pnpm test:live` runs each method against a Polar network. The script gets the node credentials from polarln (`getNodeCredentials`). It does not run in CI, because it needs the Polar desktop app.
- Release 0.2.1 (2026-10-19): `createAssetInvoice` gives 400 for an amount below the minimum transportable amount, and `payAssetInvoice` gives 409 for a paid request. Both errors were 503.

## Next

No items. See the backlog.

## Backlog

Add these tapd services only on demand:

- AssetWallet (15 RPCs): virtual PSBTs, script keys, ownership proofs, and wallet backups.
- Universe (25 RPCs).
- Mailbox (4 RPCs).
- TapDev (3 RPCs).
