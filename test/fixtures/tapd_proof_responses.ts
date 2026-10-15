import {readFileSync} from 'node:fs';

const file = new URL('./tapd_proof_responses.json', import.meta.url);

// Bytes are stored as {$hex}, the decoder gives them back as Buffer objects
const reviver = (_: string, value: any) => {
  return typeof value?.$hex === 'string'
    ? Buffer.from(value.$hex, 'hex')
    : value;
};

/** Real tapd v0.7.0 address and proof responses from a Polar regtest node

  The proof is the proof file of a minted asset. The responses with an error
  have the gRPC error code and details that tapd returned.

  The responses are for: addrReceives, decodeAddr, decodeAddrBad, decodeProof,
  decodeProofBad, decodeProofDepth, exportProof, exportProofMissing,
  unpackProofFile, unpackProofFileBad, verifyProof, verifyProofBad
*/
export const proofResponses: Record<string, any> = JSON.parse(
  readFileSync(file, 'utf8'),
  reviver,
);
