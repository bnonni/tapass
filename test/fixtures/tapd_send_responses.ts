import {readFileSync} from 'node:fs';

const file = new URL('./tapd_send_responses.json', import.meta.url);

// Bytes are stored as {$hex}, the decoder gives them back as Buffer objects
const reviver = (_: string, value: any) => {
  return typeof value?.$hex === 'string'
    ? Buffer.from(value.$hex, 'hex')
    : value;
};

/** Real tapd v0.7.0 send responses from a Polar regtest node, v0.8.5 protos

  The responses are for: burnAsset, listTransfers, sendAsset, and 3 send
  events (the first event, the event with the first transfer, and the last
  event). Byte values longer than 500 bytes, such as proof files and virtual
  packets, are cut to 100 bytes, because the mappers do not parse them.
*/
export const responses: Record<string, any> = JSON.parse(
  readFileSync(file, 'utf8'),
  reviver,
);
