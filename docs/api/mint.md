# Mint

tapd mints assets in batches. Add assets to the pending batch, then fund, seal, and finalize the batch.

- [addAssetToMintBatch](#addassettomintbatch): Add an asset to the pending mint batch
- [cancelMintBatch](#cancelmintbatch): Cancel the pending mint batch
- [finalizeMintBatch](#finalizemintbatch): Finalize the pending mint batch, and broadcast the genesis transaction
- [fundMintBatch](#fundmintbatch): Fund the pending mint batch with a genesis input
- [getMintBatches](#getmintbatches): Get mint batches, including pending and cancelled batches
- [sealMintBatch](#sealmintbatch): Seal the pending mint batch with asset group witnesses
- [subscribeToMintEvents](#subscribetomintevents): Subscribe to the state changes of mint batches

## addAssetToMintBatch

Add an asset to the pending mint batch

Requires `mint:write` permission

tapd makes a new pending batch when there is no pending batch

A normal asset needs an `amount`. A collectible asset has an amount of 1.

Give metadata as hex with `metadata`, or as UTF-8 text with `metadata_text`,
not both. Set `is_json_metadata` when the metadata is a JSON object.

A `decimal_display` is not for collectibles. tapd also writes it into JSON
metadata. If the JSON metadata has a different decimal display, tapd fails.

To mint into an existing group, give a `group_key`, or a `group_anchor` that
names an asset in this batch that starts a new group. Do not give both, and
do not use them with `is_new_group`.

`group_internal_key`, `group_tapscript_root`, `external_group_key`, and
`is_supply_committed` are only for an asset that starts a new group. Give a
`group_internal_key` or an `external_group_key`, not both.

The asset `name` must be 64 bytes or less.

    {
      [amount]: <Asset Units To Mint Numeric String>
      [decimal_display]: <Decimal Places To Show Number> // 0 to 12
      [external_group_key]: {
        derivation_path: <Key Derivation Path String>
        master_fingerprint: <Master Key Fingerprint 4 Byte Hex String>
        xpub: <Extended Public Key String>
      }
      [group_anchor]: <Name of an Asset in the Batch That Anchors a Group String>
      [group_internal_key]: {
        [key_family]: <Key Family Number>
        [key_index]: <Key Index Number>
        public_key: <Internal Public Key Hex String>
      }
      [group_key]: <Existing Group Key Hex String>
      [group_tapscript_root]: <Group Tapscript Root Hex String>
      [is_collectible]: <Asset Is Collectible Bool>
      [is_json_metadata]: <Metadata Is JSON Bool>
      [is_new_group]: <Asset Starts a New Group Bool>
      [is_supply_committed]: <Enable Supply Commitments for the New Group Bool>
      [metadata]: <Metadata Hex String>
      [metadata_text]: <Metadata UTF-8 Text String>
      name: <Asset Name String>
      tapd: <Authenticated tapd API Object>
      [version]: <Asset Version Number> // 0 or 1
    }

    @returns via cbk or Promise
    {
      assets: [{
        amount: <Asset Units Numeric String>
        [group_anchor]: <Name of the Asset That Anchors a New Group String>
        [group_internal_key]: <Group Internal Public Key Hex String>
        [group_key]: <Group Key Hex String>
        [group_tapscript_root]: <Group Tapscript Root Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_new_group: <Asset Starts a New Group Bool>
        [metadata]: <Metadata Hex String>
        [metadata_hash]: <Metadata Hash Hex String>
        [metadata_type]: <Metadata Type String> // json, opaque, unknown
        name: <Asset Name String>
        [script_key]: <Script Key Hex String>
        version: <Asset Version Number>
      }]
      created_at: <Created At ISO 8601 Date String>
      created_height: <Block Height When Created Number>
      id: <Batch Key Hex String>
      [psbt]: <Genesis Transaction PSBT Hex String>
      state: <Batch State String>
      [transaction_id]: <Genesis Transaction Id Hex String>
      unsealed_assets: []
    }

Example:

```js
import {addAssetToMintBatch} from 'tapass';

const batch = await addAssetToMintBatch({amount: '1000', name: 'coin', tapd});
```

## cancelMintBatch

Cancel the pending mint batch

Requires `mint:write` permission

    {
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      id: <Cancelled Batch Key Hex String>
    }

Example:

```js
import {cancelMintBatch} from 'tapass';

const {id} = await cancelMintBatch({tapd});
```

## finalizeMintBatch

Finalize the pending mint batch, and broadcast the genesis transaction

Requires `mint:write` permission

tapd funds the batch first when it is not funded yet. If the batch is already
funded, do not give `fee_tokens_per_vbyte`, `tapscript_branch`, or
`tapscript_leaves`: tapd rejects them.

When a batch has committed assets, tapd does not return the asset version,
the new group flag, or the group anchor: `version` is 0 and `is_new_group`
is false.

A tapscript sibling is optional: give `tapscript_leaves` or a
`tapscript_branch`, not both.

    {
      [fee_tokens_per_vbyte]: <Fee Tokens Per Virtual Byte Number>
      [tapscript_branch]: {
        left: <Left Tap Branch Hash Hex String>
        right: <Right Tap Branch Hash Hex String>
      }
      [tapscript_leaves]: [<Tapscript Leaf Script Hex String>]
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      assets: [{
        amount: <Asset Units Numeric String>
        [group_anchor]: <Name of the Asset That Anchors a New Group String>
        [group_internal_key]: <Group Internal Public Key Hex String>
        [group_key]: <Group Key Hex String>
        [group_tapscript_root]: <Group Tapscript Root Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_new_group: <Asset Starts a New Group Bool>
        [metadata]: <Metadata Hex String>
        [metadata_hash]: <Metadata Hash Hex String>
        [metadata_type]: <Metadata Type String> // json, opaque, unknown
        name: <Asset Name String>
        [script_key]: <Script Key Hex String>
        version: <Asset Version Number>
      }]
      created_at: <Created At ISO 8601 Date String>
      created_height: <Block Height When Created Number>
      id: <Batch Key Hex String>
      [psbt]: <Genesis Transaction PSBT Hex String>
      state: <Batch State String>
      [transaction_id]: <Genesis Transaction Id Hex String>
      unsealed_assets: []
    }

Example:

```js
import {finalizeMintBatch} from 'tapass';

const {state, transaction_id} = await finalizeMintBatch({tapd});
```

## fundMintBatch

Fund the pending mint batch with a genesis input

Requires `mint:write` permission

This is only necessary when the batch needs a custom witness before
`finalizeMintBatch`. tapd makes a new funded batch when there is no pending
batch. tapd fails when the pending batch is already funded.

If an asset in the batch starts or joins a group, `assets` is empty and each
asset of the batch is in `unsealed_assets`.

A tapscript sibling is optional: give `tapscript_leaves` or a
`tapscript_branch`, not both.

    {
      [fee_tokens_per_vbyte]: <Fee Tokens Per Virtual Byte Number>
      [tapscript_branch]: {
        left: <Left Tap Branch Hash Hex String>
        right: <Right Tap Branch Hash Hex String>
      }
      [tapscript_leaves]: [<Tapscript Leaf Script Hex String>]
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      assets: [{
        amount: <Asset Units Numeric String>
        [group_anchor]: <Name of the Asset That Anchors a New Group String>
        [group_internal_key]: <Group Internal Public Key Hex String>
        [group_key]: <Group Key Hex String>
        [group_tapscript_root]: <Group Tapscript Root Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_new_group: <Asset Starts a New Group Bool>
        [metadata]: <Metadata Hex String>
        [metadata_hash]: <Metadata Hash Hex String>
        [metadata_type]: <Metadata Type String> // json, opaque, unknown
        name: <Asset Name String>
        [script_key]: <Script Key Hex String>
        version: <Asset Version Number>
      }]
      created_at: <Created At ISO 8601 Date String>
      created_height: <Block Height When Created Number>
      id: <Batch Key Hex String>
      [psbt]: <Genesis Transaction PSBT Hex String>
      state: <Batch State String>
      [transaction_id]: <Genesis Transaction Id Hex String>
      unsealed_assets: [{
        amount: <Asset Units Numeric String>
        [group_anchor]: <Name of the Asset That Anchors a New Group String>
        [group_internal_key]: <Group Internal Public Key Hex String>
        [group_key]: <Group Key Hex String>
        [group_tapscript_root]: <Group Tapscript Root Hex String>
        [group_virtual_psbt]: <Group Virtual Transaction PSBT Hex String>
        [group_virtual_transaction]: <Group Virtual Transaction Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_new_group: <Asset Starts a New Group Bool>
        [metadata]: <Metadata Hex String>
        [metadata_hash]: <Metadata Hash Hex String>
        [metadata_type]: <Metadata Type String> // json, opaque, unknown
        name: <Asset Name String>
        [script_key]: <Script Key Hex String>
        version: <Asset Version Number>
      }]
    }

Example:

```js
import {fundMintBatch} from 'tapass';

const {psbt} = await fundMintBatch({tapd});
```

## getMintBatches

Get mint batches, including pending and cancelled batches

Requires `mint:read` permission

With `is_verbose`, tapd returns only pending batches that are funded and have
assets. If an asset in such a batch starts or joins a group, `assets` is
empty and each asset of the batch is in `unsealed_assets`, with the group
details. Without `is_verbose`, `unsealed_assets` is empty.

When a batch has committed assets, tapd does not return the asset version,
the new group flag, or the group anchor: `version` is 0 and `is_new_group`
is false.

    {
      [id]: <Batch Key Hex String>
      [is_verbose]: <Include Group Details of Unsealed Assets Bool>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      batches: [{
        assets: [{
          amount: <Asset Units Numeric String>
          [group_anchor]: <Name of the Asset That Anchors a New Group String>
          [group_internal_key]: <Group Internal Public Key Hex String>
          [group_key]: <Group Key Hex String>
          [group_tapscript_root]: <Group Tapscript Root Hex String>
          is_collectible: <Asset Is Collectible Bool>
          is_new_group: <Asset Starts a New Group Bool>
          [metadata]: <Metadata Hex String>
          [metadata_hash]: <Metadata Hash Hex String>
          [metadata_type]: <Metadata Type String> // json, opaque, unknown
          name: <Asset Name String>
          [script_key]: <Script Key Hex String>
          version: <Asset Version Number>
        }]
        created_at: <Created At ISO 8601 Date String>
        created_height: <Block Height When Created Number>
        id: <Batch Key Hex String>
        [psbt]: <Genesis Transaction PSBT Hex String>
        state: <Batch State String>
        [transaction_id]: <Genesis Transaction Id Hex String>
        unsealed_assets: [{
          amount: <Asset Units Numeric String>
          [group_anchor]: <Name of the Asset That Anchors a New Group String>
          [group_internal_key]: <Group Internal Public Key Hex String>
          [group_key]: <Group Key Hex String>
          [group_tapscript_root]: <Group Tapscript Root Hex String>
          [group_virtual_psbt]: <Group Virtual Transaction PSBT Hex String>
          [group_virtual_transaction]: <Group Virtual Transaction Hex String>
          is_collectible: <Asset Is Collectible Bool>
          is_new_group: <Asset Starts a New Group Bool>
          [metadata]: <Metadata Hex String>
          [metadata_hash]: <Metadata Hash Hex String>
          [metadata_type]: <Metadata Type String> // json, opaque, unknown
          name: <Asset Name String>
          [script_key]: <Script Key Hex String>
          version: <Asset Version Number>
        }]
      }]
    }

Example:

```js
import {getMintBatches} from 'tapass';

const {batches} = await getMintBatches({tapd});
```

## sealMintBatch

Seal the pending mint batch with asset group witnesses

Requires `mint:write` permission

This is only necessary when an asset in the batch has a group key that needs
an external signer. Fund the batch first with `fundMintBatch`, and sign the
`group_virtual_psbt` of each unsealed asset.

tapd signs the group witnesses that are not given

Give `group_witnesses` or `signed_group_psbts`, not both

    {
      [group_witnesses]: [{
        asset_id: <Asset Id Hex String>
        witness: [<Witness Stack Element Hex String>]
      }]
      [signed_group_psbts]: [<Signed Group Virtual Transaction PSBT Hex String>]
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      assets: [{
        amount: <Asset Units Numeric String>
        [group_anchor]: <Name of the Asset That Anchors a New Group String>
        [group_internal_key]: <Group Internal Public Key Hex String>
        [group_key]: <Group Key Hex String>
        [group_tapscript_root]: <Group Tapscript Root Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_new_group: <Asset Starts a New Group Bool>
        [metadata]: <Metadata Hex String>
        [metadata_hash]: <Metadata Hash Hex String>
        [metadata_type]: <Metadata Type String> // json, opaque, unknown
        name: <Asset Name String>
        [script_key]: <Script Key Hex String>
        version: <Asset Version Number>
      }]
      created_at: <Created At ISO 8601 Date String>
      created_height: <Block Height When Created Number>
      id: <Batch Key Hex String>
      [psbt]: <Genesis Transaction PSBT Hex String>
      state: <Batch State String>
      [transaction_id]: <Genesis Transaction Id Hex String>
      unsealed_assets: []
    }

Example:

```js
import {sealMintBatch} from 'tapass';

const batch = await sealMintBatch({tapd});
```

## subscribeToMintEvents

Subscribe to the state changes of mint batches

Requires `mint:read` permission

When a batch has committed assets, tapd does not return the asset version,
the new group flag, or the group anchor: `version` is 0 and `is_new_group`
is false.

    {
      tapd: <Authenticated tapd API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    // A mint batch changed state, or it failed to change state
    @event 'batch'
    {
      at: <Event At ISO 8601 Date String>
      batch: {
        assets: [{
          amount: <Asset Units Numeric String>
          [group_anchor]: <Name of the Asset That Anchors a New Group String>
          [group_internal_key]: <Group Internal Public Key Hex String>
          [group_key]: <Group Key Hex String>
          [group_tapscript_root]: <Group Tapscript Root Hex String>
          is_collectible: <Asset Is Collectible Bool>
          is_new_group: <Asset Starts a New Group Bool>
          [metadata]: <Metadata Hex String>
          [metadata_hash]: <Metadata Hash Hex String>
          [metadata_type]: <Metadata Type String> // json, opaque, unknown
          name: <Asset Name String>
          [script_key]: <Script Key Hex String>
          version: <Asset Version Number>
        }]
        created_at: <Created At ISO 8601 Date String>
        created_height: <Block Height When Created Number>
        id: <Batch Key Hex String>
        [psbt]: <Genesis Transaction PSBT Hex String>
        state: <Batch State String>
        [transaction_id]: <Genesis Transaction Id Hex String>
        unsealed_assets: []
      }
      [error]: <State Change Error String>
      state: <Last Done Batch State String>
    }
    @event 'end'

    @event 'error'
    <gRPC Error Object> or [<Error Code Number>, <Error Message String>]

    @event 'status'
    <gRPC Status Object>

Example:

```js
import {subscribeToMintEvents} from 'tapass';

const sub = subscribeToMintEvents({tapd});

sub.on('batch', ({at, batch}) => console.log(at, batch.state));
```
