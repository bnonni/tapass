/** gRPC methods of one tapd service */
export type TapdService = {[method: string]: (...args: any[]) => any};

/** Authenticated tapd gRPC API Object */
export type AuthenticatedTapd = {
  /** AssetWallet Methods */
  assetwallet: TapdService;
  /** TaprootAssets Methods */
  default: TapdService;
  /** Mailbox Methods */
  mailbox: TapdService;
  /** Mint Methods */
  mint: TapdService;
  /** Rfq Methods */
  rfq: TapdService;
  /** TaprootAssetChannels Methods */
  tapchannel: TapdService;
  /** TapDev Methods */
  tapdev: TapdService;
  /** Universe Methods */
  universe: TapdService;
};

export type TapdServiceType = keyof AuthenticatedTapd;

export type TapdAuthentication = {
  /** Base64 or Hex Serialized tapd TLS Cert String */
  cert?: string;
  /** Base64 or Hex Serialized Macaroon String */
  macaroon?: string;
  /** Path to Protos Directory With taprpc and lnrpc Directories String */
  path?: string;
  /** Host:Port Network Address String */
  socket?: string;
};
