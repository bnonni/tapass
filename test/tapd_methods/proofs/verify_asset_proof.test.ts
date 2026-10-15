import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {verifyAssetProof} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcDecodedProofAsProof} from '../../../src/tapd_responses/index.js';
import {proofResponses} from '../../fixtures/tapd_proof_responses.js';

const proof = proofResponses.exportProof.raw_proof_file.toString('hex');
const res = proofResponses.verifyProof;

const tapdWith = (verifyProof: (req: any, cbk: Function) => void) => {
  return {default: {verifyProof}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, res));

const tests = [
  {
    args: {proof: '', tapd},
    description: 'A hex proof file is expected',
    error: [400, 'ExpectedHexAssetProofFileToVerify'],
  },
  {
    args: {proof, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToVerifyAssetProof'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'x'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToVerifyAssetProof'],
  },
  {
    args: {
      proof,
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToVerifyAssetProof'],
  },
  {
    args: {
      proof: '00',
      tapd: tapdWith((_, cbk) => cbk(proofResponses.verifyProofBad.error)),
    },
    description: 'A real tapd failure for a single proof is returned',
    error: [400, 'ExpectedProofFileNotSingleProofToVerify'],
  },
  {
    args: {
      proof: '00',
      tapd: tapdWith((_, cbk) => {
        return cbk({details: 'unable to decode proof file: bad'});
      }),
    },
    description: 'A proof file that does not decode is returned',
    error: [400, 'ExpectedValidAssetProofFileToVerify'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorVerifyingAssetProof', {err: 'err'}],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToVerifyAssetProofRequest'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk(null, {valid: true}))},
    description: 'A valid proof needs a decoded proof',
    error: [503, 'ExpectedRpcDecodedProofDetails'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk(null, {valid: false}))},
    description: 'An invalid proof file is not valid',
    expected: {is_valid: false},
  },
  {
    args: {proof, tapd},
    description: 'A real tapd proof file is valid',
    expected: {
      is_valid: true,
      proof: rpcDecodedProofAsProof(res.decoded_proof),
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(verifyAssetProof(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await verifyAssetProof(args), expected, 'Got result');
    }

    return;
  });
});
