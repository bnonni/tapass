import {equal} from 'node:assert/strict';
import test from 'node:test';

import {isMethodUnsupported} from '../../src/tapd_requests/index.js';

const tests = [
  {args: {}, description: 'No error is not unsupported', expected: false},
  {
    args: {err: {code: 2, details: 'other'}},
    description: 'Another error is not unsupported',
    expected: false,
  },
  {
    args: {err: {code: 12, details: 'unknown method'}},
    description: 'An unimplemented status is unsupported',
    expected: true,
  },
  {
    args: {err: {code: 2, details: 'unknown request'}},
    description: 'An unknown request from litd is unsupported',
    expected: true,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    equal(isMethodUnsupported(args), expected, 'Got unsupported');

    return;
  });
});
