import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getMintBatches} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcBatchAsBatch} from '../../../src/tapd_responses/index.js';
import {responses} from '../../fixtures/tapd_responses.js';
import {mintResponses} from '../../fixtures/tapd_mint_responses.js';

const batchKey = `02${'33'.repeat(32)}`;

const tapdWith = (listBatches: (req: any, cbk: Function) => void) => {
  return {mint: {listBatches}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, responses.listBatches));

const tests = [
  {
    args: {id: 'key', tapd},
    description: 'A batch key is expected',
    error: [400, 'ExpectedBatchKeyToGetMintBatches'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetMintBatches'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetMintBatches'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetMintBatches'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingMintBatches', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'An array of batches is expected',
    error: [503, 'ExpectedArrayOfBatchesInListBatchesResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {batches: [{batch: null}]}))},
    description: 'Valid batches are expected',
    error: [503, 'ExpectedRpcMintingBatch'],
  },
  {
    args: {tapd},
    description: 'Real batches are returned',
    expected: {batches: responses.listBatches.batches.map(rpcBatchAsBatch)},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(getMintBatches(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await getMintBatches(args), expected, 'Got batches');
    }

    return;
  });
});

test('A real verbose batch has the unsealed assets', async () => {
  const {batches} = await getMintBatches({
    is_verbose: true,
    tapd: tapdWith((_, cbk) => cbk(null, mintResponses.listBatchesVerbose)),
  });

  deepStrictEqual(batches[0].unsealed_assets.length, 1);
});

test('The request has the batch key and the verbose flag', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {batches: []});
  });

  await getMintBatches({tapd});
  await getMintBatches({id: batchKey, is_verbose: true, tapd});

  deepStrictEqual(requests, [
    {batch_key: undefined, verbose: false},
    {batch_key: Buffer.from(batchKey, 'hex'), verbose: true},
  ]);
});
