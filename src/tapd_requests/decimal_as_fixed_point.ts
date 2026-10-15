const isDecimal = (n: unknown): n is string =>
  typeof n === 'string' && /^\d+(\.\d+)?$/.test(n);
const maxScale = 255;

/** RPC fixed point number from an exact decimal string

  The scale is the number of decimal places in the string

  For example, "123.45" is coefficient 12345 with scale 2

  <Exact Decimal String>

  @throws
  <Error>

  @returns
  {
    coefficient: <Scaled Integer Numeric String>
    scale: <Decimal Places Number>
  }
*/
export default (decimal: string) => {
  if (!isDecimal(decimal)) {
    throw new Error('ExpectedDecimalStringForFixedPoint');
  }

  const [whole, fraction = ''] = decimal.split('.');

  if (fraction.length > maxScale) {
    throw new Error('ExpectedFewerDecimalPlacesForFixedPoint');
  }

  const coefficient = `${whole}${fraction}`.replace(/^0+(?=\d)/, '');

  return {coefficient, scale: fraction.length};
};
