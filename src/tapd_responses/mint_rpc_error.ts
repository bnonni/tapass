import type {TapdError} from '../typescript/index.js';

const knownErrors: {details: string; error: TapdError}[] = [
  {details: 'no pending batch', error: [404, 'PendingMintBatchNotFound']},
  {details: 'batch already funded', error: [400, 'MintBatchIsAlreadyFunded']},
  {details: 'batch is not funded', error: [400, 'ExpectedFundedMintBatch']},
  {details: 'no seedlings in batch', error: [400, 'ExpectedAssetsInMintBatch']},
  {
    details: 'manual fee rate below floor',
    error: [400, 'ExpectedHigherFeeRateForMintBatch'],
  },
  {
    details: 'feerate does not meet minrelayfee',
    error: [400, 'ExpectedHigherFeeRateForMintBatch'],
  },
  {details: 'invalid asset name', error: [400, 'ExpectedValidAssetName']},
];

/** Known error from a mint RPC error

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
