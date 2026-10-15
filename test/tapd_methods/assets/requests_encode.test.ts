import {deepStrictEqual} from 'node:assert/strict';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import {getAssetBalances} from '../../../src/index.js';
import {getAssetBurns} from '../../../src/index.js';
import {getAssetGroups} from '../../../src/index.js';
import {getAssetMetadata} from '../../../src/index.js';
import {getAssetUtxos} from '../../../src/index.js';
import {getAssets} from '../../../src/index.js';
import {getTapdInfo} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import grpcOptions from '../../../src/tapd_grpc/grpc_options.js';
import {assetResponses} from '../../fixtures/tapd_asset_responses.js';
import {responses} from '../../fixtures/tapd_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const groupKey = `02${'aa'.repeat(32)}`;
const protos = fileURLToPath(new URL('../../../protos/', import.meta.url));
const txId = '2272ef668566570cf57ec502d2fb6302ee439bb33ce8d856d03e6f00bb31c661';

const definition = loadSync(join(protos, 'taprpc/taprootassets.proto'), {
  ...grpcOptions,
  includeDirs: [join(protos, 'taprpc'), protos],
});

const {service} = (grpc.loadPackageDefinition(definition) as any).taprpc
  .TaprootAssets;

const encoded: Record<string, any> = {};

const replies: Record<string, any> = {
  FetchAsset: {assets: responses.listAssets.assets},
  FetchAssetMeta: assetResponses.fetchAssetMeta,
  GetInfo: responses.getInfo,
  ListAssets: responses.listAssets,
  ListBalances: responses.listBalances,
  ListBurns: assetResponses.listBurns,
  ListGroups: responses.listGroups,
  ListUtxos: responses.listUtxos,
};

// Each method encodes the request with the protos, then decodes it
const tapd = {
  default: Object.fromEntries(
    Object.keys(replies).map(name => {
      const method = name.charAt(0).toLowerCase() + name.slice(1);
      const {requestDeserialize, requestSerialize} = service[name];

      return [
        method,
        (req: any, cbk: Function) => {
          encoded[name] = [
            ...(encoded[name] || []),
            requestDeserialize(requestSerialize(req)),
          ];

          return cbk(null, replies[name]);
        },
      ];
    }),
  ),
} as unknown as AuthenticatedTapd;

test('The requests encode with the tapd protos', async () => {
  await getAssets({
    group_key: groupKey,
    limit: 9,
    script_key_type: 'channel',
    tapd,
  });
  await getAssets({asset_id: assetId, script_key_type: 'all', tapd});
  await getAssetUtxos({is_including_leased: true, tapd});
  await getAssetGroups({tapd});
  await getAssetBalances({group_key: groupKey, tapd});
  await getAssetMetadata({meta_hash: assetId, tapd});
  await getTapdInfo({tapd});
  await getAssetBurns({tapd, transaction_id: txId});

  const [list] = encoded.ListAssets;

  deepStrictEqual(list.group_key, Buffer.from(groupKey, 'hex'));
  deepStrictEqual(list.limit, 9);
  deepStrictEqual(list.script_key_type, {
    explicit_type: 'SCRIPT_KEY_CHANNEL',
    type: 'explicit_type',
  });

  const [fetch] = encoded.FetchAsset;

  deepStrictEqual(fetch.asset_specifier, {
    asset_id: Buffer.from(assetId, 'hex'),
    id: 'asset_id',
  });
  deepStrictEqual(fetch.script_key_type, {all_types: true, type: 'all_types'});

  deepStrictEqual(encoded.ListUtxos[0].include_leased, true);

  const [byAsset, byGroup] = encoded.ListBalances;

  deepStrictEqual(byAsset.group_by, 'asset_id');
  deepStrictEqual(byGroup.group_by, 'group_key');
  deepStrictEqual(byGroup.group_key_filter, Buffer.from(groupKey, 'hex'));

  deepStrictEqual(encoded.FetchAssetMeta[0].asset, 'meta_hash');
  deepStrictEqual(
    encoded.ListBurns[0].anchor_txid,
    Buffer.from(txId, 'hex').reverse(),
  );
  deepStrictEqual(Object.keys(encoded).sort(), Object.keys(replies).sort());
});
