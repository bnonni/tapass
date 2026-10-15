import {deepStrictEqual} from 'node:assert/strict';
import test from 'node:test';

import {mintFundingRequest} from '../../src/tapd_requests/index.js';

const hash = (n: number) => Buffer.alloc(32, n).toString('hex');

const tests = [
  {
    args: {},
    description: 'No fee rate is the tapd default',
    expected: {branch: undefined, fee_rate: 0, full_tree: undefined},
  },
  {
    args: {fee_tokens_per_vbyte: 1},
    description: 'A low fee rate is the fee rate floor',
    expected: {branch: undefined, fee_rate: 253, full_tree: undefined},
  },
  {
    args: {fee_tokens_per_vbyte: 10},
    description: 'A fee rate converts to tokens per kiloweight',
    expected: {branch: undefined, fee_rate: 2500, full_tree: undefined},
  },
  {
    args: {tapscript_leaves: ['51', '5152']},
    description: 'Leaves are a full tapscript tree',
    expected: {
      branch: undefined,
      fee_rate: 0,
      full_tree: {
        all_leaves: [
          {script: Buffer.from('51', 'hex')},
          {script: Buffer.from('5152', 'hex')},
        ],
      },
    },
  },
  {
    args: {tapscript_branch: {left: hash(1), right: hash(2)}},
    description: 'A branch is a tap branch',
    expected: {
      branch: {
        left_taphash: Buffer.alloc(32, 1),
        right_taphash: Buffer.alloc(32, 2),
      },
      fee_rate: 0,
      full_tree: undefined,
    },
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    deepStrictEqual(mintFundingRequest(args), expected, 'Got request');

    return;
  });
});
