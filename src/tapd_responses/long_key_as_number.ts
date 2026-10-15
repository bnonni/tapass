const isDecimal = (n: string) => /^\d+$/.test(n);
const longBitsHashLength = 8;
const maxByte = 255;

/** Decimal number string from a 64 bit map key of a decoded protobuf message

  protobufjs decodes a uint64 map key as an 8 character hash string. Each
  character is a byte, in little-endian order.

  <Map Key String>

  @throws
  <Error>

  @returns
  <Decimal Number String>
*/
export default (key: string) => {
  // Exit early when the key is already a decimal number
  if (isDecimal(key)) {
    return key;
  }

  const bytes = Array.from({length: key.length}, (_, i) => key.charCodeAt(i));

  if (bytes.length !== longBitsHashLength || bytes.some(n => n > maxByte)) {
    throw new Error('ExpectedLongBitsHashMapKey');
  }

  return Buffer.from(bytes).readBigUInt64LE().toString();
};
