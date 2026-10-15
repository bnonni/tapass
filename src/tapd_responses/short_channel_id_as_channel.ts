const blockShift = BigInt(40);
const indexMask = BigInt(0xffffff);
const isDigits = (n: unknown): n is string =>
  typeof n === 'string' && /^\d+$/.test(n);
const outputMask = BigInt(0xffff);
const txShift = BigInt(16);

/** Standard format channel id from a numeric short channel id

  <Numeric Short Channel Id String>

  @throws
  <Error>

  @returns
  <Standard Format Channel Id String> // block x transaction x output
*/
export default (id: string) => {
  if (!isDigits(id)) {
    throw new Error('ExpectedNumericShortChannelId');
  }

  const number = BigInt(id);

  const block = number >> blockShift;
  const index = (number >> txShift) & indexMask;
  const output = number & outputMask;

  return `${block}x${index}x${output}`;
};
