import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {decimalAsFixedPoint} from '../../src/tapd_requests/index.js';
import {fixedPointAsDecimal} from '../../src/tapd_responses/index.js';

const tests = [
  {args: {coefficient: '12345', scale: 2}, expected: '123.45'},
  {args: {coefficient: '12300', scale: 2}, expected: '123.00'},
  {args: {coefficient: '5', scale: 3}, expected: '0.005'},
  {args: {coefficient: '0', scale: 2}, expected: '0.00'},
  {args: {coefficient: '42', scale: 0}, expected: '42'},
  {
    args: {coefficient: '340282366920938463463374607431768211456', scale: 30},
    expected: '340282366.920938463463374607431768211456',
  },
];

tests.forEach(({args, expected}) => {
  return test(`${args.coefficient} with scale ${args.scale} is ${expected}`, () => {
    equal(fixedPointAsDecimal(args), expected, 'Got decimal');

    deepStrictEqual(
      decimalAsFixedPoint(expected),
      {coefficient: args.coefficient, scale: args.scale},
      'Got the fixed point back',
    );
  });
});

test('A fixed point number is expected', () => {
  throws(() => fixedPointAsDecimal(null), /ExpectedRpcFixedPointNumber/);
  throws(
    () => fixedPointAsDecimal({coefficient: '1.5', scale: 0}),
    /ExpectedNumericCoefficientInRpcFixedPoint/,
  );
  throws(
    () => fixedPointAsDecimal({coefficient: '1', scale: -1}),
    /ExpectedScaleInRpcFixedPoint/,
  );
});

test('A decimal string is expected', () => {
  ['', '1.', '.5', '-1', '1e5', '1.2.3'].forEach(decimal => {
    throws(
      () => decimalAsFixedPoint(decimal),
      /ExpectedDecimalStringForFixedPoint/,
      decimal,
    );
  });

  throws(
    () => decimalAsFixedPoint(`0.${'1'.repeat(256)}`),
    /ExpectedFewerDecimalPlacesForFixedPoint/,
  );
});
