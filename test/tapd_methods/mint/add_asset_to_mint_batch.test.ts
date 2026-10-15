import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {addAssetToMintBatch} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcBatchAsBatch} from '../../../src/tapd_responses/index.js';
import {mintResponses} from '../../fixtures/tapd_mint_responses.js';

const groupKey = `02${'11'.repeat(32)}`;
const res = mintResponses.mintAsset;

const tapdWith = (mintAsset: (req: any, cbk: Function) => void) => {
  return {mint: {mintAsset}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, res));

const args = {amount: '100', name: 'coin', tapd};

const tests = [
  {
    args: {...args, name: ' '},
    description: 'An asset name is expected',
    error: [400, 'ExpectedAssetNameToAddAssetToMintBatch'],
  },
  {
    args: {...args, name: 'a'.repeat(65)},
    description: 'A short asset name is expected',
    error: [400, 'ExpectedShorterAssetNameToAddAssetToMintBatch'],
  },
  {
    args: {...args, amount: '2', is_collectible: true},
    description: 'A collectible has an amount of 1',
    error: [400, 'ExpectedAmountOfOneForCollectibleAsset'],
  },
  {
    args: {...args, amount: '0'},
    description: 'A normal asset needs an amount',
    error: [400, 'ExpectedAmountToAddAssetToMintBatch'],
  },
  {
    args: {...args, decimal_display: 1.5},
    description: 'An integer decimal display is expected',
    error: [400, 'ExpectedDecimalDisplayToAddAssetToMintBatch'],
  },
  {
    args: {...args, decimal_display: 13},
    description: 'A decimal display of 12 or less is expected',
    error: [400, 'ExpectedDecimalDisplayOfTwelveOrLess'],
  },
  {
    args: {
      ...args,
      amount: undefined,
      decimal_display: 2,
      is_collectible: true,
    },
    description: 'A collectible has no decimal display',
    error: [400, 'UnexpectedDecimalDisplayForCollectibleAsset'],
  },
  {
    args: {...args, metadata: '00', metadata_text: 'a'},
    description: 'Metadata hex and text are not expected together',
    error: [400, 'ExpectedMetadataHexOrMetadataTextNotBoth'],
  },
  {
    args: {...args, metadata: 'xyz'},
    description: 'Hex metadata is expected',
    error: [400, 'ExpectedHexMetadataToAddAssetToMintBatch'],
  },
  {
    args: {...args, is_json_metadata: true, metadata_text: '[1]'},
    description: 'JSON metadata is a JSON object',
    error: [400, 'ExpectedJsonObjectMetadataToAddAssetToMintBatch'],
  },
  {
    args: {
      ...args,
      is_json_metadata: true,
      metadata: Buffer.from('{').toString('hex'),
    },
    description: 'JSON metadata in hex is a JSON object',
    error: [400, 'ExpectedJsonObjectMetadataToAddAssetToMintBatch'],
  },
  {
    args: {...args, group_anchor: 'a', group_key: groupKey},
    description: 'A group key and a group anchor are not expected together',
    error: [400, 'ExpectedGroupKeyOrGroupAnchorNotBoth'],
  },
  {
    args: {...args, group_key: 'key'},
    description: 'A group public key is expected',
    error: [400, 'ExpectedGroupPublicKeyToAddAssetToMintBatch'],
  },
  {
    args: {...args, group_key: groupKey, is_new_group: true},
    description: 'A new group does not use an existing group',
    error: [400, 'UnexpectedExistingGroupForNewGroupAsset'],
  },
  {
    args: {...args, group_tapscript_root: '00'.repeat(32)},
    description: 'A group tapscript root needs a new group',
    error: [400, 'UnexpectedGroupTapscriptRootWithoutNewGroup'],
  },
  {
    args: {...args, group_tapscript_root: '00', is_new_group: true},
    description: 'A group tapscript root is a hash',
    error: [400, 'ExpectedGroupTapscriptRootHashToMintAsset'],
  },
  {
    args: {...args, group_internal_key: {public_key: groupKey}},
    description: 'A group internal key needs a new group',
    error: [400, 'UnexpectedGroupKeyDetailsWithoutNewGroup'],
  },
  {
    args: {
      ...args,
      external_group_key: {
        derivation_path: "m/86'/0'/0'",
        master_fingerprint: '01020304',
        xpub: 'xpub',
      },
      group_internal_key: {public_key: groupKey},
      is_new_group: true,
    },
    description:
      'An internal key and an external key are not expected together',
    error: [400, 'ExpectedGroupInternalKeyOrExternalKeyNotBoth'],
  },
  {
    args: {
      ...args,
      group_internal_key: {public_key: 'key'},
      is_new_group: true,
    },
    description: 'A group internal public key is expected',
    error: [400, 'ExpectedGroupInternalPublicKeyToMintAsset'],
  },
  {
    args: {
      ...args,
      external_group_key: {
        derivation_path: '',
        master_fingerprint: '01020304',
        xpub: 'xpub',
      },
      is_new_group: true,
    },
    description: 'External group key details are expected',
    error: [400, 'ExpectedExternalGroupKeyDetailsToMintAsset'],
  },
  {
    args: {
      ...args,
      external_group_key: {
        derivation_path: "m/86'/0'/0'",
        master_fingerprint: '01',
        xpub: 'xpub',
      },
      is_new_group: true,
    },
    description: 'A 4 byte master fingerprint is expected',
    error: [400, 'ExpectedMasterFingerprintForExternalGroupKey'],
  },
  {
    args: {...args, is_supply_committed: true},
    description: 'Supply commitments need a new group',
    error: [400, 'UnexpectedSupplyCommitmentsWithoutNewGroup'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToAddAssetToMintBatch'],
  },
  {
    args: {...args, version: 2},
    description: 'A known asset version is expected',
    error: [400, 'ExpectedKnownAssetVersionToAddAssetToMintBatch'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToAddAssetToMintBatch'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToAddAssetToMintBatch'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => {
        return cbk({code: 2, details: 'invalid asset name: unprintable'});
      }),
    },
    description: 'A known error is returned',
    error: [400, 'ExpectedValidAssetName'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorAddingAssetToMintBatch', {err: 'err'}],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToAddAssetToMintBatch'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A pending batch is expected',
    error: [503, 'ExpectedRpcMintingBatch'],
  },
  {
    args,
    description: 'The pending batch is returned',
    expected: rpcBatchAsBatch({batch: res.pending_batch}),
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(addAssetToMintBatch(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await addAssetToMintBatch(args), expected, 'Got batch');
    }

    return;
  });
});

test('The request has the asset details', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req.asset);

    return cbk(null, res);
  });

  await addAssetToMintBatch({
    tapd,
    amount: '5000',
    decimal_display: 2,
    is_json_metadata: true,
    metadata_text: '{"description":"test"}',
    name: 'coin',
  });

  await addAssetToMintBatch({
    tapd,
    is_collectible: true,
    metadata: '612070696374757265',
    name: 'picture',
    version: 1,
  });

  await addAssetToMintBatch({
    tapd,
    amount: '10',
    group_internal_key: {key_family: 6, key_index: 1, public_key: groupKey},
    group_tapscript_root: '22'.repeat(32),
    is_new_group: true,
    is_supply_committed: true,
    name: 'group',
  });

  await addAssetToMintBatch({
    tapd,
    amount: '7',
    group_key: groupKey,
    name: 'g',
  });

  const [json, collectible, newGroup, grouped] = requests;

  deepStrictEqual(json, {
    amount: '5000',
    asset_meta: {
      data: Buffer.from('{"description":"test"}'),
      type: 'META_TYPE_JSON',
    },
    asset_type: 'NORMAL',
    asset_version: 'ASSET_VERSION_V0',
    decimal_display: 2,
    enable_supply_commitments: false,
    external_group_key: undefined,
    group_anchor: '',
    group_internal_key: undefined,
    group_key: Buffer.alloc(0),
    group_tapscript_root: Buffer.alloc(0),
    grouped_asset: false,
    name: 'coin',
    new_grouped_asset: false,
  });

  deepStrictEqual(collectible.amount, '1');
  deepStrictEqual(collectible.asset_meta, {
    data: Buffer.from('a picture'),
    type: 'META_TYPE_OPAQUE',
  });
  deepStrictEqual(collectible.asset_type, 'COLLECTIBLE');
  deepStrictEqual(collectible.asset_version, 'ASSET_VERSION_V1');

  deepStrictEqual(newGroup.enable_supply_commitments, true);
  deepStrictEqual(newGroup.group_internal_key, {
    key_loc: {key_family: 6, key_index: 1},
    raw_key_bytes: Buffer.from(groupKey, 'hex'),
  });
  deepStrictEqual(newGroup.group_tapscript_root, Buffer.alloc(32, 0x22));
  deepStrictEqual(newGroup.new_grouped_asset, true);

  deepStrictEqual(grouped.group_key, Buffer.from(groupKey, 'hex'));
  deepStrictEqual(grouped.grouped_asset, true);
  deepStrictEqual(grouped.asset_meta, undefined);
});
