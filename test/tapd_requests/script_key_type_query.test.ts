import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {scriptKeyTypeQuery} from '../../src/tapd_requests/index.js';

const tests = [
  {args: undefined, description: 'No type is no query', expected: undefined},
  {
    args: 'all',
    description: 'All types is a query for each type',
    expected: {all_types: true},
  },
  {
    args: 'channel',
    description: 'A type is an explicit type',
    expected: {explicit_type: 'SCRIPT_KEY_CHANNEL'},
  },
  {
    args: 'bip86',
    description: 'BIP-86 is a type',
    expected: {explicit_type: 'SCRIPT_KEY_BIP86'},
  },
];

tests.forEach(({args, description, expected}) => {
  return test(description, () => {
    deepStrictEqual(scriptKeyTypeQuery(args), expected, 'Got query');

    return;
  });
});

test('An unknown type is not a query', () => {
  throws(() => scriptKeyTypeQuery('unknown'), /ExpectedKnownScriptKeyType/);
  throws(() => scriptKeyTypeQuery('BIP86'), /ExpectedKnownScriptKeyType/);
});
