import {readFileSync} from 'node:fs';

const file = new URL('./tapd_asset_responses.json', import.meta.url);

// Bytes are stored as {$hex}, the decoder gives them back as Buffer objects
const reviver = (_: string, value: any) => {
  return typeof value?.$hex === 'string'
    ? Buffer.from(value.$hex, 'hex')
    : value;
};

/** Real tapd v0.7.0 responses from a Polar regtest node, with v0.8.5 protos

  The responses are for: fetchAssetMeta, fetchAssetMetaUnknown (an error),
  listBurns
*/
export const assetResponses: Record<string, any> = JSON.parse(
  readFileSync(file, 'utf8'),
  reviver,
);
