import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {decodeAssetProof} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcDecodedProofAsProof} from '../../../src/tapd_responses/index.js';
import {proofResponses} from '../../fixtures/tapd_proof_responses.js';

const proof = proofResponses.exportProof.raw_proof_file.toString('hex');
const res = proofResponses.decodeProof;

const tapdWith = (decodeProof: (req: any, cbk: Function) => void) => {
  return {default: {decodeProof}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, res));

const tests = [
  {
    args: {depth: 1.5, proof, tapd},
    description: 'An integer depth is expected',
    error: [400, 'ExpectedIntegerDepthToDecodeAssetProof'],
  },
  {
    args: {depth: -1, proof, tapd},
    description: 'A non-negative depth is expected',
    error: [400, 'ExpectedNonNegativeDepthToDecodeAssetProof'],
  },
  {
    args: {depth: 4294967296, proof, tapd},
    description: 'A depth that fits in uint32 is expected',
    error: [400, 'ExpectedSmallerDepthToDecodeAssetProof'],
  },
  {
    args: {proof: 'proof', tapd},
    description: 'A hex proof is expected',
    error: [400, 'ExpectedHexAssetProofToDecode'],
  },
  {
    args: {proof, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToDecodeAssetProof'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'x'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToDecodeAssetProof'],
  },
  {
    args: {
      proof,
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToDecodeAssetProof'],
  },
  {
    args: {
      depth: 9,
      proof,
      tapd: tapdWith((_, cbk) => cbk(proofResponses.decodeProofDepth.error)),
    },
    description: 'A real tapd depth failure is a bad depth',
    error: [400, 'ExpectedDepthInProofFileToDecodeAssetProof'],
  },
  {
    args: {
      proof: '00',
      tapd: tapdWith((_, cbk) => cbk(proofResponses.decodeProofBad.error)),
    },
    description: 'A real tapd decode failure is a bad proof',
    error: [400, 'ExpectedValidAssetProofToDecode'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorDecodingAssetProof', {err: 'err'}],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToDecodeAssetProofRequest'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A decoded proof is expected',
    error: [503, 'ExpectedRpcDecodedProofDetails'],
  },
  {
    args: {proof, tapd},
    description: 'A real tapd proof is decoded',
    expected: rpcDecodedProofAsProof(res.decoded_proof),
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(decodeAssetProof(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await decodeAssetProof(args), expected, 'Got proof');
    }

    return;
  });
});

test('The request has the proof, the depth, and the meta option', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, res);
  });

  await decodeAssetProof({proof, tapd});
  await decodeAssetProof({depth: 2, is_including_meta: true, proof, tapd});

  deepStrictEqual(requests, [
    {
      proof_at_depth: 0,
      raw_proof: Buffer.from(proof, 'hex'),
      with_meta_reveal: false,
      with_prev_witnesses: false,
    },
    {
      proof_at_depth: 2,
      raw_proof: Buffer.from(proof, 'hex'),
      with_meta_reveal: true,
      with_prev_witnesses: false,
    },
  ]);
});
