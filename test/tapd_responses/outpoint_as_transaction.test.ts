import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {outpointAsTransaction} from '../../src/tapd_responses/index.js';

const id = 'ab'.repeat(32);

test('An outpoint is split into the transaction id and the output index', () => {
  deepStrictEqual(outpointAsTransaction(`${id}:3`), {
    transaction_id: id,
    transaction_vout: 3,
  });
});

const errors = ['', id, `${id}:`, `${id}:x`, `ab:1`, `${id}:1:2`];

errors.forEach(outpoint => {
  return test(`"${outpoint}" is not an outpoint`, () => {
    throws(() => outpointAsTransaction(outpoint), /ExpectedOutpointWith/);
  });
});
