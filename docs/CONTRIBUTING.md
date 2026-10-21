# Contributing

Open an [issue](https://github.com/bnonni/tapass/issues) to report a bug or to
ask for a feature. Open a pull request to fix a bug or to add a feature. The
[roadmap](../ROADMAP.md) shows the planned work.

Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
messages, for example `fix: map the asset not found error`.

## Requirements

- Node.js 22.12 or later
- pnpm 11
- Bun 1.3: the test script runs `bun test`

## Development

```sh
pnpm install
pnpm test
pnpm lint
pnpm build
```

- `pnpm test` type-checks the tests, then runs them with Bun.
- `pnpm lint` runs oxlint, checks the format with oxfmt, and checks that the
  API pages are current.
- `pnpm docs` writes the API pages from the JSDoc.
- `pnpm format` formats the code with oxfmt.
- `pnpm build` compiles the package to `dist/`.

CI runs lint, test, and build on each push to `main` and on each pull request.

## Docs

Each method has a JSDoc block in `src/tapd_methods/`. The block shows the
arguments and the result of the method, or the events of a subscription. The
[API reference](api/README.md) copies this block, and adds an example.

Do not edit the API pages by hand, except for the examples. To change the
docs of a method:

1. Change the JSDoc block of the method.
2. Run `pnpm docs` to write the API pages.

The script keeps the example of each method from its page. For a new method,
add a `## methodName` section with `Example:` and a code block to its page.
Then run `pnpm docs`.

## Protos

tapass uses the protos of tapd v0.8.5 in `protos/`. The script also copies the
lnd protos that `tapchannel.proto` imports, at the lnd version that tapd
needs. To copy the protos of a different tapd release into `protos/`:

    pnpm sync-protos v0.8.5

## Live Test

The live test runs each method against a Polar network. It does not run in
CI, because it needs the [Polar](https://lightningpolar.com) desktop app.

The network must have two started litd nodes with tapd v0.8.1 or later, in
integrated mode. The proof courier of the network must also run. If the first
node has no asset channel to the second node, the test funds the node, mints
an asset, and opens the channel.

Each run mints a new asset and sends some of its units on-chain to the second
node.

    NETWORK_ID=1 NODES=alice,bob pnpm test:live

- `NETWORK_ID`: the Polar network id. This value is necessary.
- `NODES`: the names of the two litd nodes. The default is `alice,bob`.
- `OLD_NODE`: a tapd node that is older than v0.8.0. If you set it, the test
  also checks the 501 of the methods that need a newer tapd.

`stopTapd` uses a read-only macaroon and expects 403, so tapd keeps running.
