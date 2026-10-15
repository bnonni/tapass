import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {unpackAssetProofFile} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {proofResponses} from '../../fixtures/tapd_proof_responses.js';

const proof = proofResponses.exportProof.raw_proof_file.toString('hex');
const res = proofResponses.unpackProofFile;

const tapdWith = (unpackProofFile: (req: any, cbk: Function) => void) => {
  return {default: {unpackProofFile}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, res));

const tests = [
  {
    args: {proof: 'proof', tapd},
    description: 'A hex proof file is expected',
    error: [400, 'ExpectedHexAssetProofFileToUnpack'],
  },
  {
    args: {proof, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToUnpackAssetProofFile'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'x'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToUnpackAssetProofFile'],
  },
  {
    args: {
      proof,
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToUnpackAssetProofFile'],
  },
  {
    args: {
      proof: '00',
      tapd: tapdWith((_, cbk) => cbk(proofResponses.unpackProofFileBad.error)),
    },
    description: 'A real tapd unpack failure is a bad proof file',
    error: [400, 'ExpectedValidAssetProofFileToUnpack'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorUnpackingAssetProofFile', {err: 'err'}],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'Raw proofs are expected',
    error: [503, 'ExpectedRawProofsInUnpackProofFileResponse'],
  },
  {
    args: {proof, tapd: tapdWith((_, cbk) => cbk(null, {raw_proofs: ['p']}))},
    description: 'Raw proof bytes are expected',
    error: [503, 'ExpectedRawProofsInUnpackProofFileResponse'],
  },
  {
    args: {proof, tapd},
    description: 'A real tapd proof file is unpacked',
    expected: {proofs: res.raw_proofs.map((n: Buffer) => n.toString('hex'))},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(unpackAssetProofFile(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await unpackAssetProofFile(args), expected, 'Got proofs');
    }

    return;
  });
});
