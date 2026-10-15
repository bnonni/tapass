import {deepStrictEqual} from 'node:assert/strict';
import test from 'node:test';

import {assetChannelRpcError} from '../../src/tapd_responses/index.js';

const tests = [
  {args: {}, expected: undefined},
  {args: {err: {details: 'other'}}, expected: undefined},
  {
    args: {
      err: {
        details:
          'the Taproot Asset channel functionality is only available when ' +
          'running inside Lightning Terminal daemon (litd), with lnd and tapd',
      },
    },
    expected: [501, 'ExpectedTapdInsideLitdForAssetChannels'],
  },
  {
    args: {err: {details: 'error finding asset channel to use: none'}},
    expected: [503, 'NoAssetChannelToUse'],
  },
  {
    args: {
      err: {
        details:
          'error funding channel: peer 02aa does not support asset channels',
      },
    },
    expected: [503, 'PeerDoesNotSupportAssetChannels'],
  },
  {
    args: {
      err: {
        details:
          'error funding channel: unable to query peer feature bits: peer ' +
          'not found',
      },
    },
    expected: [503, 'ExpectedConnectedPeerForAssetChannel'],
  },
  {
    args: {err: {details: 'payment 00 (amt=5) failed to acquire any quotes'}},
    expected: [503, 'FailedToGetAssetSellQuoteForPayment'],
  },
  {
    args: {err: {details: 'no genesis found for decoded asset'}},
    expected: [404, 'AssetNotFound'],
  },
];

tests.forEach(({args, expected}) => {
  return test(`${JSON.stringify(expected)} is the known error`, () => {
    deepStrictEqual(assetChannelRpcError(args), expected);
  });
});
