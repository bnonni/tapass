# tapass

Methods for the Taproot Assets daemon (tapd), in the style of
[lightning](https://github.com/alexbosworth/lightning).

## Install

    npm install tapass lightning

tapass needs Node.js 22.12 or later.

[lightning](https://github.com/alexbosworth/lightning) is a peer dependency.
The asset channel methods use it to return lnd payments, invoices, and payment
requests in the same shape as lightning.

## tapd Authentication

To connect to tapd, you need the TLS certificate and a macaroon. Encode each
file as base64:

    base64 -w0 ~/.tapd/tls.cert
    base64 -w0 ~/.tapd/data/mainnet/admin.macaroon

Then make an authenticated tapd object:

```js
import {authenticatedTapdGrpc} from 'tapass';

const {tapd} = authenticatedTapdGrpc({
  cert: 'base64 encoded tls.cert',
  macaroon: 'base64 encoded admin.macaroon',
  socket: '127.0.0.1:10029',
});
```

## Methods

- [addAssetBuyOffer](#addassetbuyoffer): Add or update an offer to buy an asset
- [addAssetBuyOrder](#addassetbuyorder): Ask a peer for a quote to buy an asset over an asset channel
- [addAssetSellOffer](#addassetselloffer): Add or update an offer to sell an asset
- [addAssetSellOrder](#addassetsellorder): Ask a peer for a quote to sell an asset over an asset channel
- [addAssetToMintBatch](#addassettomintbatch): Add an asset to the pending mint batch
- [burnAsset](#burnasset): Burn asset units
- [cancelMintBatch](#cancelmintbatch): Cancel the pending mint batch
- [createAssetAddress](#createassetaddress): Create a Taproot Assets address to receive an asset
- [createAssetInvoice](#createassetinvoice): Create an invoice that is paid with an asset, over an asset channel
- [createTapdMacaroon](#createtapdmacaroon): Create a tapd macaroon with specific permissions
- [decodeAssetAddress](#decodeassetaddress): Decode a Taproot Assets address
- [decodeAssetPaymentRequest](#decodeassetpaymentrequest): Decode a payment request and get its amount in units of an asset
- [decodeAssetProof](#decodeassetproof): Decode an asset proof or one proof in an asset proof file
- [encodeAssetCustomRecords](#encodeassetcustomrecords): Encode the first hop custom records of an asset payment
- [exportAssetProof](#exportassetproof): Export the proof file of an asset
- [finalizeMintBatch](#finalizemintbatch): Finalize the pending mint batch, and broadcast the genesis transaction
- [fundMintBatch](#fundmintbatch): Fund the pending mint batch with a genesis input
- [getAcceptedQuotes](#getacceptedquotes): Get the quotes that peers accepted for the orders of this node
- [getAssetAddresses](#getassetaddresses): Get the Taproot Assets addresses that this node created, oldest first
- [getAssetBalances](#getassetbalances): Get the asset balances of this node, by asset and by asset group
- [getAssetBurns](#getassetburns): Get the asset burns that this node made
- [getAssetForwards](#getassetforwards): Get the asset swaps that this edge node forwarded
- [getAssetGroups](#getassetgroups): Get the asset groups of the assets that this node owns
- [getAssetInvoices](#getassetinvoices): Get invoices that received an asset, newest first
- [getAssetMetadata](#getassetmetadata): Get the metadata of an asset
- [getAssetPayments](#getassetpayments): Get confirmed payments that sent an asset, newest first
- [getAssetReceives](#getassetreceives): Get the inbound asset transfers to Taproot Assets addresses, newest first
- [getAssets](#getassets): Get the assets that this node owns
- [getAssetTransfers](#getassettransfers): Get the outbound asset transfers of this node
- [getAssetUtxos](#getassetutxos): Get the on-chain outputs that hold the assets of this node
- [getMintBatches](#getmintbatches): Get mint batches, including pending and cancelled batches
- [getTapdInfo](#gettapdinfo): Get information about tapd and its lnd node
- [openAssetChannel](#openassetchannel): Open a channel that is funded with an asset
- [payAssetInvoice](#payassetinvoice): Pay a payment request with an asset, over an asset channel
- [registerAssetTransfer](#registerassettransfer): Register an inbound asset transfer that has no Taproot Assets address
- [sealMintBatch](#sealmintbatch): Seal the pending mint batch with asset group witnesses
- [sendAsset](#sendasset): Send assets to Taproot Assets addresses
- [sendAssetKeysend](#sendassetkeysend): Send an asset to a channel peer with a keysend payment
- [setTapdDebugLevel](#settapddebuglevel): Set the log level of tapd
- [stopTapd](#stoptapd): Stop tapd
- [subscribeToAssetInvoices](#subscribetoassetinvoices): Subscribe to invoices that receive an asset
- [subscribeToAssetPayments](#subscribetoassetpayments): Subscribe to the status of current outgoing asset payments
- [subscribeToAssetReceives](#subscribetoassetreceives): Subscribe to inbound asset transfers to Taproot Assets addresses
- [subscribeToAssetSends](#subscribetoassetsends): Subscribe to the state changes of outbound asset sends
- [subscribeToMintEvents](#subscribetomintevents): Subscribe to the state changes of mint batches
- [subscribeToPastAssetPayment](#subscribetopastassetpayment): Subscribe to the status of a past asset payment
- [subscribeToRfqEvents](#subscribetorfqevents): Subscribe to RFQ events
- [unpackAssetProofFile](#unpackassetprooffile): Get the individual proofs in an asset proof file
- [verifyAssetProof](#verifyassetproof): Verify an asset proof file

### addAssetBuyOffer

Add or update an offer to buy an asset

tapd uses buy offers to accept or reject the sell quote requests of peers,
before it checks the price

Requires `rfq:write` permission

An `asset_id` or a `group_key` is required, but not both

    {
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      max_amount: <Maximum Asset Units To Buy Numeric String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise

Example:

```js
import {addAssetBuyOffer} from 'tapass';

await addAssetBuyOffer({asset_id, max_amount: '1000000', tapd});
```

### addAssetBuyOrder

Ask a peer for a quote to buy an asset over an asset channel

Use a buy order before you make an invoice that is paid in an asset

Requires `rfq:write` permission

An `asset_id` or a `group_key` is required, but not both

A rate is a number of asset units per BTC, as an exact decimal string

When there is no `min_amount`, the quote must fill the `max_amount`. Use
`"0"` to accept a partial fill.

The default `timeout_seconds` is 60

`min_amount`, `min_rate`, and `is_fill_or_kill` need tapd v0.8.0 or later.
Older tapd versions ignore them.

    {
      [asset_id]: <Asset Id Hex String>
      expires_at: <Order Expires At ISO 8601 Date String>
      [group_key]: <Asset Group Key Hex String>
      [is_asset_channel_check_skipped]: <Skip Asset Channel Check Bool>
      [is_fill_or_kill]: <Reject a Quote That Does Not Fill the Maximum Bool>
      max_amount: <Maximum Asset Units Numeric String>
      [min_amount]: <Minimum Asset Units Numeric String>
      [min_rate]: <Minimum Rate Asset Units Per BTC Decimal String>
      peer_public_key: <Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      tapd: <Authenticated tapd API Object>
      [timeout_seconds]: <Wait For the Peer Quote Seconds Number>
    }

    @returns via cbk or Promise
    {
      [accepted_max_amount]: <Accepted Maximum Asset Units Numeric String>
      [asset_id]: <Asset Id Hex String>
      channel: <Channel To Pay Over Standard Format Channel Id String>
      expires_at: <Quote Expires At ISO 8601 Date String>
      [group_key]: <Asset Group BIP340 Public Key Hex String>
      id: <Quote Request Id Hex String>
      max_amount: <Maximum Asset Units Numeric String>
      min_transportable_amount: <Minimum Asset Units In One HTLC Numeric String>
      peer_public_key: <Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      rate: <Ask Rate Asset Units Per BTC Exact Decimal String>
    }

Example:

```js
import {addAssetBuyOrder} from 'tapass';

const quote = await addAssetBuyOrder({
  asset_id,
  expires_at: new Date(Date.now() + 60e3).toISOString(),
  max_amount: '1000',
  peer_public_key,
  tapd,
});
```

### addAssetSellOffer

Add or update an offer to sell an asset

tapd uses sell offers to accept or reject the buy quote requests of peers

Requires `rfq:write` permission

An `asset_id` or a `group_key` is required, but not both

    {
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      max_amount: <Maximum Asset Units To Sell Numeric String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise

Example:

```js
import {addAssetSellOffer} from 'tapass';

await addAssetSellOffer({asset_id, max_amount: '1000000', tapd});
```

### addAssetSellOrder

Ask a peer for a quote to sell an asset over an asset channel

Use a sell order before you pay an invoice with an asset

Requires `rfq:write` permission

An `asset_id` or a `group_key` is required, but not both

A rate is a number of asset units per BTC, as an exact decimal string

When there is no `min_mtokens`, the quote must fill the `max_mtokens`. Use
`"0"` to accept a partial fill.

The default `timeout_seconds` is 60

`max_rate`, `min_mtokens`, and `is_fill_or_kill` need tapd v0.8.0 or later.
Older tapd versions ignore them.

    {
      [asset_id]: <Asset Id Hex String>
      expires_at: <Order Expires At ISO 8601 Date String>
      [group_key]: <Asset Group Key Hex String>
      [is_asset_channel_check_skipped]: <Skip Asset Channel Check Bool>
      [is_fill_or_kill]: <Reject a Quote That Does Not Fill the Maximum Bool>
      max_mtokens: <Maximum Payment Millitokens String>
      [max_rate]: <Maximum Rate Asset Units Per BTC Decimal String>
      [min_mtokens]: <Minimum Payment Millitokens String>
      peer_public_key: <Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      tapd: <Authenticated tapd API Object>
      [timeout_seconds]: <Wait For the Peer Quote Seconds Number>
    }

    @returns via cbk or Promise
    {
      [accepted_max_mtokens]: <Accepted Maximum Payment Millitokens String>
      amount: <Asset Units Numeric String>
      [asset_id]: <Asset Id Hex String>
      channel: <Channel To Pay Over Standard Format Channel Id String>
      expires_at: <Quote Expires At ISO 8601 Date String>
      [group_key]: <Asset Group BIP340 Public Key Hex String>
      id: <Quote Request Id Hex String>
      min_transportable_mtokens: <Minimum Millitokens To Send One Unit String>
      peer_public_key: <Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      rate: <Bid Rate Asset Units Per BTC Exact Decimal String>
    }

Example:

```js
import {addAssetSellOrder} from 'tapass';

const quote = await addAssetSellOrder({
  asset_id,
  expires_at: new Date(Date.now() + 60e3).toISOString(),
  max_mtokens: '1000000',
  peer_public_key,
  tapd,
});
```

### addAssetToMintBatch

Add an asset to the pending mint batch

Requires `mint:write` permission

tapd makes a new pending batch when there is no pending batch

A normal asset needs an `amount`. A collectible asset has an amount of 1.

Give metadata as hex with `metadata`, or as UTF-8 text with `metadata_text`,
not both. Set `is_json_metadata` when the metadata is a JSON object.

A `decimal_display` is not for collectibles. tapd also writes it into JSON
metadata. If the JSON metadata has a different decimal display, tapd fails.

To mint into an existing group, give a `group_key`, or a `group_anchor` that
names an asset in this batch that starts a new group.

`group_internal_key`, `group_tapscript_root`, `external_group_key`, and
`is_supply_committed` are only for an asset that starts a new group.

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
        [metadata_type]: <Metadata Type String> // json, opaque
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

### burnAsset

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

### cancelMintBatch

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

### createAssetAddress

Create a Taproot Assets address to receive an asset

Requires `addresses:write` permission

An `asset_id` or a `group_key` is required, but not both

When there is a `group_key` and no `version`, tapd makes a V2 address

    {
      [amount]: <Asset Units To Receive Numeric String>
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      [proof_courier]: <Proof Courier Address String>
      tapd: <Authenticated tapd API Object>
      [version]: <Address Version Number> // 0 || 1 || 2
    }

    @returns via cbk or Promise
    {
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
    }

Example:

```js
import {createAssetAddress} from 'tapass';

const {address} = await createAssetAddress({amount: '100', asset_id, tapd});
```

### createAssetInvoice

Create an invoice that is paid with an asset, over an asset channel

The channel peer buys the asset for satoshis, at a rate in an RFQ quote

tapd must run inside litd, with lnd and tapd in integrated mode

Requires `channels:write` permission

An `asset_id` or a `group_key` is required, but not both

One of `amount`, `tokens`, or `mtokens` is required. With `tokens` or
`mtokens`, the payer pays that satoshi value in the asset.

Use an `id` to make a hold invoice. A hold invoice has no `secret`.

A random `secret` is used when there is no `secret` and no `id`

When there is no `min_amount`, the quote must fill the `amount`. Use `"0"` to
accept a partial fill.

The asset amount must be at least the minimum transportable amount of the
quote. A smaller amount is a 400.

`min_amount`, `min_rate`, and `is_fill_or_kill` need tapd v0.8.0 or later.
Older tapd versions ignore them.

    {
      [amount]: <Asset Units To Receive Numeric String>
      [asset_id]: <Asset Id Hex String>
      [cltv_delta]: <Final CLTV Delta Number>
      [description]: <Invoice Description String>
      [description_hash]: <Hashed Description of Payment Hex String>
      [expires_at]: <Expires At ISO 8601 Date String>
      [group_key]: <Asset Group Key Hex String>
      [id]: <Hold Invoice Payment Hash Hex String>
      [is_fill_or_kill]: <Reject a Quote That Does Not Fill the Amount Bool>
      [is_including_private_channels]: <Include Private Channels Bool>
      [min_amount]: <Minimum Asset Units Numeric String>
      [min_rate]: <Minimum Rate Asset Units Per BTC Decimal String>
      [mtokens]: <Millitokens To Receive String>
      [peer_public_key]: <RFQ Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      [secret]: <Payment Preimage Hex String>
      tapd: <Authenticated tapd API Object>
      [tokens]: <Tokens To Receive Number>
    }

    @returns via cbk or Promise
    {
      [chain_address]: <Fallback Chain Address String>
      created_at: <Created At ISO 8601 Date String>
      [description]: <Invoice Description String>
      id: <Payment Hash Hex String>
      mtokens: <Millitokens To Receive String>
      [payment]: <Payment Identifier Hex String>
      [quote]: {
        [accepted_max_amount]: <Accepted Maximum Asset Units Numeric String>
        [asset_id]: <Asset Id Hex String>
        channel: <Channel To Pay Over Standard Format Channel Id String>
        expires_at: <Quote Expires At ISO 8601 Date String>
        [group_key]: <Asset Group BIP340 Public Key Hex String>
        id: <Quote Request Id Hex String>
        max_amount: <Maximum Asset Units Numeric String>
        min_transportable_amount: <Minimum Asset Units In One HTLC Numeric String>
        peer_public_key: <Peer Public Key Hex String>
        [price_oracle_metadata]: <Price Oracle Metadata String>
        rate: <Ask Rate Asset Units Per BTC Exact Decimal String>
      }
      request: <BOLT 11 Encoded Payment Request String>
      [secret]: <Payment Preimage Hex String>
      tokens: <Tokens To Receive Rounded Down Number>
    }

Example:

```js
import {createAssetInvoice} from 'tapass';

const {request} = await createAssetInvoice({amount: '100', asset_id, tapd});
```

### createTapdMacaroon

Create a tapd macaroon with specific permissions

tapd adds no caveats. Add caveats to the macaroon after you create it.

Use the entity `uri` and an RPC method URI as the action, to give access to
one RPC method

Requires `macaroon:write` permission

    {
      [is_external_allowed]: <Allow Permissions That tapd Does Not Know Bool>
      permissions: [{
        action: <Permission Action String>
        entity: <Permission Entity String>
      }]
      [root_key_id]: <Root Key Id Numeric String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      macaroon: <Macaroon Base64 String>
    }

Example:

```js
import {createTapdMacaroon} from 'tapass';

const {macaroon} = await createTapdMacaroon({
  permissions: [{action: 'read', entity: 'assets'}],
  tapd,
});
```

### decodeAssetAddress

Decode a Taproot Assets address

Requires `addresses:read` permission

The address must be for the network of tapd

    {
      address: <Encoded Taproot Assets Address String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
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
    }

Example:

```js
import {decodeAssetAddress} from 'tapass';

const {amount, asset_id} = await decodeAssetAddress({address, tapd});
```

### decodeAssetPaymentRequest

Decode a payment request and get its amount in units of an asset

tapd asks its price oracle for the asset rate

Requires `channels:read` permission

An `asset_id` or a `group_key` is required, but not both

    {
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      request: <BOLT 11 Payment Request String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      asset: {
        amount: <Asset Units To Pay Numeric String>
        [decimal_display]: <Decimal Places To Show Number>
        [group_key]: <Asset Group Key Hex String>
        id: <Asset Id Hex String>
        is_collectible: <Asset Is Collectible Bool>
        meta_hash: <Asset Metadata Hash Hex String>
        name: <Asset Name String>
      }
      chain_address: <Fallback Chain Address String>
      [cltv_delta]: <Final CLTV Delta Number>
      created_at: <Payment Request Created At ISO 8601 Date String>
      description: <Payment Description String>
      description_hash: <Payment Longer Description Hash Hex String>
      destination: <Public Key Hex String>
      expires_at: <ISO 8601 Date String>
      features: [{
        bit: <BOLT 09 Feature Bit Number>
        is_known: <Feature is Known Bool>
        is_required: <Feature Support is Required To Pay Bool>
        type: <Feature Type String>
      }]
      id: <Payment Hash Hex String>
      is_expired: <Invoice is Expired Bool>
      mtokens: <Requested Millitokens String>
      [payment]: <Payment Identifier Hex Encoded String>
      routes: [[{
        [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
        [channel]: <Standard Format Channel Id String>
        [cltv_delta]: <CLTV Blocks Delta Number>
        [fee_rate]: <Fee Rate In Millitokens Per Million Number>
        public_key: <Forward Edge Public Key Hex String>
      }]]
      safe_tokens: <Requested Tokens Rounded Up Number>
      tokens: <Requested Tokens Rounded Down Number>
    }

Example:

```js
import {decodeAssetPaymentRequest} from 'tapass';

const {asset, tokens} = await decodeAssetPaymentRequest({
  asset_id,
  request,
  tapd,
});
```

### decodeAssetProof

Decode an asset proof or one proof in an asset proof file

Requires `proofs:read` permission

For a proof file, `depth` selects the proof: 0 is the last proof

    {
      [depth]: <Proof Depth From the Last Proof In the File Number>
      [is_including_meta]: <Include the Asset Metadata Bool>
      proof: <Asset Proof or Proof File Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      additional_inputs_count: <Additional Inputs Count Number>
      [alt_leaves]: <Alternative Leaves Hex String>
      asset: <Asset Object>
      challenge_witness: [<Challenge Witness Element Hex String>]
      depth: <Proof Depth From the Last Proof In the File Number>
      exclusion_proofs: [<Exclusion Proof Hex String>]
      [genesis]: {
        asset_id: <Asset Id Hex String>
        is_collectible: <Asset Is Collectible Bool>
        meta_hash: <Asset Metadata Hash Hex String>
        name: <Asset Name String>
        output_index: <Genesis Commitment Output Index Number>
        transaction_id: <Genesis Point Transaction Id Hex String>
        transaction_vout: <Genesis Point Transaction Output Index Number>
      }
      [group_key]: {
        raw_key: <Raw Group Key Hex String>
        [tapscript_root]: <Group Tapscript Root Hex String>
      }
      inclusion_proof: <Inclusion Proof Hex String>
      is_burn: <Proof Is For a Burn Bool>
      [meta]: {
        data: <Metadata Hex String>
        hash: <Metadata Hash Hex String>
        type: <Metadata Type String>
      }
      proofs_count: <Proofs In the File Count Number>
      [split_root_proof]: <Split Root Proof Hex String>
      transaction_merkle_proof: <Transaction Merkle Proof Hex String>
    }

Example:

```js
import {decodeAssetProof} from 'tapass';

const {asset} = await decodeAssetProof({proof, tapd});
```

### encodeAssetCustomRecords

Encode the first hop custom records of an asset payment

Use the records as the first hop custom records of an lnd payment, to pay
with assets over an asset channel

This method does not need a permission

An `rfq_id` is for a payment that uses an accepted RFQ quote

`assets` or an `rfq_id` is required

    {
      [assets]: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
      }]
      [rfq_id]: <RFQ Quote Id Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      records: [{
        type: <Record Type Number String>
        value: <Record Value Hex String>
      }]
    }

Example:

```js
import {encodeAssetCustomRecords} from 'tapass';

const {records} = await encodeAssetCustomRecords({
  assets: [{amount: '100', asset_id}],
  tapd,
});
```

### exportAssetProof

Export the proof file of an asset

Requires `proofs:read` permission

If there is more than one proof for the asset id and the script key, an
anchor outpoint is necessary: `transaction_id` and `transaction_vout`

    {
      asset_id: <Asset Id Hex String>
      script_key: <Script Key Hex String>
      tapd: <Authenticated tapd API Object>
      [transaction_id]: <Anchor Transaction Id Hex String>
      [transaction_vout]: <Anchor Transaction Output Index Number>
    }

    @returns via cbk or Promise
    {
      proof: <Asset Proof File Hex String>
    }

Example:

```js
import {exportAssetProof} from 'tapass';

const {proof} = await exportAssetProof({asset_id, script_key, tapd});
```

### finalizeMintBatch

Finalize the pending mint batch, and broadcast the genesis transaction

Requires `mint:write` permission

tapd funds the batch first when it is not funded yet

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
        [metadata_type]: <Metadata Type String> // json, opaque
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

### fundMintBatch

Fund the pending mint batch with a genesis input

Requires `mint:write` permission

This is only necessary when the batch needs a custom witness before
`finalizeMintBatch`. tapd makes a new funded batch when there is no pending
batch.

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
        [metadata_type]: <Metadata Type String> // json, opaque
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
        [metadata_type]: <Metadata Type String> // json, opaque
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

### getAcceptedQuotes

Get the quotes that peers accepted for the orders of this node

Requires `rfq:read` permission

A rate is a number of asset units per BTC, as an exact decimal string

    {
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      buy_quotes: [{
        [accepted_max_amount]: <Accepted Maximum Asset Units Numeric String>
        [asset_id]: <Asset Id Hex String>
        channel: <Channel To Pay Over Standard Format Channel Id String>
        expires_at: <Quote Expires At ISO 8601 Date String>
        [group_key]: <Asset Group BIP340 Public Key Hex String>
        id: <Quote Request Id Hex String>
        max_amount: <Maximum Asset Units Numeric String>
        min_transportable_amount: <Minimum Asset Units In One HTLC String>
        peer_public_key: <Peer Public Key Hex String>
        [price_oracle_metadata]: <Price Oracle Metadata String>
        rate: <Ask Rate Asset Units Per BTC Exact Decimal String>
      }]
      sell_quotes: [{
        [accepted_max_mtokens]: <Accepted Maximum Payment Millitokens String>
        amount: <Asset Units Numeric String>
        [asset_id]: <Asset Id Hex String>
        channel: <Channel To Pay Over Standard Format Channel Id String>
        expires_at: <Quote Expires At ISO 8601 Date String>
        [group_key]: <Asset Group BIP340 Public Key Hex String>
        id: <Quote Request Id Hex String>
        min_transportable_mtokens: <Minimum Millitokens To Send One Unit String>
        peer_public_key: <Peer Public Key Hex String>
        [price_oracle_metadata]: <Price Oracle Metadata String>
        rate: <Bid Rate Asset Units Per BTC Exact Decimal String>
      }]
    }

Example:

```js
import {getAcceptedQuotes} from 'tapass';

const {buy_quotes, sell_quotes} = await getAcceptedQuotes({tapd});
```

### getAssetAddresses

Get the Taproot Assets addresses that this node created, oldest first

Requires `addresses:read` permission

Use the `next` token with the same filters to get the next page

    {
      [created_after]: <Created After ISO 8601 Date String>
      [created_before]: <Created Before ISO 8601 Date String>
      [limit]: <Page Result Limit Number>
      tapd: <Authenticated tapd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
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
      [next]: <Next Opaque Paging Token String>
    }

Example:

```js
import {getAssetAddresses} from 'tapass';

const {addresses} = await getAssetAddresses({tapd});
```

### getAssetBalances

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

### getAssetBurns

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

### getAssetForwards

Get the asset swaps that this edge node forwarded

Requires `rfq:read` permission

This method needs tapd v0.8.0 or later

Use the `next` token with the same filters to get the next page

A rate is a number of asset units per BTC, as an exact decimal string

    {
      [after]: <Settled At Or After ISO 8601 Date String>
      [asset_id]: <Asset Id Hex String>
      [before]: <Settled At Or Before ISO 8601 Date String>
      [group_key]: <Asset Group Key Hex String>
      [limit]: <Page Result Limit Number>
      [peer_public_key]: <Peer Public Key Hex String>
      tapd: <Authenticated tapd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      forwards: [{
        amount: <Swapped Asset Units Numeric String>
        [asset_id]: <Asset Id Hex String>
        [failed_at]: <Forward Failed At ISO 8601 Date String>
        [group_key]: <Asset Group BIP340 Public Key Hex String>
        htlc_index: <Incoming HTLC Index Numeric String>
        incoming_channel: <Incoming Standard Format Channel Id String>
        incoming_mtokens: <Received Millitokens String>
        opened_at: <Forward Started At ISO 8601 Date String>
        outgoing_channel: <Outgoing Standard Format Channel Id String>
        outgoing_mtokens: <Sent Millitokens String>
        [peer_public_key]: <Peer Public Key Hex String>
        [rate]: <Rate Asset Units Per BTC Exact Decimal String>
        rfq_id: <RFQ Session Id Hex String>
        [settled_at]: <Forward Settled At ISO 8601 Date String>
        type: <Edge Node Policy Type String> // purchase, sale
      }]
      [next]: <Next Opaque Paging Token String>
    }

Example:

```js
import {getAssetForwards} from 'tapass';

const {forwards, next} = await getAssetForwards({limit: 10, tapd});
```

### getAssetGroups

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

### getAssetInvoices

Get invoices that received an asset, newest first

lnd pages over all invoices, then tapd keeps only the asset invoices, so a
page can have fewer invoices than the limit. Use `next` until it is empty.

Requires `channels:read` permission

This method needs tapd v0.8.1 or later

The invoice fields are the same as in lightning getInvoices

    {
      [created_after]: <Created At or After ISO 8601 Date String>
      [created_before]: <Created At or Before ISO 8601 Date String>
      [is_unconfirmed]: <Only Unconfirmed Invoices Bool>
      [limit]: <Page Result Limit Number>
      tapd: <Authenticated tapd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      invoices: [{
        assets: [{
          amount: <Asset Units Numeric String>
          asset_id: <Asset Id Hex String>
          [group_key]: <Asset Group Key Hex String>
        }]
        [chain_address]: <Fallback Chain Address String>
        cltv_delta: <Final CLTV Delta Number>
        [confirmed_at]: <Settled at ISO 8601 Date String>
        [confirmed_index]: <Confirmed Index Number>
        created_at: <ISO 8601 Date String>
        description: <Description String>
        [description_hash]: <Description Hash Hex String>
        expires_at: <ISO 8601 Date String>
        features: [{
          bit: <BOLT 09 Feature Bit Number>
          is_known: <Feature is Known Bool>
          is_required: <Feature Support is Required To Pay Bool>
          type: <Feature Type String>
        }]
        id: <Payment Hash Hex String>
        index: <Invoice Add Index Number>
        [is_canceled]: <Invoice is Canceled Bool>
        is_confirmed: <Invoice is Confirmed Bool>
        [is_held]: <HTLC is Held Bool>
        is_private: <Invoice is Private Bool>
        [is_push]: <Invoice is Push Payment Bool>
        mtokens: <Millitokens String>
        [payment]: <Payment Identifying Secret Hex String>
        payments: [<lightning Invoice Payment Object>]
        received: <Received Tokens Number>
        received_mtokens: <Received Millitokens String>
        [request]: <Bolt 11 Invoice String>
        secret: <Secret Preimage Hex String>
        tokens: <Tokens Number>
      }]
      [next]: <Next Opaque Paging Token String>
    }

Example:

```js
import {getAssetInvoices} from 'tapass';

const {invoices, next} = await getAssetInvoices({limit: 10, tapd});
```

### getAssetMetadata

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

### getAssetPayments

Get confirmed payments that sent an asset, newest first

lnd pages over all payments, then tapd keeps only the asset payments, so a
page can have fewer payments than the limit. Use `next` until it is empty.

Requires `channels:read` permission

This method needs tapd v0.8.1 or later

The payment fields are the same as in lightning getPayments

    {
      [created_after]: <Created At or After ISO 8601 Date String>
      [created_before]: <Created At or Before ISO 8601 Date String>
      [limit]: <Page Result Limit Number>
      tapd: <Authenticated tapd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      payments: [{
        assets: [{
          amount: <Asset Units Numeric String>
          asset_id: <Asset Id Hex String>
          [group_key]: <Asset Group Key Hex String>
        }]
        attempts: [<lightning Payment Attempt Object>]
        [confirmed_at]: <Payment Confirmed At ISO 8601 Date String>
        created_at: <Payment at ISO-8601 Date String>
        [destination]: <Destination Node Public Key Hex String>
        [fee]: <Paid Routing Fee Rounded Down Tokens Number>
        [fee_mtokens]: <Paid Routing Fee in Millitokens String>
        hops: [<First Route Hop Public Key Hex String>]
        id: <Payment Preimage Hash String>
        [index]: <Payment Add Index Number>
        is_confirmed: <Payment is Confirmed Bool>
        is_outgoing: <Transaction Is Outgoing Bool>
        mtokens: <Millitokens Sent to Destination String>
        [request]: <BOLT 11 Payment Request String>
        [safe_fee]: <Payment Forwarding Fee Rounded Up Tokens Number>
        safe_tokens: <Payment Tokens Rounded Up Number>
        [secret]: <Payment Preimage Hex String>
        tokens: <Rounded Down Tokens Sent to Destination Number>
      }]
      [next]: <Next Opaque Paging Token String>
    }

Example:

```js
import {getAssetPayments} from 'tapass';

const {payments, next} = await getAssetPayments({limit: 10, tapd});
```

### getAssetReceives

Get the inbound asset transfers to Taproot Assets addresses, newest first

Requires `addresses:read` permission

Use the `next` token with the same filters to get the next page

The maximum `limit` is 16384

    {
      [address]: <Encoded Taproot Assets Address String>
      [created_after]: <Created After ISO 8601 Date String>
      [created_before]: <Created Before ISO 8601 Date String>
      [limit]: <Page Result Limit Number>
      [status]: <Receive Status String>
      tapd: <Authenticated tapd API Object>
      [token]: <Opaque Paging Token String>
    }

    @returns via cbk or Promise
    {
      [next]: <Next Opaque Paging Token String>
      receives: [{
        address: {
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
        }
        [confirmation_height]: <Confirmation Block Height Number>
        created_at: <Receive Detected At ISO 8601 Date String>
        is_proof_available: <Proof File Is Available Bool>
        status: <Receive Status String>
        [tapscript_sibling]: <Tapscript Sibling Hash Hex String>
        tokens: <Satoshis In the Anchor Output Number>
        transaction_id: <Anchor Transaction Id Hex String>
        transaction_vout: <Anchor Transaction Output Index Number>
      }]
    }

Example:

```js
import {getAssetReceives} from 'tapass';

const {receives} = await getAssetReceives({tapd});
```

### getAssets

Get the assets that this node owns

Requires `assets:read` permission

By default, tapd includes only assets with a BIP-86 script key. Use
`script_key_type` to get other assets, for example assets in channels.

An `asset_id` or a `group_key` is a filter, but not both. An `asset_id` needs
tapd v0.8.0 or later, and it does not support paging or amount filters.

Spent assets and leased assets are not supported together.

Use the `next` token with the same filters to get the next page.

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

### getAssetTransfers

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

### getAssetUtxos

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

### getMintBatches

Get mint batches, including pending and cancelled batches

Requires `mint:read` permission

With `is_verbose`, a funded pending batch has the group details of its
unsealed assets, and tapd does not return unfunded or empty batches.

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
          [metadata_type]: <Metadata Type String> // json, opaque
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
          [metadata_type]: <Metadata Type String> // json, opaque
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

### getTapdInfo

Get information about tapd and its lnd node

Requires `daemon:read` permission

    {
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      alias: <lnd Node Alias String>
      current_block_hash: <Best Chain Block Hash Hex String>
      current_block_height: <Best Chain Block Height Number>
      is_synced_to_chain: <tapd Is Synced To Chain Bool>
      lnd_version: <lnd Version String>
      network: <Network Name String>
      public_key: <lnd Identity Public Key Hex String>
      version: <tapd Version String>
    }

Example:

```js
import {getTapdInfo} from 'tapass';

const {is_synced_to_chain, version} = await getTapdInfo({tapd});
```

### openAssetChannel

Open a channel that is funded with an asset

The peer must be connected. tapd sets the satoshi amount of the channel.

tapd must run inside litd, with lnd and tapd in integrated mode

Requires `channels:write` permission

An `asset_id` or a `group_key` is required, but not both

`give_tokens` is a gift to the peer, in the same way as with openChannel

    {
      amount: <Asset Units To Fund the Channel With Numeric String>
      [asset_id]: <Asset Id Hex String>
      chain_fee_tokens_per_vbyte: <Chain Fee Tokens Per Virtual Byte Number>
      [give_tokens]: <Tokens To Give To the Peer Number>
      [group_key]: <Asset Group Key Hex String>
      partner_public_key: <Connected Peer Public Key Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      transaction_id: <Funding Transaction Id Hex String>
      transaction_vout: <Funding Transaction Output Index Number>
    }

Example:

```js
import {openAssetChannel} from 'tapass';

const {transaction_id} = await openAssetChannel({
  amount: '1000',
  asset_id,
  chain_fee_tokens_per_vbyte: 2,
  partner_public_key,
  tapd,
});
```

### payAssetInvoice

Pay a payment request with an asset, over an asset channel

The channel peer sells satoshis for the asset, at a rate in an RFQ quote

tapd must run inside litd, with lnd and tapd in integrated mode

Requires `channels:write` permission

An `asset_id` or a `group_key` is required, but not both

Use an `rfq_id` of an accepted sell quote to pay with that quote

Without `max_fee` or `max_fee_mtokens`, only routes with no fee are used,
the same as lnd

The default `pathfinding_timeout` is 25 seconds. The default `max_paths` is 1.

tapd rejects a payment that is too small to carry one asset unit, unless
`is_overpay_allowed` is set

A payment request that is already paid is a 409

    {
      [asset_id]: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      [is_overpay_allowed]: <Allow a Payment Above the Request Amount Bool>
      [max_fee]: <Maximum Fee Tokens Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens String>
      [max_paths]: <Maximum Payment Paths Number>
      [pathfinding_timeout]: <Time To Spend Finding a Route Milliseconds Number>
      [peer_public_key]: <RFQ Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      request: <BOLT 11 Payment Request String>
      [rfq_id]: <Accepted Sell Quote Id Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      confirmed_at: <Payment Confirmed At ISO 8601 Date String>
      created_at: <Payment Created At ISO 8601 Date String>
      destination: <Payment Destination Public Key Hex String>
      fee: <Total Fee Tokens Paid Rounded Down Number>
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      [index]: <Payment Index Number String>
      mtokens: <Total Millitokens Paid String>
      paths: [{
        fee_mtokens: <Total Fee Millitokens Paid String>
        hops: [<Hop Object>]
        mtokens: <Total Millitokens Paid String>
      }]
      quotes: [{
        [accepted_max_mtokens]: <Accepted Maximum Payment Millitokens String>
        amount: <Asset Units Numeric String>
        [asset_id]: <Asset Id Hex String>
        channel: <Channel To Pay Over Standard Format Channel Id String>
        expires_at: <Quote Expires At ISO 8601 Date String>
        [group_key]: <Asset Group BIP340 Public Key Hex String>
        id: <Quote Request Id Hex String>
        min_transportable_mtokens: <Minimum Millitokens To Send One Unit String>
        peer_public_key: <Peer Public Key Hex String>
        [price_oracle_metadata]: <Price Oracle Metadata String>
        rate: <Bid Rate Asset Units Per BTC Exact Decimal String>
      }]
      [request]: <BOLT 11 Payment Request String>
      safe_fee: <Total Fee Tokens Paid Rounded Up Number>
      safe_tokens: <Total Tokens Paid, Rounded Up Number>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Paid Rounded Down Number>
    }

Example:

```js
import {payAssetInvoice} from 'tapass';

const {fee, secret} = await payAssetInvoice({asset_id, request, tapd});
```

### registerAssetTransfer

Register an inbound asset transfer that has no Taproot Assets address

Use this for an interactive transfer, when the sender sent the proof by a
different way. The proof must already be in the local universe, and the
script key must already be known to this node.

Requires `assets:write` permission

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

### sealMintBatch

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
        [metadata_type]: <Metadata Type String> // json, opaque
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

### sendAsset

Send assets to Taproot Assets addresses

Requires `assets:write` permission

All addresses must be for the same asset id or asset group

An `amount` is only for an address without an amount, for example a V2
address. When an address has an `amount`, tapd v0.8.0 or later is
necessary.

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

### sendAssetKeysend

Send an asset to a channel peer with a keysend payment

tapd only sends an asset keysend payment to a direct asset channel peer

tapd must run inside litd, with lnd and tapd in integrated mode

Requires `channels:write` permission

An `asset_id` or a `group_key` is required, but not both

The default `tokens` is 354, the smallest amount that tapd accepts

A random `secret` is used when there is no `secret`

Without `max_fee` or `max_fee_mtokens`, only routes with no fee are used,
the same as lnd

    {
      amount: <Asset Units To Send Numeric String>
      [asset_id]: <Asset Id Hex String>
      destination: <Destination Peer Public Key Hex String>
      [group_key]: <Asset Group Key Hex String>
      [max_fee]: <Maximum Fee Tokens Number>
      [max_fee_mtokens]: <Maximum Fee Millitokens String>
      [max_paths]: <Maximum Payment Paths Number>
      [pathfinding_timeout]: <Time To Spend Finding a Route Milliseconds Number>
      [peer_public_key]: <RFQ Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      [secret]: <Payment Preimage Hex String>
      tapd: <Authenticated tapd API Object>
      [tokens]: <Tokens That Carry the Asset Units Number>
    }

    @returns via cbk or Promise
    {
      confirmed_at: <Payment Confirmed At ISO 8601 Date String>
      created_at: <Payment Created At ISO 8601 Date String>
      destination: <Payment Destination Public Key Hex String>
      fee: <Total Fee Tokens Paid Rounded Down Number>
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [{
        channel: <Standard Format Channel Id String>
        channel_capacity: <Channel Capacity Tokens Number>
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        timeout: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      [index]: <Payment Index Number String>
      mtokens: <Total Millitokens Paid String>
      paths: [{
        fee_mtokens: <Total Fee Millitokens Paid String>
        hops: [<Hop Object>]
        mtokens: <Total Millitokens Paid String>
      }]
      quotes: [<Accepted Sell Quote Object>]
      safe_fee: <Total Fee Tokens Paid Rounded Up Number>
      safe_tokens: <Total Tokens Paid, Rounded Up Number>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Paid Rounded Down Number>
    }

Example:

```js
import {sendAssetKeysend} from 'tapass';

const {fee, secret} = await sendAssetKeysend({
  amount: '100',
  asset_id,
  destination,
  tapd,
});
```

### setTapdDebugLevel

Set the log level of tapd

Use a level for all subsystems, for example `debug`, or a level for each
subsystem, for example `TADB=trace,FRTR=info`

Requires `daemon:write` permission

    {
      level: <Log Level Specification String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise

Example:

```js
import {setTapdDebugLevel} from 'tapass';

await setTapdDebugLevel({level: 'debug', tapd});
```

### stopTapd

Stop tapd

Requires `daemon:write` permission

    {
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise

Example:

```js
import {stopTapd} from 'tapass';

await stopTapd({tapd});
```

### subscribeToAssetInvoices

Subscribe to invoices that receive an asset

tapd only sends updates of invoices that involve an asset

Use `added_after` and `confirmed_after` to get past updates after an index

Requires `channels:read` permission

This method needs tapd v0.8.1 or later

The invoice fields are the same as in lightning getInvoices

    {
      [added_after]: <Invoice Add Index To Start After Number>
      [confirmed_after]: <Invoice Confirmed Index To Start After Number>
      tapd: <Authenticated tapd API Object>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'invoice_updated'
    {
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      created_at: <ISO 8601 Date String>
      id: <Payment Hash Hex String>
      index: <Invoice Add Index Number>
      is_confirmed: <Invoice is Confirmed Bool>
      ...<lightning Invoice Object>
    }

Example:

```js
import {subscribeToAssetInvoices} from 'tapass';

const sub = subscribeToAssetInvoices({tapd});

sub.on('invoice_updated', invoice => console.log(invoice));
```

### subscribeToAssetPayments

Subscribe to the status of current outgoing asset payments

The events are the same as in lightning subscribeToPayments, and each
event also has the asset amounts of the payment

tapd only sends updates of payments that involve an asset

Requires `channels:read` permission

This method needs tapd v0.8.1 or later

    {
      tapd: <Authenticated tapd API Object>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'confirmed'
    {
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      confirmed_at: <Payment Confirmed At ISO 8601 Date String>
      ...<lightning Confirmed Payment Object>
    }

    @event 'failed'
    {
      assets: [<Asset Amount Object>]
      id: <Payment Hash Hex String>
      is_canceled: <Payment Canceled Bool>
      is_insufficient_balance: <Failed Due To Lack of Balance Bool>
      is_invalid_payment: <Failed Due to Payment Rejected At Destination Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Absence of Path Through Graph Bool>
    }

    @event 'paying'
    {
      assets: [<Asset Amount Object>]
      created_at: <Payment Created At ISO 8601 Date String>
      ...<lightning Pending Payment Object>
    }

Example:

```js
import {subscribeToAssetPayments} from 'tapass';

const sub = subscribeToAssetPayments({tapd});

sub.on('confirmed', payment => console.log(payment));
```

### subscribeToAssetReceives

Subscribe to inbound asset transfers to Taproot Assets addresses

Requires `assets:read` permission

With `created_after`, tapd also sends the past events after that date

    {
      [address]: <Encoded Taproot Assets Address String>
      [created_after]: <Replay Events After ISO 8601 Date String>
      tapd: <Authenticated tapd API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'receive'
    {
      address: {
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
      }
      [confirmation_height]: <Confirmation Block Height Number>
      [error]: <Receive Error String>
      status: <Receive Status String>
      [transaction_id]: <Anchor Transaction Id Hex String>
      [transaction_vout]: <Anchor Transaction Output Index Number>
      updated_at: <Updated At ISO 8601 Date String>
    }

Example:

```js
import {subscribeToAssetReceives} from 'tapass';

const sub = subscribeToAssetReceives({tapd});

sub.on('receive', receive => console.log(receive));
```

### subscribeToAssetSends

Subscribe to the state changes of outbound asset sends

Requires `assets:read` permission

A `start_at` date in the past replays the events from that date. Without a
`start_at`, the events start now.

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
      parcel_type: <Parcel Type String> // address, pending, pre_anchored, ...
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

Example:

```js
import {subscribeToAssetSends} from 'tapass';

const sub = subscribeToAssetSends({tapd});

sub.on('send', send => console.log(send));
```

### subscribeToMintEvents

Subscribe to the state changes of mint batches

Requires `mint:read` permission

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
          [metadata_type]: <Metadata Type String> // json, opaque
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

Example:

```js
import {subscribeToMintEvents} from 'tapass';

const sub = subscribeToMintEvents({tapd});

sub.on('batch', ({at, batch}) => console.log(at, batch.state));
```

### subscribeToPastAssetPayment

Subscribe to the status of a past asset payment

The events are the same as in lightning subscribeToPastPayment, and each
event also has the asset amounts of the payment

tapd only sends updates of a payment that involves an asset

Requires `channels:read` permission

This method needs tapd v0.8.1 or later

    {
      id: <Payment Hash Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @throws
    <Error>

    @returns
    <Subscription EventEmitter Object>

    @event 'confirmed'
    {
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      confirmed_at: <Payment Confirmed At ISO 8601 Date String>
      ...<lightning Confirmed Payment Object>
    }

    @event 'failed'
    {
      assets: [<Asset Amount Object>]
      id: <Payment Hash Hex String>
      is_canceled: <Payment Canceled Bool>
      is_insufficient_balance: <Failed Due To Lack of Balance Bool>
      is_invalid_payment: <Failed Due to Payment Rejected At Destination Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Absence of Path Through Graph Bool>
    }

    @event 'paying'
    {
      assets: [<Asset Amount Object>]
      created_at: <Payment Created At ISO 8601 Date String>
      ...<lightning Pending Payment Object>
    }

Example:

```js
import {subscribeToPastAssetPayment} from 'tapass';

const sub = subscribeToPastAssetPayment({id, tapd});

sub.on('confirmed', payment => console.log(payment));
```

### subscribeToRfqEvents

Subscribe to RFQ events

Requires `rfq:read` permission

A rate is a number of asset units per BTC, as an exact decimal string

    {
      tapd: <Authenticated tapd API Object>
    }

    @throws
    <Error>

    @returns
    <EventEmitter Object>

    @event 'accepted_buy_quote'
    {
      [accepted_max_amount]: <Accepted Maximum Asset Units Numeric String>
      [asset_id]: <Asset Id Hex String>
      at: <Event At ISO 8601 Date String>
      channel: <Channel To Pay Over Standard Format Channel Id String>
      expires_at: <Quote Expires At ISO 8601 Date String>
      [group_key]: <Asset Group BIP340 Public Key Hex String>
      id: <Quote Request Id Hex String>
      max_amount: <Maximum Asset Units Numeric String>
      min_transportable_amount: <Minimum Asset Units In One HTLC Numeric String>
      peer_public_key: <Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      rate: <Ask Rate Asset Units Per BTC Exact Decimal String>
    }

    @event 'accepted_htlc'
    {
      at: <Event At ISO 8601 Date String>
      channel: <Payment Standard Format Channel Id String>
    }

    @event 'accepted_sell_quote'
    {
      [accepted_max_mtokens]: <Accepted Maximum Payment Millitokens String>
      amount: <Asset Units Numeric String>
      [asset_id]: <Asset Id Hex String>
      at: <Event At ISO 8601 Date String>
      channel: <Channel To Pay Over Standard Format Channel Id String>
      expires_at: <Quote Expires At ISO 8601 Date String>
      [group_key]: <Asset Group BIP340 Public Key Hex String>
      id: <Quote Request Id Hex String>
      min_transportable_mtokens: <Minimum Millitokens To Send One Unit String>
      peer_public_key: <Peer Public Key Hex String>
      [price_oracle_metadata]: <Price Oracle Metadata String>
      rate: <Bid Rate Asset Units Per BTC Exact Decimal String>
    }

    @event 'end'

    @event 'error'
    [<Error Code Number>, <Error Message String>, <Error Details Object>]

Example:

```js
import {subscribeToRfqEvents} from 'tapass';

const sub = subscribeToRfqEvents({tapd});

sub.on('accepted_buy_quote', quote => console.log(quote));
```

### unpackAssetProofFile

Get the individual proofs in an asset proof file

Requires `proofs:read` permission

The first proof in the list is the first proof in the proof chain

    {
      proof: <Asset Proof File Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      proofs: [<Asset Proof Hex String>]
    }

Example:

```js
import {unpackAssetProofFile} from 'tapass';

const {proofs} = await unpackAssetProofFile({proof, tapd});
```

### verifyAssetProof

Verify an asset proof file

Requires `proofs:read` permission

A valid proof file also returns its last proof, decoded

    {
      proof: <Asset Proof File Hex String>
      tapd: <Authenticated tapd API Object>
    }

    @returns via cbk or Promise
    {
      is_valid: <Proof File Is Valid Bool>
      [proof]: {
        additional_inputs_count: <Additional Inputs Count Number>
        [alt_leaves]: <Alternative Leaves Hex String>
        asset: <Asset Object>
        challenge_witness: [<Challenge Witness Element Hex String>]
        depth: <Proof Depth From the Last Proof In the File Number>
        exclusion_proofs: [<Exclusion Proof Hex String>]
        [genesis]: {
          asset_id: <Asset Id Hex String>
          is_collectible: <Asset Is Collectible Bool>
          meta_hash: <Asset Metadata Hash Hex String>
          name: <Asset Name String>
          output_index: <Genesis Commitment Output Index Number>
          transaction_id: <Genesis Point Transaction Id Hex String>
          transaction_vout: <Genesis Point Transaction Output Index Number>
        }
        [group_key]: {
          raw_key: <Raw Group Key Hex String>
          [tapscript_root]: <Group Tapscript Root Hex String>
        }
        inclusion_proof: <Inclusion Proof Hex String>
        is_burn: <Proof Is For a Burn Bool>
        proofs_count: <Proofs In the File Count Number>
        [split_root_proof]: <Split Root Proof Hex String>
        transaction_merkle_proof: <Transaction Merkle Proof Hex String>
      }
    }

Example:

```js
import {verifyAssetProof} from 'tapass';

const {is_valid} = await verifyAssetProof({proof, tapd});
```

## Errors

Methods return errors as arrays: `[code, 'ErrorMessage', {err}]`.

- `400`: An argument is not correct.
- `403`: The macaroon does not have the permission for the method.
- `404`: tapd does not have the item, for example an asset.
- `409`: The item already exists, for example a proof.
- `501`: tapd does not have the RPC or the feature. Some RPCs need a newer tapd.
- `503`: tapd returned an error, or tapd is not available.

## Development

    pnpm install
    pnpm test
    pnpm lint
    pnpm build

To copy the protos of a different tapd release into `protos/`:

    pnpm sync-protos v0.8.5
