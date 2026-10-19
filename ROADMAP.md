# Roadmap

This file shows the planned work for tapass. The order can change.

## Done

- Release 0.1.0 (2026-10-15): the gRPC client for tapd v0.8.5, and `createAssetAddress`.
- Release 0.2.0 (2026-10-15): methods for all RPCs of the tapd services TaprootAssets, Mint, Rfq, and TaprootAssetChannels. `lightning` is a peer dependency.
- CI (2026-10-19): GitHub Actions runs lint, test, and build on each push to `main` and on each pull request.

## Next

1. Add a live test script to the repo. The script gets the node credentials from polarln (`getNodeCredentials`). It runs against a Polar network. It does not run in CI, because it needs the Polar desktop app.

## Backlog

Add these tapd services only on demand:

- AssetWallet (15 RPCs): virtual PSBTs, script keys, ownership proofs, and wallet backups.
- Universe (25 RPCs).
- Mailbox (4 RPCs).
- TapDev (3 RPCs).
