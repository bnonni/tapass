const feeRateFloor = 253;
const vbytesPerKiloWeight = 250;

type Args = {
  /** Fee Tokens Per Virtual Byte Number */
  fee_tokens_per_vbyte?: number;
  /** Tapscript Branch Hashes */
  tapscript_branch?: {left: string; right: string};
  /** Tapscript Leaf Scripts Hex Strings */
  tapscript_leaves?: string[];
};

/** Fee rate and tapscript sibling fields of a fund or finalize request

  The fee rate converts from tokens per vbyte to tokens per kiloweight, and it
  is never below the fee rate floor of 253 tokens per kiloweight

  {
    [fee_tokens_per_vbyte]: <Fee Tokens Per Virtual Byte Number>
    [tapscript_branch]: {
      left: <Left Tap Branch Hash Hex String>
      right: <Right Tap Branch Hash Hex String>
    }
    [tapscript_leaves]: [<Tapscript Leaf Script Hex String>]
  }

  @returns
  {
    [branch]: {
      left_taphash: <Left Tap Branch Hash Buffer Object>
      right_taphash: <Right Tap Branch Hash Buffer Object>
    }
    fee_rate: <Fee Tokens Per Kiloweight Number> // 0 is the tapd default
    [full_tree]: {
      all_leaves: [{
        script: <Tapscript Leaf Script Buffer Object>
      }]
    }
  }
*/
export default (args: Args) => {
  const feeRate = (args.fee_tokens_per_vbyte || 0) * vbytesPerKiloWeight;

  return {
    branch: !args.tapscript_branch
      ? undefined
      : {
          left_taphash: Buffer.from(args.tapscript_branch.left, 'hex'),
          right_taphash: Buffer.from(args.tapscript_branch.right, 'hex'),
        },
    fee_rate: !feeRate ? 0 : Math.max(feeRateFloor, Math.ceil(feeRate)),
    full_tree: !args.tapscript_leaves
      ? undefined
      : {
          all_leaves: args.tapscript_leaves.map(script => ({
            script: Buffer.from(script, 'hex'),
          })),
        },
  };
};
