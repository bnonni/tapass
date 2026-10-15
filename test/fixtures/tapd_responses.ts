import {readFileSync} from 'node:fs';

const file = new URL('./tapd_responses.json', import.meta.url);

// Bytes are stored as {$hex}, the decoder gives them back as Buffer objects
const reviver = (_: string, value: any) => {
  return typeof value?.$hex === 'string'
    ? Buffer.from(value.$hex, 'hex')
    : value;
};

/** Real tapd v0.7.0 responses from a Polar regtest node, with v0.8.5 protos

  The responses are for: getInfo, listAssets, listBalances, listBatches,
  listGroups, listTransfers, listUtxos, queryAddrs
*/
export const responses: Record<string, any> = JSON.parse(
  readFileSync(file, 'utf8'),
  reviver,
);
