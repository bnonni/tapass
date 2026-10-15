import {readFileSync} from 'node:fs';

const file = new URL('./tapd_mint_responses.json', import.meta.url);

// Bytes are stored as {$hex}, the decoder gives them back as Buffer objects
const reviver = (_: string, value: any) => {
  return typeof value?.$hex === 'string'
    ? Buffer.from(value.$hex, 'hex')
    : value;
};

/** Real tapd v0.7.0 mint responses from a Polar regtest node, with v0.8.5 protos

  The responses are for: cancelBatch, finalizeBatch, fundBatch (with an
  unsealed asset), listBatchesVerbose, mintAsset (a JSON metadata asset and a
  collectible), mintEvents, sealBatch
*/
export const mintResponses: Record<string, any> = JSON.parse(
  readFileSync(file, 'utf8'),
  reviver,
);
