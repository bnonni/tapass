#!/bin/sh
# Copy the tapd protos for a release tag into protos/, with the upstream layout.
# Also copy the lnd protos that tapchannel.proto imports, at the lnd version
# that the tapd go.mod requires.
#
# Usage: sh scripts/sync-protos.sh v0.8.5
set -eu

tag="${1:?Usage: sh scripts/sync-protos.sh <taproot-assets tag>}"
root="$(cd "$(dirname "$0")/.." && pwd)"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

curl -fsSL "https://codeload.github.com/lightninglabs/taproot-assets/tar.gz/refs/tags/$tag" |
  tar -xz -C "$tmp" --strip-components=1

lnd="$(awk '$1 == "github.com/lightningnetwork/lnd" { print $2; exit }' "$tmp/go.mod")"

rm -rf "$root/protos"

(cd "$tmp" && find taprpc -name '*.proto') | while read -r file; do
  mkdir -p "$root/protos/$(dirname "$file")"
  cp "$tmp/$file" "$root/protos/$file"
done

for file in lightning.proto routerrpc/router.proto; do
  mkdir -p "$root/protos/lnrpc/$(dirname "$file")"
  curl -fsSL "https://raw.githubusercontent.com/lightningnetwork/lnd/$lnd/lnrpc/$file" \
    -o "$root/protos/lnrpc/$file"
done

printf 'taproot-assets %s\nlnd %s\n' "$tag" "$lnd" > "$root/protos/VERSIONS"
