import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import {addAssetToMintBatch} from '../../../src/index.js';
import {fundMintBatch} from '../../../src/index.js';
import {getMintBatches} from '../../../src/index.js';
import {sealMintBatch} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import grpcOptions from '../../../src/tapd_grpc/grpc_options.js';
import {mintResponses} from '../../fixtures/tapd_mint_responses.js';

const protos = fileURLToPath(new URL('../../../protos/', import.meta.url));

const definition = loadSync(join(protos, 'taprpc/mintrpc/mint.proto'), {
  ...grpcOptions,
  includeDirs: [join(protos, 'taprpc'), protos],
});

const {service} = (grpc.loadPackageDefinition(definition) as any).mintrpc.Mint;

const key = `02${'11'.repeat(32)}`;

// Encode each request with the real protos, and decode it the way tapd does
const tapd = (requests: any[]) => {
  const call = (rpc: string, res: object) => (req: any, cbk: Function) => {
    const {requestDeserialize, requestSerialize} = service[rpc];

    requests.push(requestDeserialize(requestSerialize(req)));

    return cbk(null, res);
  };

  return {
    mint: {
      fundBatch: call('FundBatch', mintResponses.fundBatch),
      listBatches: call('ListBatches', {batches: []}),
      mintAsset: call('MintAsset', mintResponses.mintAsset),
      sealBatch: call('SealBatch', mintResponses.sealBatch),
    },
  } as unknown as AuthenticatedTapd;
};

test('A mint asset request encodes with the protos', async () => {
  const requests: any[] = [];

  await addAssetToMintBatch({
    amount: '18446744073709551615',
    decimal_display: 2,
    group_internal_key: {key_family: 6, key_index: 1, public_key: key},
    group_tapscript_root: '22'.repeat(32),
    is_json_metadata: true,
    is_new_group: true,
    is_supply_committed: true,
    metadata_text: '{"a":1}',
    name: 'coin',
    tapd: tapd(requests),
    version: 1,
  });

  await addAssetToMintBatch({
    external_group_key: {
      derivation_path: "m/86'/0'/0'",
      master_fingerprint: '01020304',
      xpub: 'xpub',
    },
    is_collectible: true,
    is_new_group: true,
    name: 'picture',
    tapd: tapd(requests),
  });

  const [{asset}, {asset: collectible}] = requests;

  equal(asset.amount, '18446744073709551615');
  deepStrictEqual(asset.asset_meta.data, Buffer.from('{"a":1}'));
  equal(asset.asset_meta.type, 'META_TYPE_JSON');
  equal(asset.asset_version, 'ASSET_VERSION_V1');
  equal(asset.decimal_display, 2);
  equal(asset.enable_supply_commitments, true);
  deepStrictEqual(asset.group_internal_key.key_loc, {
    key_family: 6,
    key_index: 1,
  });
  equal(asset.new_grouped_asset, true);

  equal(collectible.amount, '1');
  equal(collectible.asset_type, 'COLLECTIBLE');
  deepStrictEqual(collectible.external_group_key, {
    derivation_path: "m/86'/0'/0'",
    master_fingerprint: Buffer.from('01020304', 'hex'),
    xpub: 'xpub',
  });
});

test('Fund, seal, and list requests encode with the protos', async () => {
  const requests: any[] = [];

  await fundMintBatch({
    fee_tokens_per_vbyte: 2,
    tapd: tapd(requests),
    tapscript_branch: {left: '11'.repeat(32), right: '22'.repeat(32)},
  });

  await sealMintBatch({
    group_witnesses: [{asset_id: '33'.repeat(32), witness: ['0102']}],
    tapd: tapd(requests),
  });

  await getMintBatches({id: key, is_verbose: true, tapd: tapd(requests)});

  const [fund, seal, list] = requests;

  equal(fund.batch_sibling, 'branch');
  deepStrictEqual(fund.branch.left_taphash, Buffer.alloc(32, 0x11));
  equal(fund.fee_rate, 500);

  deepStrictEqual(seal.group_witnesses[0].genesis_id, Buffer.alloc(32, 0x33));

  equal(list.filter, 'batch_key');
  deepStrictEqual(list.batch_key, Buffer.from(key, 'hex'));
  equal(list.verbose, true);
});
