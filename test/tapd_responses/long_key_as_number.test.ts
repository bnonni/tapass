import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {longKeyAsNumber} from '../../src/tapd_responses/index.js';
import {overTheWireResponse} from '../fixtures/tapd_channel_responses.js';

test('A decimal key stays the same', () => {
  equal(longKeyAsNumber('65536'), '65536');
});

test('A key from the protobuf decoder is a decimal number', () => {
  const {custom_records} = overTheWireResponse('EncodeCustomRecords', {
    custom_records: {'5482373484': Buffer.alloc(1)},
  });

  const [key] = Object.keys(custom_records);

  equal(key.length, 8, 'The decoder gives an 8 character hash');
  equal(longKeyAsNumber(key), '5482373484', 'Got the decimal key');
});

test('A hash key must have 8 bytes', () => {
  throws(() => longKeyAsNumber('abc'), /ExpectedLongBitsHashMapKey/);
  throws(() => longKeyAsNumber('Ā'.repeat(8)), /ExpectedLongBitsHashMapKey/);
});
