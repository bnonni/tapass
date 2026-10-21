# Assets

The assets, balances, asset groups, metadata, outputs, and burns of the node.

- [getAssetBalances](#getassetbalances): Get the asset balances of this node, by asset and by asset group
- [getAssetBurns](#getassetburns): Get the asset burns that this node made
- [getAssetGroups](#getassetgroups): Get the asset groups of the assets that this node owns
- [getAssetMetadata](#getassetmetadata): Get the metadata of an asset
- [getAssets](#getassets): Get the assets that this node owns
- [getAssetUtxos](#getassetutxos): Get the on-chain outputs that hold the assets of this node

## getAssetBalances

Get the asset balances of this node, by asset and by asset group

Requires `assets:read` permission

By default, tapd includes only assets with a BIP-86 script key. Use
`script_key_type` to get other assets, for example assets in channels.

An `asset_id` or a `group_key` is a filter, but not both. With an
`asset_id`, there are no group balances.

    {
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      [is_including_leased]: <Include Leased Assets Bool>
      [script_key_type]: <Script Key Type String> // all, bip86, burn, channel,
                                                 // script_path_external,
                                                 // tombstone, unique_pedersen
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      balances: [{
        asset_id: <Asset Id Hex String>
        balance: <Balance Asset Units Numeric String>
        [group_key]: <Asset Group Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        meta_hash: <Asset Metadata Hash Hex String>
        name: <Asset Name String>
      }]
      group_balances: [{
        balance: <Balance Asset Units Numeric String>
        group_key: <Asset Group Key Hex String>
      }]
      unconfirmed_transfers: <Unconfirmed Transfers Count Number>
    }

Example:

```js
import {getAssetBalances} from 'tapass';

const {balances} = await getAssetBalances({tapd});
```

## getAssetBurns

Get the asset burns that this node made

Requires `assets:read` permission

    {
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      tapd: <Authenticated tapd API Object>
      [transaction_id]: <Burn Anchor Transaction Id Hex String>
    }

    @returns via cbk or Promise
    {
      burns: [{
        amount: <Burned Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        [note]: <Burn Note String>
        transaction_id: <Burn Anchor Transaction Id Hex String>
      }]
    }

Example:

```js
import {getAssetBurns} from 'tapass';

const {burns} = await getAssetBurns({tapd});
```

## getAssetGroups

Get the asset groups of the assets that this node owns

Requires `assets:read` permission

    {
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      groups: [{
        assets: [{
          amount: <Asset Units Numeric String>
          asset_id: <Asset Id Hex String>
          is_collectible: <Asset Is Collectible Bool>
          [lock_time]: <Lock Time Number>
          meta_hash: <Asset Metadata Hash Hex String>
          name: <Asset Name String>
          [relative_lock_time]: <Relative Lock Time Number>
          version: <Asset Version Number>
        }]
        key: <Tweaked Group Key Hex String>
      }]
    }

Example:

```js
import {getAssetGroups} from 'tapass';

const {groups} = await getAssetGroups({tapd});
```

## getAssetMetadata

Get the metadata of an asset

Requires `assets:read` permission

An `asset_id` or a `meta_hash` is required, but not both

    {
      [asset_id]: <Asset Id Hex String>
      [meta_hash]: <Metadata Hash Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      canonical_universes: [<Canonical Universe URL String>]
      data: <Metadata Hex String>
      [decimal_display]: <Decimal Places To Show Number>
      [delegation_key]: <Supply Commitment Delegation Public Key Hex String>
      hash: <Metadata Hash Hex String>
      is_publishing_supply_commitments: <Issuer Publishes Supply Commitments Bool>
      type: <Metadata Type String> // json, opaque, unknown
      unknown_types: [{
        type: <TLV Type Numeric String>
        value: <Value Hex String>
      }]
    }

Example:

```js
import {getAssetMetadata} from 'tapass';

const {data} = await getAssetMetadata({asset_id, tapd});
```

## getAssets

Get the assets that this node owns

Requires `assets:read` permission

By default, tapd includes only assets with a BIP-86 script key. Use
`script_key_type` to get other assets, for example assets in channels.

An `asset_id` or a `group_key` is a filter, but not both. An `asset_id` needs
tapd v0.8.0 or later, and it does not support paging or amount filters.

Spent assets and leased assets are not supported together.

Without an `asset_id`, the assets are newest first. Use the `next` token
with the same filters to get the next page. A `limit` and a `token` are not
supported together. The maximum `limit` is 16384.

Paging needs tapd v0.8.0 or later. An older tapd sends all the assets in one
page.

    {
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      [is_including_leased]: <Include Leased Assets Bool>
      [is_including_spent]: <Include Spent Assets Bool>
      [is_including_unconfirmed]: <Include Unconfirmed Mints Bool>
      [limit]: <Page Result Limit Number>
      [max_amount]: <Maximum Asset Units Numeric String>
      [min_amount]: <Minimum Asset Units Numeric String>
      [script_key_type]: <Script Key Type String> // all, bip86, burn, channel,
                                                 // script_path_external,
                                                 // tombstone, unique_pedersen
      tapd: <Authenticated tapd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      assets: [{
        amount: <Asset Units Numeric String>
        [anchor]: {
          [block_hash]: <Anchor Block Hash Hex String>
          [block_height]: <Anchor Block Height Number>
          [confirmed_at]: <Anchor Confirmed At ISO 8601 Date String>
          internal_key: <Anchor Internal Key Hex String>
          merkle_root: <Anchor Taproot Merkle Root Hex String>
          [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
          transaction: <Raw Anchor Transaction Hex String>
          transaction_id: <Anchor Transaction Id Hex String>
          transaction_vout: <Anchor Transaction Output Index Number>
        }
        asset_id: <Asset Id Hex String>
        [decimal_display]: <Decimal Places To Show Number>
        genesis_output_index: <Genesis Commitment Output Index Number>
        genesis_transaction_id: <Genesis Point Transaction Id Hex String>
        genesis_transaction_vout: <Genesis Point Transaction Output Index Number>
        [group]: {
          key: <Tweaked Group Key Hex String>
          raw_key: <Raw Group Key Hex String>
          [tapscript_root]: <Group Tapscript Root Hex String>
          [witness]: <Group Membership Witness Hex String>
        }
        is_burn: <Asset Is Burned Bool>
        is_collectible: <Asset Is Collectible Bool>
        is_local: <Script Key Belongs To This Node Bool>
        is_spent: <Asset Is Spent Bool>
        [lease_expires_at]: <Lease Expires At ISO 8601 Date String>
        [lease_owner]: <Lease Owner Id Hex String>
        [lock_time]: <Lock Time Number>
        meta_hash: <Asset Metadata Hash Hex String>
        name: <Asset Name String>
        [relative_lock_time]: <Relative Lock Time Number>
        script_key: <Script Key Hex String>
        script_key_type: <Script Key Type String>
        script_version: <Script Version Number>
        version: <Asset Version Number>
      }]
      [next]: <Next Opaque Paging Token String>
      [unconfirmed_mints]: <Unconfirmed Mints Count Number>
      [unconfirmed_transfers]: <Unconfirmed Transfers Count Number>
    }

Example:

```js
import {getAssets} from 'tapass';

const {assets, next} = await getAssets({limit: 10, tapd});

// Get the next page
const page2 = await getAssets({tapd, token: next});
```

## getAssetUtxos

Get the on-chain outputs that hold the assets of this node

Requires `assets:read` permission

By default, tapd includes only assets with a BIP-86 script key. Use
`script_key_type` to get other assets, for example assets in channels.

    {
      [is_including_leased]: <Include Leased UTXOs Bool>
      [script_key_type]: <Script Key Type String> // all, bip86, burn, channel,
                                                 // script_path_external,
                                                 // tombstone, unique_pedersen
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      utxos: [{
        assets: [{
          amount: <Asset Units Numeric String>
          [anchor]: {
            [block_hash]: <Anchor Block Hash Hex String>
            [block_height]: <Anchor Block Height Number>
            [confirmed_at]: <Anchor Confirmed At ISO 8601 Date String>
            internal_key: <Anchor Internal Key Hex String>
            merkle_root: <Anchor Taproot Merkle Root Hex String>
            [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
            transaction: <Raw Anchor Transaction Hex String>
            transaction_id: <Anchor Transaction Id Hex String>
            transaction_vout: <Anchor Transaction Output Index Number>
          }
          asset_id: <Asset Id Hex String>
          [decimal_display]: <Decimal Places To Show Number>
          genesis_output_index: <Genesis Commitment Output Index Number>
          genesis_transaction_id: <Genesis Point Transaction Id Hex String>
          genesis_transaction_vout: <Genesis Point Output Index Number>
          [group]: {
            key: <Tweaked Group Key Hex String>
            raw_key: <Raw Group Key Hex String>
            [tapscript_root]: <Group Tapscript Root Hex String>
            [witness]: <Group Membership Witness Hex String>
          }
          is_burn: <Asset Is Burned Bool>
          is_collectible: <Asset Is Collectible Bool>
          is_local: <Script Key Belongs To This Node Bool>
          is_spent: <Asset Is Spent Bool>
          [lease_expires_at]: <Lease Expires At ISO 8601 Date String>
          [lease_owner]: <Lease Owner Id Hex String>
          [lock_time]: <Lock Time Number>
          meta_hash: <Asset Metadata Hash Hex String>
          name: <Asset Name String>
          [relative_lock_time]: <Relative Lock Time Number>
          script_key: <Script Key Hex String>
          script_key_type: <Script Key Type String>
          script_version: <Script Version Number>
          version: <Asset Version Number>
        }]
        internal_key: <Internal Key Hex String>
        [lease_expires_at]: <Lease Expires At ISO 8601 Date String>
        [lease_owner]: <Lease Owner Id Hex String>
        merkle_root: <Taproot Merkle Root Hex String>
        taproot_asset_root: <Taproot Asset Root Commitment Hash Hex String>
        tokens: <Output Value Tokens Number>
        transaction_id: <Transaction Id Hex String>
        transaction_vout: <Transaction Output Index Number>
      }]
    }

Example:

```js
import {getAssetUtxos} from 'tapass';

const {utxos} = await getAssetUtxos({tapd});
```
