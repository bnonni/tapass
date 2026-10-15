const isDigits = (n: unknown): n is string =>
  typeof n === 'string' && /^\d+$/.test(n);
const {isSafeInteger} = Number;

export type RpcFixedPoint = {
  coefficient: string;
  scale: number;
};

/** Exact decimal string from an RPC fixed point number

  The value is the coefficient divided by 10 to the power of the scale. The
  decimal string has exactly `scale` decimal places, so it keeps the scale.

  For example, coefficient 12345 with scale 2 is "123.45"

  {
    coefficient: <Scaled Integer Numeric String>
    scale: <Decimal Places Number>
  }

  @throws
  <Error>

  @returns
  <Exact Decimal String>
*/
export default (fixedPoint?: RpcFixedPoint | null) => {
  if (!fixedPoint) {
    throw new Error('ExpectedRpcFixedPointNumber');
  }

  if (!isDigits(fixedPoint.coefficient)) {
    throw new Error('ExpectedNumericCoefficientInRpcFixedPoint');
  }

  if (!isSafeInteger(fixedPoint.scale) || fixedPoint.scale < 0) {
    throw new Error('ExpectedScaleInRpcFixedPoint');
  }

  const {scale} = fixedPoint;

  // Exit early when there are no decimal places
  if (!scale) {
    return fixedPoint.coefficient;
  }

  const digits = fixedPoint.coefficient.padStart(scale + 1, '0');

  return `${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
};
