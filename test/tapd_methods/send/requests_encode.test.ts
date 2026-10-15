import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {join} from 'node:path';
import test from 'node:test';
import {fileURLToPath} from 'node:url';

import grpc from '@grpc/grpc-js';
import {loadSync} from '@grpc/proto-loader';

import {burnAsset} from '../../../src/index.js';
import {createTapdMacaroon} from '../../../src/index.js';
import {getAssetTransfers} from '../../../src/index.js';
import {registerAssetTransfer} from '../../../src/index.js';
import {sendAsset} from '../../../src/index.js';
import {setTapdDebugLevel} from '../../../src/index.js';
import {stopTapd} from '../../../src/index.js';
import {subscribeToAssetSends} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import grpcOptions from '../../../src/tapd_grpc/grpc_options.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const protos = fileURLToPath(new URL('../../../protos/', import.meta.url));
const scriptKey = `02${'11'.repeat(32)}`;
const txId = `01${'00'.repeat(31)}`;

const definition = loadSync(join(protos, 'taprpc/taprootassets.proto'), {
  ...grpcOptions,
  includeDirs: [join(protos, 'taprpc'), protos],
});

const {service} = (grpc.loadPackageDefinition(definition) as any).taprpc
  .TaprootAssets;

// Encode a request to protobuf bytes and decode it the way tapd reads it
const overTheWire = (rpc: string, req: object) => {
  const {requestDeserialize, requestSerialize} = service[rpc];

  return requestDeserialize(requestSerialize(req));
};

// A fake tapd that encodes each request and then fails the call
const encodingTapd = (requests: Record<string, any>) => {
  const methods = Object.keys(service).map(rpc => {
    const name = rpc.charAt(0).toLowerCase() + rpc.slice(1);

    const handler = (req: any, cbk?: Function) => {
      requests[rpc] = overTheWire(rpc, req);

      // Exit early for a subscription, which has no callback
      if (!cbk) {
        return Object.assign(new EventEmitter(), {
          cancel: () => {},
        });
      }

      return cbk('stop');
    };

    return [name, handler];
  });

  return {default: Object.fromEntries(methods)} as unknown as AuthenticatedTapd;
};

test('Each request encodes with the tapd protos', async () => {
  const requests: Record<string, any> = {};
  const tapd = encodingTapd(requests);
  const ignore = () => {};

  await burnAsset({
    amount: '5',
    asset_id: assetId,
    is_burn_confirmed: true,
    tapd,
  }).catch(ignore);

  await createTapdMacaroon({
    permissions: [{action: 'read', entity: 'assets'}],
    root_key_id: '18446744073709551615',
    tapd,
  }).catch(ignore);

  await getAssetTransfers({tapd, transaction_id: txId}).catch(ignore);

  await registerAssetTransfer({
    asset_id: assetId,
    script_key: scriptKey,
    tapd,
    transaction_id: txId,
    transaction_vout: 3,
  }).catch(ignore);

  await sendAsset({
    addresses: [{address: 'taprt1a', amount: '5'}],
    fee_tokens_per_vbyte: 2,
    tapd,
  }).catch(ignore);

  await setTapdDebugLevel({level: 'debug', tapd}).catch(ignore);
  await stopTapd({tapd}).catch(ignore);

  subscribeToAssetSends({
    label: 'label',
    start_at: '2023-11-14T22:13:20.000Z',
    tapd,
  });

  equal(requests.BurnAsset.amount_to_burn, '5');
  equal(requests.BurnAsset.asset, 'asset_id');
  deepStrictEqual(requests.BurnAsset.asset_id, Buffer.from(assetId, 'hex'));
  equal(requests.BurnAsset.asset_specifier.id, 'asset_id');
  equal(requests.BurnAsset.confirmation_text, 'assets will be destroyed');

  equal(requests.BakeMacaroon.root_key_id, '18446744073709551615');
  deepStrictEqual(requests.BakeMacaroon.permissions, [
    {action: 'read', entity: 'assets'},
  ]);

  equal(requests.ListTransfers.anchor_txid, txId);

  equal(requests.RegisterTransfer.outpoint.output_index, 3);
  deepStrictEqual(
    requests.RegisterTransfer.outpoint.txid,
    Buffer.from(txId, 'hex').reverse(),
  );

  deepStrictEqual(requests.SendAsset.addresses_with_amounts, [
    {amount: '5', tap_addr: 'taprt1a'},
  ]);
  equal(requests.SendAsset.fee_rate, 500);

  equal(requests.DebugLevel.level_spec, 'debug');
  deepStrictEqual(requests.StopDaemon, {});

  equal(requests.SubscribeSendEvents.filter_label, 'label');
  equal(requests.SubscribeSendEvents.start_timestamp, '1700000000000000');
});
