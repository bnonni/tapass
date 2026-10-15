import {equal} from 'node:assert/strict';
import test from 'node:test';

import {isPermissionDenied} from '../../src/tapd_requests/index.js';

const tests = [
  {args: {}, description: 'No error is not denied', expected: false},
  {
    args: {err: {details: 'account not found'}},
    description: 'Another error is not denied',
    expected: false,
  },
  {
    args: {
      err: {
        details:
          'lnd macaroon validation failed: rpc error: code = ' +
          'InvalidArgument desc = permission denied',
      },
    },
    description: 'A macaroon permission failure is denied',
    expected: true,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    equal(isPermissionDenied(args), expected, 'Got permission denied');

    return;
  });
});
