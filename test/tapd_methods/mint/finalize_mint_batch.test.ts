import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {finalizeMintBatch} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcBatchAsBatch} from '../../../src/tapd_responses/index.js';
import {mintResponses} from '../../fixtures/tapd_mint_responses.js';

const hash = '11'.repeat(32);
const res = mintResponses.finalizeBatch;

const tapdWith = (finalizeBatch: (req: any, cbk: Function) => void) => {
  return {mint: {finalizeBatch}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, res));

const tests = [
  {
    args: {fee_tokens_per_vbyte: 0, tapd},
    description: 'A positive fee rate is expected',
    error: [400, 'ExpectedFeeRateToFinalizeMintBatch'],
  },
  {
    args: {
      tapd,
      tapscript_branch: {left: hash, right: hash},
      tapscript_leaves: ['51'],
    },
    description: 'Leaves and a branch are not expected together',
    error: [400, 'ExpectedTapscriptLeavesOrBranchNotBoth'],
  },
  {
    args: {tapd, tapscript_branch: {left: hash, right: '00'}},
    description: 'Branch hashes are expected',
    error: [400, 'ExpectedTapscriptBranchHashesToFinalizeMintBatch'],
  },
  {
    args: {tapd, tapscript_leaves: []},
    description: 'Leaves are expected',
    error: [400, 'ExpectedTapscriptLeavesToFinalizeMintBatch'],
  },
  {
    args: {tapd, tapscript_leaves: ['xyz']},
    description: 'Hex leaves are expected',
    error: [400, 'ExpectedHexTapscriptLeavesToFinalizeMintBatch'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToFinalizeMintBatch'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToFinalizeMintBatch'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToFinalizeMintBatch'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) =>
        cbk({details: 'unable to finalize batch: no pending batch'}),
      ),
    },
    description: 'A missing pending batch is returned as not found',
    error: [404, 'PendingMintBatchNotFound'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) =>
        cbk({details: 'feerate does not meet minrelayfee: 1'}),
      ),
    },
    description: 'A low fee rate is returned',
    error: [400, 'ExpectedHigherFeeRateForMintBatch'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorFinalizingMintBatch', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A batch is expected',
    error: [503, 'ExpectedMintBatchInFinalizeBatchResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {batch: {batch: {}}}))},
    description: 'A valid batch is expected',
    error: [503, 'ExpectedArrayOfAssetsInRpcMintingBatch'],
  },
  {
    args: {tapd},
    description: 'The batch is returned',
    expected: rpcBatchAsBatch({batch: res.batch}),
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(finalizeMintBatch(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await finalizeMintBatch(args), expected, 'Got batch');
    }

    return;
  });
});

test('The request has the fee rate and the tapscript sibling', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, res);
  });

  await finalizeMintBatch({tapd});
  await finalizeMintBatch({
    fee_tokens_per_vbyte: 5,
    tapd,
    tapscript_leaves: ['51'],
  });

  deepStrictEqual(requests, [
    {
      branch: undefined,
      fee_rate: 0,
      full_tree: undefined,
      short_response: false,
    },
    {
      branch: undefined,
      fee_rate: 1250,
      full_tree: {all_leaves: [{script: Buffer.from('51', 'hex')}]},
      short_response: false,
    },
  ]);
});
