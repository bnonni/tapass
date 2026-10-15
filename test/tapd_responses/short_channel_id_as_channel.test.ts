import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {shortChannelIdAsChannel} from '../../src/tapd_responses/index.js';

test('A short channel id is in the standard format', () => {
  equal(shortChannelIdAsChannel('879609302319104001'), '800000x1500x1');
  equal(shortChannelIdAsChannel('1099511693313'), '1x1x1');
  equal(shortChannelIdAsChannel('0'), '0x0x0');
});

test('A numeric short channel id is expected', () => {
  throws(() => shortChannelIdAsChannel('x'), /ExpectedNumericShortChannelId/);
  throws(() => shortChannelIdAsChannel(''), /ExpectedNumericShortChannelId/);
});
