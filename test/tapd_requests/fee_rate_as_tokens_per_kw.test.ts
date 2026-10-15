import {equal} from 'node:assert/strict';
import test from 'node:test';

import {feeRateAsTokensPerKw} from '../../src/tapd_requests/index.js';

const tests = [
  {
    args: undefined,
    description: 'No rate selects the tapd default',
    expected: 0,
  },
  {args: 0, description: 'A zero rate selects the tapd default', expected: 0},
  {args: 1, description: 'A low rate is raised to the floor', expected: 253},
  {args: 2, description: 'A rate is converted to kiloweight', expected: 500},
  {args: 2.5, description: 'A fractional rate is rounded up', expected: 625},
  {args: 2.001, description: 'A rate is never rounded down', expected: 501},
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    equal(feeRateAsTokensPerKw(args), expected, 'Got fee rate');

    return;
  });
});
