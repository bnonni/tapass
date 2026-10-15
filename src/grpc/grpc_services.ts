/** gRPC settings for tapd

  `includeDirs` and `protoFiles` paths are relative to `protosDir`.
  `protosDir` is relative to the `tapd_grpc` directory.
*/
export default {
  defaultSocket: 'localhost:10029',
  grpcSslCipherSuites:
    'HIGH+ECDSA:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-ECDSA-AES256-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384',
  includeDirs: ['taprpc', 'lnrpc'],
  keepaliveTimeMs: 60000,
  keepaliveTimeoutMs: 120000,
  maxReceiveMessageLength: 924288000,
  packageTypes: {
    AssetWallet: 'assetwalletrpc',
    Mailbox: 'authmailboxrpc',
    Mint: 'mintrpc',
    Rfq: 'rfqrpc',
    TapDev: 'tapdevrpc',
    TaprootAssetChannels: 'tapchannelrpc',
    TaprootAssets: 'taprpc',
    Universe: 'universerpc',
  },
  protoFiles: {
    AssetWallet: 'taprpc/assetwalletrpc/assetwallet.proto',
    Mailbox: 'taprpc/authmailboxrpc/mailbox.proto',
    Mint: 'taprpc/mintrpc/mint.proto',
    Rfq: 'taprpc/rfqrpc/rfq.proto',
    TapDev: 'taprpc/tapdevrpc/tapdev.proto',
    TaprootAssetChannels: 'taprpc/tapchannelrpc/tapchannel.proto',
    TaprootAssets: 'taprpc/taprootassets.proto',
    Universe: 'taprpc/universerpc/universe.proto',
  },
  protosDir: '../../protos/',
  serviceTypes: {
    assetwallet: 'AssetWallet',
    default: 'TaprootAssets',
    mailbox: 'Mailbox',
    mint: 'Mint',
    rfq: 'Rfq',
    tapchannel: 'TaprootAssetChannels',
    tapdev: 'TapDev',
    universe: 'Universe',
  },
} as const;
