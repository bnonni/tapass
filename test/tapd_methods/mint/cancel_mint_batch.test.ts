import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {cancelMintBatch} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {mintResponses} from '../../fixtures/tapd_mint_responses.js';

const res = mintResponses.cancelBatch;

const tapdWith = (cancelBatch: (req: any, cbk: Function) => void) => {
  return {mint: {cancelBatch}} as unknown as AuthenticatedTapd;
};

const tests = [
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToCancelMintBatch'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToCancelMintBatch'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToCancelMintBatch'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => {
        return cbk({details: 'unable to cancel batch: no pending batch'});
      }),
    },
    description: 'A missing pending batch is returned as not found',
    error: [404, 'PendingMintBatchNotFound'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCancelingMintBatch', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {batch_key: Buffer.alloc(0)}))},
    description: 'A batch key is expected',
    error: [503, 'ExpectedBatchKeyInCancelBatchResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, res))},
    description: 'The cancelled batch key is returned',
    expected: {id: res.batch_key.toString('hex')},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(cancelMintBatch(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await cancelMintBatch(args), expected, 'Got batch key');
    }

    return;
  });
});
