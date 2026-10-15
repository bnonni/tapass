import {deepStrictEqual} from 'node:assert/strict';
import test from 'node:test';

import {mintRpcError} from '../../src/tapd_responses/index.js';

const tests = [
  {args: {}, description: 'No error is no known error', expected: undefined},
  {
    args: {err: {details: 'unable to cancel batch: no pending batch'}},
    description: 'A missing pending batch is not found',
    expected: [404, 'PendingMintBatchNotFound'],
  },
  {
    args: {err: {details: 'unable to fund batch: batch already funded'}},
    description: 'A funded batch is already funded',
    expected: [400, 'MintBatchIsAlreadyFunded'],
  },
  {
    args: {err: {details: 'batch is not funded'}},
    description: 'An unfunded batch is not ready to seal',
    expected: [400, 'ExpectedFundedMintBatch'],
  },
  {
    args: {err: {details: 'no seedlings in batch'}},
    description: 'An empty batch has no assets',
    expected: [400, 'ExpectedAssetsInMintBatch'],
  },
  {
    args: {err: {details: 'feerate does not meet minrelayfee: x'}},
    description: 'A low fee rate is too low',
    expected: [400, 'ExpectedHigherFeeRateForMintBatch'],
  },
  {
    args: {err: {details: 'invalid asset name: asset name cannot contain'}},
    description: 'An invalid name is not valid',
    expected: [400, 'ExpectedValidAssetName'],
  },
  {
    args: {err: {details: 'other'}},
    description: 'Another error is not known',
    expected: undefined,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    deepStrictEqual(mintRpcError(args), expected, 'Got known error');

    return;
  });
});
