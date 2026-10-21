# RFQ

Request for quote (RFQ): the offers, orders, and quotes that set the asset price of a payment over an asset channel.

- [addAssetBuyOffer](#addassetbuyoffer): Add or update an offer to buy an asset
- [addAssetBuyOrder](#addassetbuyorder): Ask a peer for a quote to buy an asset over an asset channel
- [addAssetSellOffer](#addassetselloffer): Add or update an offer to sell an asset
- [addAssetSellOrder](#addassetsellorder): Ask a peer for a quote to sell an asset over an asset channel
- [getAcceptedQuotes](#getacceptedquotes): Get the quotes that peers accepted for the orders of this node
- [getAssetForwards](#getassetforwards): Get the asset swaps that this edge node forwarded
- [subscribeToRfqEvents](#subscribetorfqevents): Subscribe to RFQ events

## addAssetBuyOffer

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

## addAssetBuyOrder

Ask a peer for a quote to buy an asset over an asset channel

Use a buy order before you make an invoice that is paid in an asset

Requires `rfq:write` permission

An `asset_id` or a `group_key` is required, but not both

A rate is a number of asset units per BTC, as an exact decimal string

When there is no `min_amount`, the quote must fill the `max_amount`. Use
`"0"` to accept a partial fill.

The `min_amount` must not be more than the `max_amount`

The `price_oracle_metadata` must be 32768 bytes or less

The default `timeout_seconds` is 60

`min_amount`, `min_rate`, and `is_fill_or_kill` need tapd v0.8.0 or later.
Older tapd versions ignore them.

    {
      [asset_id]: <Asset Id Hex String>
      expires_at: <Order Expires At ISO 8601 Date String>
      [group_key]: <Asset Group Key Hex String>
      [is_asset_channel_check_skipped]: <Skip Channel Check For Tests Only Bool>
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

## addAssetSellOffer

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

## addAssetSellOrder

Ask a peer for a quote to sell an asset over an asset channel

Use a sell order before you pay an invoice with an asset

Requires `rfq:write` permission

An `asset_id` or a `group_key` is required, but not both

A rate is a number of asset units per BTC, as an exact decimal string

When there is no `min_mtokens`, the quote must fill the `max_mtokens`. Use
`"0"` to accept a partial fill.

The `min_mtokens` must not be more than the `max_mtokens`

The `price_oracle_metadata` must be 32768 bytes or less

The default `timeout_seconds` is 60

`max_rate`, `min_mtokens`, and `is_fill_or_kill` need tapd v0.8.0 or later.
Older tapd versions ignore them.

    {
      [asset_id]: <Asset Id Hex String>
      expires_at: <Order Expires At ISO 8601 Date String>
      [group_key]: <Asset Group Key Hex String>
      [is_asset_channel_check_skipped]: <Skip Channel Check For Tests Only Bool>
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

## getAcceptedQuotes

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
        min_transportable_amount: <Minimum Asset Units In One HTLC Numeric String>
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

## getAssetForwards

Get the asset swaps that this edge node forwarded

Requires `rfq:read` permission

This method needs tapd v0.8.0 or later

The forwards are newest first, by the start date. Failed and unsettled
forwards are included.

An `asset_id` or a `group_key` is a filter, but not both

Use the `next` token with the same filters to get the next page. A `limit`
and a `token` are not supported together. The default `limit` is 100.

A rate is a number of asset units per BTC, as an exact decimal string

    {
      [after]: <Started At Or After ISO 8601 Date String>
      [asset_id]: <Asset Id Hex String>
      [before]: <Started At Or Before ISO 8601 Date String>
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

## subscribeToRfqEvents

Subscribe to RFQ events

Requires `rfq:write` permission

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

    @event 'status'
    <gRPC Status Object>

Example:

```js
import {subscribeToRfqEvents} from 'tapass';

const sub = subscribeToRfqEvents({tapd});

sub.on('accepted_buy_quote', quote => console.log(quote));
```
