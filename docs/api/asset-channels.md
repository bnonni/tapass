# Asset Channels

Channels that are funded with an asset, and the invoices and payments over these channels.

- [createAssetInvoice](#createassetinvoice): Create an invoice that is paid with an asset, over an asset channel
- [decodeAssetPaymentRequest](#decodeassetpaymentrequest): Decode a payment request and get its amount in units of an asset
- [encodeAssetCustomRecords](#encodeassetcustomrecords): Encode the first hop custom records of an asset payment
- [getAssetInvoices](#getassetinvoices): Get asset invoices, newest first
- [getAssetPayments](#getassetpayments): Get confirmed payments that sent an asset, newest first
- [openAssetChannel](#openassetchannel): Open a channel that is funded with an asset
- [payAssetInvoice](#payassetinvoice): Pay a payment request with an asset, over an asset channel
- [sendAssetKeysend](#sendassetkeysend): Send an asset to a channel peer with a keysend payment
- [subscribeToAssetInvoices](#subscribetoassetinvoices): Subscribe to invoices that receive an asset
- [subscribeToAssetPayments](#subscribetoassetpayments): Subscribe to the status of current outgoing asset payments
- [subscribeToPastAssetPayment](#subscribetopastassetpayment): Subscribe to the status of a past asset payment

## createAssetInvoice

Create an invoice that is paid with an asset, over an asset channel

The channel peer buys the asset for satoshis, at a rate in an RFQ quote

tapd must run inside litd, with lnd and tapd in integrated mode

Requires `channels:write` permission

An `asset_id` or a `group_key` is required, but not both

Exactly one of `amount`, `tokens`, or `mtokens` is required. With `tokens`
or `mtokens`, the payer pays that satoshi value in the asset.

Use an `id` to make a hold invoice. Do not give a `secret` with an `id`.

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

## decodeAssetPaymentRequest

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
      [chain_address]: <Fallback Chain Address String>
      [cltv_delta]: <Final CLTV Delta Number>
      created_at: <Payment Request Created At ISO 8601 Date String>
      description: <Payment Description String>
      [description_hash]: <Payment Longer Description Hash Hex String>
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

## encodeAssetCustomRecords

Encode the first hop custom records of an asset payment

Use the records as the first hop custom records of an lnd payment, to pay
with assets over an asset channel

This method does not need a permission

An `rfq_id` is for a payment that uses an accepted RFQ quote

`assets` or an `rfq_id` is required

Each `asset_id` in `assets` must be unique. The records are in ascending
`type` order.

tapd v0.8.5 marks the EncodeCustomRecords RPC as deprecated

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

## getAssetInvoices

Get asset invoices, newest first

lnd pages over all invoices, then tapd keeps only the asset invoices, so a
page can have fewer invoices than the limit. Use `next` until it is empty.

Requires `channels:read` permission

This method needs tapd v0.8.1 or later

The invoice fields are the same as in lightning getInvoices. `assets` has the
asset units of settled HTLCs only, so an unpaid invoice has no `assets`.

A `limit` and a `token` are not supported together. The default
`limit` is 100.

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
        payments: [{
          [canceled_at]: <Payment Canceled At ISO 8601 Date String>
          [confirmed_at]: <Payment Settled At ISO 8601 Date String>
          created_at: <Payment Held Since ISO 8601 Date String>
          created_height: <Payment Held Since Block Height Number>
          in_channel: <Incoming Payment Through Channel Id String>
          is_canceled: <Payment is Canceled Bool>
          is_confirmed: <Payment is Confirmed Bool>
          is_held: <Payment is Held Bool>
          messages: [{
            type: <Message Type Number String>
            value: <Raw Value Hex String>
          }]
          mtokens: <Incoming Payment Millitokens String>
          [pending_index]: <Pending Payment Channel HTLC Index Number>
          timeout: <HTLC CLTV Timeout Height Number>
          tokens: <Payment Tokens Number>
          [total_mtokens]: <Total Millitokens String>
        }]
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

## getAssetPayments

Get confirmed payments that sent an asset, newest first

lnd pages over all payments, then tapd keeps only the asset payments, so a
page can have fewer payments than the limit. Use `next` until it is empty.

Requires `channels:read` permission

This method needs tapd v0.8.1 or later

The payment fields are the same as in lightning getPayments

A `limit` and a `token` are not supported together. The default
`limit` is 250.

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
        attempts: [{
          [confirmed_at]: <Payment Attempt Succeeded At ISO 8601 Date String>
          created_at: <Attempt Was Started At ISO 8601 Date String>
          [failed_at]: <Payment Attempt Failed At ISO 8601 Date String>
          is_confirmed: <Payment Attempt Succeeded Bool>
          is_failed: <Payment Attempt Failed Bool>
          is_pending: <Payment Attempt is Waiting For Resolution Bool>
          route: {
            fee: <Route Fee Tokens Number>
            fee_mtokens: <Route Fee Millitokens String>
            hops: [{
              channel: <Standard Format Channel Id String>
              fee: <Fee Tokens Rounded Down Number>
              fee_mtokens: <Fee Millitokens String>
              forward: <Forward Tokens Number>
              forward_mtokens: <Forward Millitokens String>
              public_key: <Forward Edge Public Key Hex String>
              [timeout]: <Timeout Block Height Number>
            }]
            mtokens: <Total Fee-Inclusive Millitokens String>
            [payment]: <Payment Identifier Hex String>
            [timeout]: <Timeout Block Height Number>
            tokens: <Total Fee-Inclusive Tokens Number>
            [total_mtokens]: <Total Payment Millitokens String>
          }
        }]
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

## openAssetChannel

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

## payAssetInvoice

Pay a payment request with an asset, over an asset channel

The channel peer sells satoshis for the asset, at a rate in an RFQ quote

tapd must run inside litd, with lnd and tapd in integrated mode

Requires `channels:write` permission

An `asset_id` or a `group_key` is required, but not both

Use an `rfq_id` of an accepted sell quote to pay with that quote

Without `max_fee` or `max_fee_mtokens`, only routes with no fee are used,
the same as lnd

`max_fee` and `max_fee_mtokens` are not supported together

The default `pathfinding_timeout` is 25 seconds. The default `max_paths` is 1.
tapd uses the `pathfinding_timeout` in whole seconds, with a minimum of 1.

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
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        [timeout]: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      index: <Payment Index Number String>
      mtokens: <Total Millitokens Paid String>
      paths: [{
        fee: <Total Fee Tokens Paid Rounded Down Number>
        fee_mtokens: <Total Fee Millitokens Paid String>
        hops: [{
          channel: <Standard Format Channel Id String>
          fee: <Fee Tokens Rounded Down Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          [timeout]: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens Paid String>
        [payment]: <Payment Identifier Hex String>
        [timeout]: <Expiration Block Height Number>
        tokens: <Total Tokens Paid Rounded Down Number>
        [total_mtokens]: <Total Payment Millitokens String>
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

## sendAssetKeysend

Send an asset to a channel peer with a keysend payment

tapd only sends an asset keysend payment to a direct asset channel peer

tapd must run inside litd, with lnd and tapd in integrated mode

Requires `channels:write` permission

An `asset_id` or a `group_key` is required, but not both

The default `tokens` is 354, the smallest amount that tapd accepts

A random `secret` is used when there is no `secret`

Without `max_fee` or `max_fee_mtokens`, only routes with no fee are used,
the same as lnd

`max_fee` and `max_fee_mtokens` are not supported together

The default `pathfinding_timeout` is 25 seconds. The default `max_paths` is 1.
tapd uses the `pathfinding_timeout` in whole seconds, with a minimum of 1.

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
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        [timeout]: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      index: <Payment Index Number String>
      mtokens: <Total Millitokens Paid String>
      paths: [{
        fee: <Total Fee Tokens Paid Rounded Down Number>
        fee_mtokens: <Total Fee Millitokens Paid String>
        hops: [{
          channel: <Standard Format Channel Id String>
          fee: <Fee Tokens Rounded Down Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          [timeout]: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens Paid String>
        [payment]: <Payment Identifier Hex String>
        [timeout]: <Expiration Block Height Number>
        tokens: <Total Tokens Paid Rounded Down Number>
        [total_mtokens]: <Total Payment Millitokens String>
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

## subscribeToAssetInvoices

Subscribe to invoices that receive an asset

tapd only sends updates of invoices that involve an asset

Use `added_after` and `confirmed_after` to get past updates after an index

Requires `channels:read` permission

This method needs tapd v0.8.1 or later

The invoice fields are the same as in lightning getInvoices. `assets` has the
asset units of settled HTLCs only.

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
      payments: [{
        [canceled_at]: <Payment Canceled At ISO 8601 Date String>
        [confirmed_at]: <Payment Settled At ISO 8601 Date String>
        created_at: <Payment Held Since ISO 8601 Date String>
        created_height: <Payment Held Since Block Height Number>
        in_channel: <Incoming Payment Through Channel Id String>
        is_canceled: <Payment is Canceled Bool>
        is_confirmed: <Payment is Confirmed Bool>
        is_held: <Payment is Held Bool>
        messages: [{
          type: <Message Type Number String>
          value: <Raw Value Hex String>
        }]
        mtokens: <Incoming Payment Millitokens String>
        [pending_index]: <Pending Payment Channel HTLC Index Number>
        timeout: <HTLC CLTV Timeout Height Number>
        tokens: <Payment Tokens Number>
        [total_mtokens]: <Total Millitokens String>
      }]
      received: <Received Tokens Number>
      received_mtokens: <Received Millitokens String>
      [request]: <Bolt 11 Invoice String>
      secret: <Secret Preimage Hex String>
      tokens: <Tokens Number>
    }

    @event 'end'

    @event 'error'
    [<Error Code Number>, <Error Message String>, <Error Details Object>]

Example:

```js
import {subscribeToAssetInvoices} from 'tapass';

const sub = subscribeToAssetInvoices({tapd});

sub.on('invoice_updated', invoice => console.log(invoice));
```

## subscribeToAssetPayments

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
      created_at: <Payment Created At ISO 8601 Date String>
      destination: <Payment Destination Public Key Hex String>
      fee: <Total Fee Tokens Paid Rounded Down Number>
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [{
        channel: <Standard Format Channel Id String>
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        [timeout]: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      index: <Payment Index Number String>
      mtokens: <Total Millitokens Paid String>
      paths: [{
        fee: <Total Fee Tokens Paid Rounded Down Number>
        fee_mtokens: <Total Fee Millitokens Paid String>
        hops: [{
          channel: <Standard Format Channel Id String>
          fee: <Fee Tokens Rounded Down Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          [timeout]: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens Paid String>
        [payment]: <Payment Identifier Hex String>
        [timeout]: <Expiration Block Height Number>
        tokens: <Total Tokens Paid Rounded Down Number>
        [total_mtokens]: <Total Payment Millitokens String>
      }]
      [request]: <BOLT 11 Payment Request String>
      safe_fee: <Total Fee Tokens Paid Rounded Up Number>
      safe_tokens: <Total Tokens Paid, Rounded Up Number>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Paid Rounded Down Number>
    }

    @event 'failed'
    {
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      id: <Payment Hash Hex String>
      is_canceled: <Payment Canceled Bool>
      is_insufficient_balance: <Failed Due To Lack of Balance Bool>
      is_invalid_payment: <Failed Due to Payment Rejected At Destination Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Absence of Path Through Graph Bool>
    }

    @event 'paying'
    {
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      created_at: <Payment Created At ISO 8601 Date String>
      destination: <Payment Destination Public Key Hex String>
      id: <Payment Hash Hex String>
      index: <Payment Index Number String>
      mtokens: <Total Millitokens Pending String>
      paths: [{
        fee: <Total Fee Tokens Pending Rounded Down Number>
        fee_mtokens: <Total Fee Millitokens Pending String>
        hops: [{
          channel: <Standard Format Channel Id String>
          fee: <Fee Tokens Rounded Down Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          [timeout]: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens Pending String>
        [payment]: <Payment Identifier Hex String>
        [timeout]: <Expiration Block Height Number>
        tokens: <Total Tokens Pending Rounded Down Number>
        [total_mtokens]: <Total Payment Millitokens String>
      }]
      [request]: <BOLT 11 Payment Request String>
      safe_tokens: <Total Tokens Pending Rounded Up Number>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Pending Rounded Down Number>
    }

    @event 'end'

    @event 'error'
    [<Error Code Number>, <Error Message String>, <Error Details Object>]

Example:

```js
import {subscribeToAssetPayments} from 'tapass';

const sub = subscribeToAssetPayments({tapd});

sub.on('confirmed', payment => console.log(payment));
```

## subscribeToPastAssetPayment

Subscribe to the status of a past asset payment

The events are the same as in lightning subscribeToPastPayment, and each
event also has the asset amounts of the payment

tapd only sends updates of a payment that involves an asset

If lnd has no payment with the `id`, the `error` event is a 404

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
      created_at: <Payment Created At ISO 8601 Date String>
      destination: <Payment Destination Public Key Hex String>
      fee: <Total Fee Tokens Paid Rounded Down Number>
      fee_mtokens: <Total Fee Millitokens Paid String>
      hops: [{
        channel: <Standard Format Channel Id String>
        fee: <Fee Tokens Rounded Down Number>
        fee_mtokens: <Fee Millitokens String>
        forward: <Forward Tokens Number>
        forward_mtokens: <Forward Millitokens String>
        public_key: <Public Key Hex String>
        [timeout]: <Timeout Block Height Number>
      }]
      id: <Payment Hash Hex String>
      index: <Payment Index Number String>
      mtokens: <Total Millitokens Paid String>
      paths: [{
        fee: <Total Fee Tokens Paid Rounded Down Number>
        fee_mtokens: <Total Fee Millitokens Paid String>
        hops: [{
          channel: <Standard Format Channel Id String>
          fee: <Fee Tokens Rounded Down Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          [timeout]: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens Paid String>
        [payment]: <Payment Identifier Hex String>
        [timeout]: <Expiration Block Height Number>
        tokens: <Total Tokens Paid Rounded Down Number>
        [total_mtokens]: <Total Payment Millitokens String>
      }]
      [request]: <BOLT 11 Payment Request String>
      safe_fee: <Total Fee Tokens Paid Rounded Up Number>
      safe_tokens: <Total Tokens Paid, Rounded Up Number>
      secret: <Payment Preimage Hex String>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Paid Rounded Down Number>
    }

    @event 'failed'
    {
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      id: <Payment Hash Hex String>
      is_canceled: <Payment Canceled Bool>
      is_insufficient_balance: <Failed Due To Lack of Balance Bool>
      is_invalid_payment: <Failed Due to Payment Rejected At Destination Bool>
      is_pathfinding_timeout: <Failed Due to Pathfinding Timeout Bool>
      is_route_not_found: <Failed Due to Absence of Path Through Graph Bool>
    }

    @event 'paying'
    {
      assets: [{
        amount: <Asset Units Numeric String>
        asset_id: <Asset Id Hex String>
        [group_key]: <Asset Group Key Hex String>
      }]
      created_at: <Payment Created At ISO 8601 Date String>
      destination: <Payment Destination Public Key Hex String>
      id: <Payment Hash Hex String>
      index: <Payment Index Number String>
      mtokens: <Total Millitokens Pending String>
      paths: [{
        fee: <Total Fee Tokens Pending Rounded Down Number>
        fee_mtokens: <Total Fee Millitokens Pending String>
        hops: [{
          channel: <Standard Format Channel Id String>
          fee: <Fee Tokens Rounded Down Number>
          fee_mtokens: <Fee Millitokens String>
          forward: <Forward Tokens Number>
          forward_mtokens: <Forward Millitokens String>
          public_key: <Public Key Hex String>
          [timeout]: <Timeout Block Height Number>
        }]
        mtokens: <Total Millitokens Pending String>
        [payment]: <Payment Identifier Hex String>
        [timeout]: <Expiration Block Height Number>
        tokens: <Total Tokens Pending Rounded Down Number>
        [total_mtokens]: <Total Payment Millitokens String>
      }]
      [request]: <BOLT 11 Payment Request String>
      safe_tokens: <Total Tokens Pending Rounded Up Number>
      timeout: <Expiration Block Height Number>
      tokens: <Total Tokens Pending Rounded Down Number>
    }

    @event 'end'

    @event 'error'
    [<Error Code Number>, <Error Message String>, <Error Details Object>]

Example:

```js
import {subscribeToPastAssetPayment} from 'tapass';

const sub = subscribeToPastAssetPayment({id, tapd});

sub.on('confirmed', payment => console.log(payment));
```
