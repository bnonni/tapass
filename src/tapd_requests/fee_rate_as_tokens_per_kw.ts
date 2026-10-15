const feeRateFloor = 253;
const vbytesPerKiloWeight = 250;

/** Chain fee rate in tokens per kiloweight from tokens per vbyte

  tapd rejects a rate below 253 tokens per kiloweight, so a positive rate is
  never below that floor. litcli and tapcli use the same floor.

  [fee_tokens_per_vbyte]: <Fee Tokens Per Virtual Byte Number>

  @returns
  <Fee Tokens Per Kiloweight Number> // 0 selects the tapd default
*/
export default (feeTokensPerVbyte?: number) => {
  // Exit early when there is no rate, so that tapd uses its default
  if (!feeTokensPerVbyte) {
    return 0;
  }

  const feeRate = Math.ceil(feeTokensPerVbyte * vbytesPerKiloWeight);

  return Math.max(feeRateFloor, feeRate);
};
