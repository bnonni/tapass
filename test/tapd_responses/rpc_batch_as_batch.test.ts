import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcBatchAsBatch} from '../../src/tapd_responses/index.js';
import {mintResponses} from '../fixtures/tapd_mint_responses.js';

const batch = mintResponses.mintAsset.pending_batch;
const verbose = mintResponses.fundBatch.batch;

const tests = [
  {
    args: {batch: null},
    description: 'A batch is expected',
    error: 'ExpectedRpcMintingBatch',
  },
  {
    args: {batch: {...batch, assets: null}},
    description: 'An array of assets is expected',
    error: 'ExpectedArrayOfAssetsInRpcMintingBatch',
  },
  {
    args: {batch: {...batch, batch_key: Buffer.alloc(0)}},
    description: 'A batch key is expected',
    error: 'ExpectedBatchKeyInRpcMintingBatch',
  },
  {
    args: {batch: {...batch, batch_psbt: undefined}},
    description: 'A batch PSBT buffer is expected',
    error: 'ExpectedBatchPsbtInRpcMintingBatch',
  },
  {
    args: {batch: {...batch, created_at: 1}},
    description: 'A created at time is expected',
    error: 'ExpectedCreatedAtInRpcMintingBatch',
  },
  {
    args: {batch: {...batch, state: 'BATCH_STATE_NEW'}},
    description: 'A known state is expected',
    error: 'ExpectedKnownStateInRpcMintingBatch',
  },
  {
    args: {batch, unsealed_assets: {}},
    description: 'An array of unsealed assets is expected',
    error: 'ExpectedArrayOfUnsealedAssetsInRpcVerboseBatch',
  },
  {
    args: {batch: {...batch, assets: [null]}},
    description: 'A pending asset is expected',
    error: 'ExpectedPendingAssetInRpcMintingBatch',
  },
  {
    args: {batch: {...batch, assets: [{...batch.assets[0], name: ''}]}},
    description: 'An asset name is expected',
    error: 'ExpectedAssetNameInRpcPendingAsset',
  },
  {
    args: {batch: {...batch, assets: [{...batch.assets[0], amount: 1}]}},
    description: 'An asset amount is expected',
    error: 'ExpectedAmountInRpcPendingAsset',
  },
  {
    args: {
      batch: {...batch, assets: [{...batch.assets[0], asset_version: 'V9'}]},
    },
    description: 'A known asset version is expected',
    error: 'ExpectedKnownVersionInRpcPendingAsset',
  },
  {
    args: {batch: {...batch, assets: [{...batch.assets[0], group_key: null}]}},
    description: 'Group details are expected',
    error: 'ExpectedGroupDetailsInRpcPendingAsset',
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, () => {
    throws(() => rpcBatchAsBatch(args as any), new Error(error), 'Got error');

    return;
  });
});

test('A real pending batch is mapped', () => {
  const [, collectible] = batch.assets;

  deepStrictEqual(rpcBatchAsBatch({batch}), {
    assets: [
      {
        amount: '5000',
        group_anchor: undefined,
        group_internal_key: undefined,
        group_key: undefined,
        group_tapscript_root: undefined,
        is_collectible: false,
        is_new_group: false,
        metadata: batch.assets[0].asset_meta.data.toString('hex'),
        metadata_hash: batch.assets[0].asset_meta.meta_hash.toString('hex'),
        metadata_type: 'json',
        name: batch.assets[0].name,
        script_key: batch.assets[0].script_key.pub_key.toString('hex'),
        version: 0,
      },
      {
        amount: '1',
        group_anchor: undefined,
        group_internal_key: undefined,
        group_key: undefined,
        group_tapscript_root: undefined,
        is_collectible: true,
        is_new_group: false,
        metadata: '612070696374757265',
        metadata_hash:
          'b2e0fe8c310dca028cebb0970005975dfec0f2358bf07039c339df1d8a909958',
        metadata_type: 'opaque',
        name: collectible.name,
        script_key:
          '80e1cf528edb0d4c5bd2e2913b92d314f531c6a9d8254245d986d663744297c3',
        version: 0,
      },
    ],
    created_at: '2026-10-15T21:52:28.000Z',
    created_height: 112,
    id: '020f6975d70317c3c26bda3d0be07f24a8cd7985133e81daa7dd4ee0066da3320a',
    psbt: undefined,
    state: 'pending',
    transaction_id: undefined,
    unsealed_assets: [],
  });
});

test('The JSON metadata of a real asset has the decimal display', () => {
  const [asset] = rpcBatchAsBatch({batch}).assets;

  const metadata = JSON.parse(
    Buffer.from(asset.metadata || '', 'hex').toString(),
  );

  deepStrictEqual(metadata, {decimal_display: 2, description: 'test'});
});

test('A real verbose batch maps the unsealed asset PSBT to hex', () => {
  const [unsealed] = verbose.unsealed_assets;

  const mapped = rpcBatchAsBatch(verbose);

  deepStrictEqual(mapped.unsealed_assets.length, 1);
  deepStrictEqual(mapped.unsealed_assets[0].is_new_group, true);
  deepStrictEqual(
    mapped.unsealed_assets[0].group_virtual_psbt,
    Buffer.from(unsealed.group_virtual_psbt, 'base64').toString('hex'),
  );
  deepStrictEqual(
    mapped.unsealed_assets[0].group_virtual_psbt?.slice(0, 10),
    '70736274ff',
  );
  deepStrictEqual(
    mapped.unsealed_assets[0].group_virtual_transaction,
    unsealed.group_virtual_tx.transaction.toString('hex'),
  );
  deepStrictEqual(!!mapped.psbt, true);
});

test('A real finalized batch has a transaction id and a PSBT', () => {
  const mapped = rpcBatchAsBatch(mintResponses.finalizeBatch);

  deepStrictEqual(mapped.state, 'broadcast');
  deepStrictEqual(mapped.transaction_id?.length, 64);
  deepStrictEqual(mapped.psbt?.slice(0, 10), '70736274ff');
});
