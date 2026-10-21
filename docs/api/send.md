# Send

On-chain asset sends, transfers, and burns.

- [burnAsset](#burnasset): Burn asset units
- [getAssetTransfers](#getassettransfers): Get the outbound asset transfers of this node
- [registerAssetTransfer](#registerassettransfer): Register an inbound asset transfer that has no Taproot Assets address
- [sendAsset](#sendasset): Send assets to Taproot Assets addresses
- [subscribeToAssetSends](#subscribetoassetsends): Subscribe to the state changes of outbound asset sends

## burnAsset

Burn asset units

The burned asset units are destroyed and cannot be recovered

Requires `assets:write` permission

An `asset_id` or a `group_key` is required, not both. `is_burn_confirmed`
must be true.

A burn with a `group_key` needs tapd v0.8.0 or later

    {
      amount: <Asset Units To Burn Numeric String>
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      is_burn_confirmed: <The Caller Confirms That the Assets Will Be Destroyed Bool>
      [note]: <Burn Note String>
      tapd: <Authenticated tapd API Object>
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
      transfer: {
        [block_hash]: <Anchor Block Hash Hex String>
        [block_height]: <Anchor Block Height Number>
        created_at: <Transfer Created At ISO 8601 Date String>
        fee: <Anchor Transaction Chain Fee Tokens Number>
        height_hint: <Anchor Transaction Confirmation Height Hint Number>
        inputs: [{
          amount: <Asset Units Numeric String>
          asset_id: <Asset Id Hex String>
          [group_key]: <Asset Group Key Hex String>
          is_collectible: <Asset Is Collectible Bool>
          script_key: <Script Key Hex String>
          transaction_id: <Spent Anchor Transaction Id Hex String>
          transaction_vout: <Spent Anchor Transaction Output Index Number>
        }]
        [label]: <Transfer Label String>
        outputs: [{
          [address]: <Taproot Assets Address Of the Recipient String>
          amount: <Asset Units Numeric String>
          anchor: {
            internal_key: <Anchor Internal Key Hex String>
            merkle_root: <Anchor Taproot Merkle Root Hex String>
            output_script: <Output Script Hex String>
            passive_assets_count: <Count Of Passive Assets In the Anchor Number>
            taproot_asset_root: <Taproot Asset Root Commitment Hex String>
            [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
            tokens: <Anchor Output Tokens Number>
            transaction_id: <Anchor Transaction Id Hex String>
            transaction_vout: <Anchor Transaction Output Index Number>
          }
          [asset_id]: <Asset Id Hex String>
          asset_version: <Asset Version Number>
          [group_key]: <Asset Group Key Hex String>
          is_collectible: <Asset Is Collectible Bool>
          is_local: <Script Key Belongs To This Node Bool>
          is_split_root: <Output Is the Split Root Bool>
          [lock_time]: <Lock Time Number>
          [proof]: <Proof File Hex String>
          [proof_courier]: <Proof Courier Address String>
          [proof_delivery]: <Proof Delivery State String> // complete, pending
          [relative_lock_time]: <Relative Lock Time Number>
          script_key: <Script Key Hex String>
          [split_root_hash]: <Split Commitment Root Hash Hex String>
        }]
        [transaction]: <Raw Anchor Transaction Hex String>
        transaction_id: <Anchor Transaction Id Hex String>
      }
    }

Example:

```js
import {burnAsset} from 'tapass';

const {transfer} = await burnAsset({
  amount: '10',
  asset_id,
  is_burn_confirmed: true,
  tapd,
});
```

## getAssetTransfers

Get the outbound asset transfers of this node

Requires `assets:read` permission

    {
      tapd: <Authenticated tapd API Object>
      [transaction_id]: <Anchor Transaction Id Hex String>
    }

    @returns via cbk or Promise
    {
      transfers: [{
        [block_hash]: <Anchor Block Hash Hex String>
        [block_height]: <Anchor Block Height Number>
        created_at: <Transfer Created At ISO 8601 Date String>
        fee: <Anchor Transaction Chain Fee Tokens Number>
        height_hint: <Anchor Transaction Confirmation Height Hint Number>
        inputs: [{
          amount: <Asset Units Numeric String>
          asset_id: <Asset Id Hex String>
          [group_key]: <Asset Group Key Hex String>
          is_collectible: <Asset Is Collectible Bool>
          script_key: <Script Key Hex String>
          transaction_id: <Spent Anchor Transaction Id Hex String>
          transaction_vout: <Spent Anchor Transaction Output Index Number>
        }]
        [label]: <Transfer Label String>
        outputs: [{
          [address]: <Taproot Assets Address Of the Recipient String>
          amount: <Asset Units Numeric String>
          anchor: {
            internal_key: <Anchor Internal Key Hex String>
            merkle_root: <Anchor Taproot Merkle Root Hex String>
            output_script: <Output Script Hex String>
            passive_assets_count: <Count Of Passive Assets In the Anchor Number>
            taproot_asset_root: <Taproot Asset Root Commitment Hex String>
            [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
            tokens: <Anchor Output Tokens Number>
            transaction_id: <Anchor Transaction Id Hex String>
            transaction_vout: <Anchor Transaction Output Index Number>
          }
          [asset_id]: <Asset Id Hex String>
          asset_version: <Asset Version Number>
          [group_key]: <Asset Group Key Hex String>
          is_collectible: <Asset Is Collectible Bool>
          is_local: <Script Key Belongs To This Node Bool>
          is_split_root: <Output Is the Split Root Bool>
          [lock_time]: <Lock Time Number>
          [proof]: <Proof File Hex String>
          [proof_courier]: <Proof Courier Address String>
          [proof_delivery]: <Proof Delivery State String> // complete, pending
          [relative_lock_time]: <Relative Lock Time Number>
          script_key: <Script Key Hex String>
          [split_root_hash]: <Split Commitment Root Hash Hex String>
        }]
        [transaction]: <Raw Anchor Transaction Hex String>
        transaction_id: <Anchor Transaction Id Hex String>
      }]
    }

Example:

```js
import {getAssetTransfers} from 'tapass';

const {transfers} = await getAssetTransfers({tapd});
```

## registerAssetTransfer

Register an inbound asset transfer that has no Taproot Assets address

Use this for an interactive transfer, when the sender sent the proof by a
different way. The proof must already be in the local universe, and the
script key must already be known to this node.

Requires `assets:write` and `proofs:write` permissions

    {
      asset_id: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      script_key: <Script Key Hex String>
      tapd: <Authenticated tapd API Object>
      transaction_id: <Anchor Transaction Id Hex String>
      transaction_vout: <Anchor Transaction Output Index Number>
    }

    @returns via cbk or Promise
    {
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
    }

Example:

```js
import {registerAssetTransfer} from 'tapass';

const asset = await registerAssetTransfer({
  asset_id,
  script_key,
  tapd,
  transaction_id,
  transaction_vout,
});
```

## sendAsset

Send assets to Taproot Assets addresses

Requires `assets:write` permission

All addresses must be for the same asset id or asset group

An `amount` is only for an address without an amount, for example a V2
address. An address without an amount needs an `amount`. An `amount` needs
tapd v0.7.0 or later.

A fee rate below 253 tokens per thousand weight units (about 1.012 tokens
per virtual byte) is raised to 253, because tapd rejects a lower rate

    {
      addresses: [{
        address: <Taproot Assets Address String>
        [amount]: <Asset Units To Send Numeric String>
      }]
      [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
      [is_courier_ping_skipped]: <Skip the Proof Courier Ping Check Bool>
      [label]: <Transfer Label String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      [block_hash]: <Anchor Block Hash Hex String>
      [block_height]: <Anchor Block Height Number>
      created_at: <Transfer Created At ISO 8601 Date String>
      fee: <Anchor Transaction Chain Fee Tokens Number>
      height_hint: <Anchor Transaction Confirmation Height Hint Number>
      inputs: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        script_key: <Script Key Hex String>
        transaction_id: <Spent Anchor Transaction Id Hex String>
        transaction_vout: <Spent Anchor Transaction Output Index Number>
      }]
      [label]: <Transfer Label String>
      outputs: [{
        [address]: <Taproot Assets Address Of the Recipient String>
        amount: <Asset Units Numeric String>
        anchor: {
          internal_key: <Anchor Internal Key Hex String>
          merkle_root: <Anchor Taproot Merkle Root Hex String>
          output_script: <Output Script Hex String>
          passive_assets_count: <Count Of Passive Assets In the Anchor Number>
          taproot_asset_root: <Taproot Asset Root Commitment Hex String>
          [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
          tokens: <Anchor Output Tokens Number>
          transaction_id: <Anchor Transaction Id Hex String>
          transaction_vout: <Anchor Transaction Output Index Number>
        }
        [asset_id]: <Asset Id Hex String>
        asset_version: <Asset Version Number>
        [group_key]: <Asset Group Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        is_local: <Script Key Belongs To This Node Bool>
        is_split_root: <Output Is the Split Root Bool>
        [lock_time]: <Lock Time Number>
        [proof]: <Proof File Hex String>
        [proof_courier]: <Proof Courier Address String>
        [proof_delivery]: <Proof Delivery State String> // complete, pending
        [relative_lock_time]: <Relative Lock Time Number>
        script_key: <Script Key Hex String>
        [split_root_hash]: <Split Commitment Root Hash Hex String>
      }]
      [transaction]: <Raw Anchor Transaction Hex String>
      transaction_id: <Anchor Transaction Id Hex String>
    }

Example:

```js
import {sendAsset} from 'tapass';

const transfer = await sendAsset({addresses: [{address}], tapd});
```

## subscribeToAssetSends

Subscribe to the state changes of outbound asset sends

Requires `assets:read` permission

A `start_at` date in the past replays the events from that date. The
`start_at` date must not be in the future. Without a `start_at`, the events
start now.

    {
      [label]: <Transfer Label String>
      [script_key]: <Recipient Script Key Hex String>
      [start_at]: <Replay Events From ISO 8601 Date String>
      tapd: <Authenticated tapd API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'send'
    {
      addresses: [{
        address: <Encoded Taproot Assets Address String>
        amount: <Asset Units To Receive Numeric String>
        [asset_id]: <Asset Id Hex String>
        asset_version: <Asset Version Number>
        [group_key]: <Asset Group Key Hex String>
        internal_key: <Internal Key Hex String>
        is_collectible: <Asset Is Collectible Bool>
        proof_courier: <Proof Courier Address String>
        script_key: <Script Key Hex String>
        [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
        taproot_output_key: <Taproot Output Key Hex String>
        version: <Address Version Number>
      }]
      [anchor]: {
        [change_output_index]: <Change Output Index Number>
        fee: <Chain Fee Tokens Number>
        fee_tokens_per_vbyte: <Target Fee Tokens Per Virtual Byte Number>
        locked_utxos: [{
          transaction_id: <Locked Transaction Id Hex String>
          transaction_vout: <Locked Transaction Output Index Number>
        }]
        psbt: <Anchor Transaction PSBT Hex String>
        [transaction]: <Signed Anchor Transaction Hex String>
      }
      at: <Event At ISO 8601 Date String>
      [error]: <Send State Error String>
      [label]: <Transfer Label String>
      [next_state]: <Next Send State String>
      parcel_type: <Parcel Type String> // address, pending, pre_anchored,
                                        // pre_signed
      passive_virtual_packets: [<Passive Virtual Packet Hex String>]
      state: <Executed Send State String> // for example anchor_sign, complete
      [transfer]: {
        [block_hash]: <Anchor Block Hash Hex String>
        [block_height]: <Anchor Block Height Number>
        created_at: <Transfer Created At ISO 8601 Date String>
        fee: <Anchor Transaction Chain Fee Tokens Number>
        height_hint: <Anchor Transaction Confirmation Height Hint Number>
        inputs: [{
          amount: <Asset Units Numeric String>
          asset_id: <Asset Id Hex String>
          [group_key]: <Asset Group Key Hex String>
          is_collectible: <Asset Is Collectible Bool>
          script_key: <Script Key Hex String>
          transaction_id: <Spent Anchor Transaction Id Hex String>
          transaction_vout: <Spent Anchor Transaction Output Index Number>
        }]
        [label]: <Transfer Label String>
        outputs: [{
          [address]: <Taproot Assets Address Of the Recipient String>
          amount: <Asset Units Numeric String>
          anchor: {
            internal_key: <Anchor Internal Key Hex String>
            merkle_root: <Anchor Taproot Merkle Root Hex String>
            output_script: <Output Script Hex String>
            passive_assets_count: <Count Of Passive Assets In the Anchor Number>
            taproot_asset_root: <Taproot Asset Root Commitment Hex String>
            [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
            tokens: <Anchor Output Tokens Number>
            transaction_id: <Anchor Transaction Id Hex String>
            transaction_vout: <Anchor Transaction Output Index Number>
          }
          [asset_id]: <Asset Id Hex String>
          asset_version: <Asset Version Number>
          [group_key]: <Asset Group Key Hex String>
          is_collectible: <Asset Is Collectible Bool>
          is_local: <Script Key Belongs To This Node Bool>
          is_split_root: <Output Is the Split Root Bool>
          [lock_time]: <Lock Time Number>
          [proof]: <Proof File Hex String>
          [proof_courier]: <Proof Courier Address String>
          [proof_delivery]: <Proof Delivery State String> // complete, pending
          [relative_lock_time]: <Relative Lock Time Number>
          script_key: <Script Key Hex String>
          [split_root_hash]: <Split Commitment Root Hash Hex String>
        }]
        [transaction]: <Raw Anchor Transaction Hex String>
        transaction_id: <Anchor Transaction Id Hex String>
      }
      virtual_packets: [<Virtual Packet Hex String>]
    }
    @event 'end'

    @event 'error'
    [<Error Code Number>, <Error Message String>, <Error Details Object>]

    @event 'status'
    <gRPC Status Object>

Example:

```js
import {subscribeToAssetSends} from 'tapass';

const sub = subscribeToAssetSends({tapd});

sub.on('send', send => console.log(send));
```
