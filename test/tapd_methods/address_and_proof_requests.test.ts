import {deepStrictEqual} from 'node:assert/strict';
import EventEmitter from 'node:events';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import {decodeAssetAddress} from '../../src/index.js';
import {decodeAssetProof} from '../../src/index.js';
import {exportAssetProof} from '../../src/index.js';
import {getAssetAddresses} from '../../src/index.js';
import {getAssetReceives} from '../../src/index.js';
import {subscribeToAssetReceives} from '../../src/index.js';
import {unpackAssetProofFile} from '../../src/index.js';
import {verifyAssetProof} from '../../src/index.js';
import grpcOptions from '../../src/tapd_grpc/grpc_options.js';

const protos = fileURLToPath(new URL('../../protos/', import.meta.url));

const definition = loadSync(join(protos, 'taprpc/taprootassets.proto'), {
  ...grpcOptions,
  includeDirs: [join(protos, 'taprpc'), protos],
});

const {service} = (grpc.loadPackageDefinition(definition) as any).taprpc
  .TaprootAssets;

const assetId = 'ab'.repeat(32);
const proof = 'cd'.repeat(10);
const scriptKey = `02${'ef'.repeat(32)}`;

// Encode each request to protobuf bytes and decode it the way tapd reads it
const fakeTapd = (requests: Record<string, any>) => {
  const record = (name: string, rpc: string) => (req: any, cbk?: Function) => {
    const {requestDeserialize, requestSerialize} = service[rpc];

    requests[name] = requestDeserialize(requestSerialize(req));

    if (!cbk) {
      return Object.assign(new EventEmitter(), {cancel: () => {}});
    }

    return cbk('stop');
  };

  return {
    default: {
      addrReceives: record('addrReceives', 'AddrReceives'),
      decodeAddr: record('decodeAddr', 'DecodeAddr'),
      decodeProof: record('decodeProof', 'DecodeProof'),
      exportProof: record('exportProof', 'ExportProof'),
      queryAddrs: record('queryAddrs', 'QueryAddrs'),
      subscribeReceiveEvents: record('subscribe', 'SubscribeReceiveEvents'),
      unpackProofFile: record('unpackProofFile', 'UnpackProofFile'),
      verifyProof: record('verifyProof', 'VerifyProof'),
    },
  } as any;
};

test('Each request encodes with the tapd protos', async () => {
  const requests: Record<string, any> = {};
  const tapd = fakeTapd(requests);
  const ignore = () => {};

  await getAssetAddresses({
    created_after: '2023-11-14T22:13:20.000Z',
    limit: 5,
    tapd,
  }).catch(ignore);

  await decodeAssetAddress({address: 'taprt1address', tapd}).catch(ignore);

  await getAssetReceives({
    address: 'taprt1address',
    created_before: '2027-01-15T08:00:00.000Z',
    status: 'completed',
    tapd,
  }).catch(ignore);

  subscribeToAssetReceives({
    address: 'taprt1address',
    created_after: '2023-11-14T22:13:20.000Z',
    tapd,
  });

  await verifyAssetProof({proof, tapd}).catch(ignore);

  await decodeAssetProof({
    depth: 1,
    is_including_meta: true,
    proof,
    tapd,
  }).catch(ignore);

  await exportAssetProof({
    asset_id: assetId,
    script_key: scriptKey,
    tapd,
    transaction_id: `01${'00'.repeat(31)}`,
    transaction_vout: 3,
  }).catch(ignore);

  await unpackAssetProofFile({proof, tapd}).catch(ignore);

  deepStrictEqual(requests.queryAddrs, {
    created_after: '1700000000',
    created_before: '0',
    limit: 5,
    offset: 0,
  });

  deepStrictEqual(requests.decodeAddr, {addr: 'taprt1address'});

  deepStrictEqual(requests.addrReceives, {
    direction: 'SORT_DIRECTION_DESC',
    end_timestamp: '1800000000',
    filter_addr: 'taprt1address',
    filter_status: 'ADDR_EVENT_STATUS_COMPLETED',
    limit: 100,
    offset: 0,
    start_timestamp: '0',
  });

  deepStrictEqual(requests.subscribe, {
    filter_addr: 'taprt1address',
    start_timestamp: '1700000000000000',
  });

  deepStrictEqual(requests.verifyProof, {
    genesis_point: '',
    raw_proof_file: Buffer.from(proof, 'hex'),
  });

  deepStrictEqual(requests.decodeProof, {
    proof_at_depth: 1,
    raw_proof: Buffer.from(proof, 'hex'),
    with_meta_reveal: true,
    with_prev_witnesses: false,
  });

  deepStrictEqual(requests.exportProof, {
    asset_id: Buffer.from(assetId, 'hex'),
    outpoint: {
      output_index: 3,
      txid: Buffer.from(`${'00'.repeat(31)}01`, 'hex'),
    },
    script_key: Buffer.from(scriptKey, 'hex'),
  });

  deepStrictEqual(requests.unpackProofFile, {
    raw_proof_file: Buffer.from(proof, 'hex'),
  });
});
