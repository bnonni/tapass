# API

Each method takes a `tapd` object. Refer to [Authentication](../authentication.md). Each method returns a Promise, or calls a callback if you give one. Refer to [Usage](../usage.md).

## [Addresses](addresses.md)

Taproot Assets addresses, and the inbound transfers to these addresses.

- [createAssetAddress](addresses.md#createassetaddress): Create a Taproot Assets address to receive an asset
- [decodeAssetAddress](addresses.md#decodeassetaddress): Decode a Taproot Assets address
- [getAssetAddresses](addresses.md#getassetaddresses): Get the Taproot Assets addresses that this node created, oldest first
- [getAssetReceives](addresses.md#getassetreceives): Get the inbound asset transfers to Taproot Assets addresses, newest first
- [subscribeToAssetReceives](addresses.md#subscribetoassetreceives): Subscribe to inbound asset transfers to Taproot Assets addresses

## [Assets](assets.md)

The assets, balances, asset groups, metadata, outputs, and burns of the node.

- [getAssetBalances](assets.md#getassetbalances): Get the asset balances of this node, by asset and by asset group
- [getAssetBurns](assets.md#getassetburns): Get the asset burns that this node made
- [getAssetGroups](assets.md#getassetgroups): Get the asset groups of the assets that this node owns
- [getAssetMetadata](assets.md#getassetmetadata): Get the metadata of an asset
- [getAssets](assets.md#getassets): Get the assets that this node owns
- [getAssetUtxos](assets.md#getassetutxos): Get the on-chain outputs that hold the assets of this node

## [Asset Channels](asset-channels.md)

Channels that are funded with an asset, and the invoices and payments over these channels.

- [createAssetInvoice](asset-channels.md#createassetinvoice): Create an invoice that is paid with an asset, over an asset channel
- [decodeAssetPaymentRequest](asset-channels.md#decodeassetpaymentrequest): Decode a payment request and get its amount in units of an asset
- [encodeAssetCustomRecords](asset-channels.md#encodeassetcustomrecords): Encode the first hop custom records of an asset payment
- [getAssetInvoices](asset-channels.md#getassetinvoices): Get asset invoices, newest first
- [getAssetPayments](asset-channels.md#getassetpayments): Get confirmed payments that sent an asset, newest first
- [openAssetChannel](asset-channels.md#openassetchannel): Open a channel that is funded with an asset
- [payAssetInvoice](asset-channels.md#payassetinvoice): Pay a payment request with an asset, over an asset channel
- [sendAssetKeysend](asset-channels.md#sendassetkeysend): Send an asset to a channel peer with a keysend payment
- [subscribeToAssetInvoices](asset-channels.md#subscribetoassetinvoices): Subscribe to invoices that receive an asset
- [subscribeToAssetPayments](asset-channels.md#subscribetoassetpayments): Subscribe to the status of current outgoing asset payments
- [subscribeToPastAssetPayment](asset-channels.md#subscribetopastassetpayment): Subscribe to the status of a past asset payment

## [Daemon](daemon.md)

These methods make tapd macaroons, set the log level, and stop tapd.

- [createTapdMacaroon](daemon.md#createtapdmacaroon): Create a tapd macaroon with specific permissions
- [setTapdDebugLevel](daemon.md#settapddebuglevel): Set the log level of tapd
- [stopTapd](daemon.md#stoptapd): Stop tapd

## [Info](info.md)

Information about tapd and its lnd node.

- [getTapdInfo](info.md#gettapdinfo): Get information about tapd and its lnd node

## [Mint](mint.md)

tapd mints assets in batches. Add assets to the pending batch, then fund, seal, and finalize the batch.

- [addAssetToMintBatch](mint.md#addassettomintbatch): Add an asset to the pending mint batch
- [cancelMintBatch](mint.md#cancelmintbatch): Cancel the pending mint batch
- [finalizeMintBatch](mint.md#finalizemintbatch): Finalize the pending mint batch, and broadcast the genesis transaction
- [fundMintBatch](mint.md#fundmintbatch): Fund the pending mint batch with a genesis input
- [getMintBatches](mint.md#getmintbatches): Get mint batches, including pending and cancelled batches
- [sealMintBatch](mint.md#sealmintbatch): Seal the pending mint batch with asset group witnesses
- [subscribeToMintEvents](mint.md#subscribetomintevents): Subscribe to the state changes of mint batches

## [Proofs](proofs.md)

Decode, export, unpack, and verify asset proofs.

- [decodeAssetProof](proofs.md#decodeassetproof): Decode an asset proof or one proof in an asset proof file
- [exportAssetProof](proofs.md#exportassetproof): Export the proof file of an asset
- [unpackAssetProofFile](proofs.md#unpackassetprooffile): Get the individual proofs in an asset proof file
- [verifyAssetProof](proofs.md#verifyassetproof): Verify an asset proof file

## [RFQ](rfq.md)

Request for quote (RFQ): the offers, orders, and quotes that set the asset price of a payment over an asset channel.

- [addAssetBuyOffer](rfq.md#addassetbuyoffer): Add or update an offer to buy an asset
- [addAssetBuyOrder](rfq.md#addassetbuyorder): Ask a peer for a quote to buy an asset over an asset channel
- [addAssetSellOffer](rfq.md#addassetselloffer): Add or update an offer to sell an asset
- [addAssetSellOrder](rfq.md#addassetsellorder): Ask a peer for a quote to sell an asset over an asset channel
- [getAcceptedQuotes](rfq.md#getacceptedquotes): Get the quotes that peers accepted for the orders of this node
- [getAssetForwards](rfq.md#getassetforwards): Get the asset swaps that this edge node forwarded
- [subscribeToRfqEvents](rfq.md#subscribetorfqevents): Subscribe to RFQ events

## [Send](send.md)

On-chain asset sends, transfers, and burns.

- [burnAsset](send.md#burnasset): Burn asset units
- [getAssetTransfers](send.md#getassettransfers): Get the outbound asset transfers of this node
- [registerAssetTransfer](send.md#registerassettransfer): Register an inbound asset transfer that has no Taproot Assets address
- [sendAsset](send.md#sendasset): Send assets to Taproot Assets addresses
- [subscribeToAssetSends](send.md#subscribetoassetsends): Subscribe to the state changes of outbound asset sends
