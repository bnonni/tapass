import type {TapdError} from '../typescript/index.js';

// Each text is from the tapd v0.8.5 tapchannel RPC server
const knownErrors: {details: string; error: TapdError}[] = [
  {
    details: 'only available when running inside Lightning Terminal daemon',
    error: [501, 'ExpectedTapdInsideLitdForAssetChannels'],
  },
  {
    details: 'no asset channels available for quote negotiation',
    error: [503, 'NoAssetChannelForQuoteNegotiation'],
  },
  {
    details: 'error finding asset channel to use',
    error: [503, 'NoAssetChannelToUse'],
  },
  {
    details: 'does not support asset channels',
    error: [503, 'PeerDoesNotSupportAssetChannels'],
  },
  {
    details: 'unable to query peer feature bits: peer not found',
    error: [503, 'ExpectedConnectedPeerForAssetChannel'],
  },
  // This text can also be in an 'error acquiring buy order' error
  {
    details: 'as the minimal transportable amount is',
    error: [400, 'ExpectedAtLeastMinTransportableAssetAmount'],
  },
  {
    details: 'error acquiring buy order for invoice',
    error: [503, 'FailedToGetAssetBuyQuoteForInvoice'],
  },
  {
    details: 'with sufficient expiry for the requested invoice expiry',
    error: [503, 'NoAssetQuoteWithSufficientExpiryForInvoice'],
  },
  {
    details: 'failed to acquire any quotes',
    error: [503, 'FailedToGetAssetSellQuoteForPayment'],
  },
  {
    details: 'quote ID did not match an accepted quote',
    error: [404, 'AcceptedQuoteNotFoundForRfqId'],
  },
  {
    details: 'rejecting payment of',
    error: [400, 'ExpectedOverpayAllowedForSmallAssetPayment'],
  },
  {details: 'invoice is already paid', error: [409, 'InvoiceIsAlreadyPaid']},
  {details: 'price oracle is not set', error: [503, 'PriceOracleIsNotSet']},
  {
    details: 'no genesis found for decoded asset',
    error: [404, 'AssetNotFound'],
  },
  {details: 'error parsing group', error: [400, 'ExpectedValidGroupKey']},
];

/** Known error from a tapd asset channel RPC error

  {
    [err]: {
      [details]: <gRPC Status Details String>
    }
  }

  @returns
  <Known Error Array> or <Undefined>
*/
export default ({err}: {err?: {details?: unknown} | null}) => {
  // Exit early when there is no error
  if (!err) {
    return undefined;
  }

  const details = String(err.details);

  return knownErrors.find(known => details.includes(known.details))?.error;
};
