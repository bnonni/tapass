import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {decodeAssetAddress} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcAddrAsAddress} from '../../../src/tapd_responses/index.js';
import {proofResponses} from '../../fixtures/tapd_proof_responses.js';

const rpcAddr = proofResponses.decodeAddr;
const address = rpcAddr.encoded;

const tapdWith = (decodeAddr: (req: any, cbk: Function) => void) => {
  return {default: {decodeAddr}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, rpcAddr));

const tests = [
  {
    args: {address: '', tapd},
    description: 'An address is expected',
    error: [400, 'ExpectedAssetAddressToDecode'],
  },
  {
    args: {address, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToDecodeAssetAddress'],
  },
  {
    args: {address, tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'x'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToDecodeAssetAddress'],
  },
  {
    args: {
      address,
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToDecodeAssetAddress'],
  },
  {
    args: {
      address: 'taprt1notanaddress',
      tapd: tapdWith((_, cbk) => cbk(proofResponses.decodeAddrBad.error)),
    },
    description: 'A real tapd decode failure is a bad address',
    error: [400, 'ExpectedValidAssetAddressToDecode'],
  },
  {
    args: {address, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorDecodingAssetAddress', {err: 'err'}],
  },
  {
    args: {address, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedRpcAddressDetails'],
  },
  {
    args: {address, tapd},
    description: 'A real tapd address is decoded',
    expected: rpcAddrAsAddress(rpcAddr),
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(decodeAssetAddress(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await decodeAssetAddress(args), expected, 'Got address');
    }

    return;
  });
});

test('The request has the address', async () => {
  let request: any;

  await decodeAssetAddress({
    address,
    tapd: tapdWith((req, cbk) => {
      request = req;

      return cbk(null, rpcAddr);
    }),
  });

  deepStrictEqual(request, {addr: address});
});
