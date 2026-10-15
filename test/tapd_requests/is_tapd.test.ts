import {equal} from 'node:assert/strict';
import test from 'node:test';

import {isTapd} from '../../src/tapd_requests/index.js';

const tests = [
  {
    args: {method: 'newAddr', type: 'default'},
    description: 'No tapd is not a tapd',
    expected: false,
  },
  {
    args: {method: 'newAddr', tapd: {}, type: 'default'},
    description: 'A tapd without the service is not a tapd',
    expected: false,
  },
  {
    args: {method: 'newAddr', tapd: {default: {}}, type: 'default'},
    description: 'A tapd without the method is not a tapd',
    expected: false,
  },
  {
    args: {
      method: 'newAddr',
      tapd: {default: {newAddr: () => {}}},
      type: 'default',
    },
    description: 'A tapd with the method is a tapd',
    expected: true,
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    equal(isTapd(args), expected, 'Got expected result');

    return;
  });
});
