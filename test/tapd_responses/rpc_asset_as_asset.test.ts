import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAssetAsAsset} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_responses.js';

const [rpcAsset] = responses.listAssets.assets;

const tests = [
  {
    args: null,
    description: 'Asset details are expected',
    error: 'ExpectedRpcAssetDetails',
  },
  {
    args: {...rpcAsset, amount: 1},
    description: 'A numeric amount is expected',
    error: 'ExpectedAmountInRpcAsset',
  },
  {
    args: {...rpcAsset, asset_genesis: null},
    description: 'A genesis is expected',
    error: 'ExpectedAssetGenesisInRpcAsset',
  },
  {
    args: {
      ...rpcAsset,
      asset_genesis: {...rpcAsset.asset_genesis, meta_hash: ''},
    },
    description: 'A metadata hash is expected',
    error: 'ExpectedMetaHashInRpcAssetGenesis',
  },
  {
    args: {...rpcAsset, script_key: undefined},
    description: 'A script key is expected',
    error: 'ExpectedScriptKeyInRpcAsset',
  },
  {
    args: {...rpcAsset, version: 'ASSET_VERSION_V9'},
    description: 'A known version is expected',
    error: 'ExpectedKnownVersionInRpcAsset',
  },
  {
    args: {
      ...rpcAsset,
      asset_genesis: {...rpcAsset.asset_genesis, genesis_point: 'x'},
    },
    description: 'A genesis outpoint is expected',
    error: 'ExpectedOutpointWithTransactionIdAndOutputIndex',
  },
  {
    args: rpcAsset,
    description: 'A real tapd asset is mapped',
    expected: {
      amount: '1000000',
      anchor: {
        block_hash:
          '6397509e072b77bdbeda969a26f354e7bfed3ca4eaadc008d082f3b84434ba0a',
        block_height: 103,
        confirmed_at: '2026-10-15T19:50:04.000Z',
        internal_key:
          '0373a93fc36407348d84da4ff44d5669b13e9c17eecff835685079338561c177e7',
        merkle_root:
          'eb7ec21b5822232b68cfde57b106b534a8cb1d2cc6a39372f38d312c5d09f09f',
        tapscript_sibling: undefined,
        transaction: rpcAsset.chain_anchor.anchor_tx.toString('hex'),
        transaction_id:
          '35c4f78c160694f4d2401edf6b8c483cc0e2853a43c1648f2e09596da19a5aae',
        transaction_vout: 0,
      },
      asset_id:
        '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2',
      decimal_display: undefined,
      genesis_output_index: 0,
      genesis_transaction_id:
        '194b2d31fa33b89c7045a4fa5ce859e70ae3c6bdf41164b7bd3cee31f4a9323b',
      genesis_transaction_vout: 0,
      group: undefined,
      is_burn: false,
      is_collectible: false,
      is_local: true,
      is_spent: false,
      lease_expires_at: undefined,
      lease_owner: undefined,
      lock_time: undefined,
      meta_hash:
        'f19bbf25df2e3f02ef33bd8edfdea2a176f38f608065f920aeef077644a268bd',
      name: 'smoke-coin',
      relative_lock_time: undefined,
      script_key:
        '02aa423ce3a4f9727445d6f9eb3ad99ae9d3fdc01959913a844045ac17504a316b',
      script_key_type: 'bip86',
      script_version: 0,
      version: 0,
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, () => {
    if (!!error) {
      throws(() => rpcAssetAsAsset(args), new Error(error), 'Got error');
    } else {
      deepStrictEqual(rpcAssetAsAsset(args), expected, 'Got asset');
    }

    return;
  });
});

test('Group, lease, and decimal display details are mapped', () => {
  const key = Buffer.alloc(33, 2);

  const asset = rpcAssetAsAsset({
    ...rpcAsset,
    asset_genesis: {...rpcAsset.asset_genesis, asset_type: 'COLLECTIBLE'},
    asset_group: {
      asset_witness: Buffer.alloc(0),
      raw_group_key: key,
      tapscript_root: Buffer.alloc(32, 3),
      tweaked_group_key: key,
    },
    chain_anchor: null,
    decimal_display: {decimal_display: 2},
    lease_expiry: '1800000000',
    lease_owner: Buffer.alloc(32, 1),
  });

  deepStrictEqual(asset.anchor, undefined);
  deepStrictEqual(asset.decimal_display, 2);
  deepStrictEqual(asset.group, {
    key: key.toString('hex'),
    raw_key: key.toString('hex'),
    tapscript_root: Buffer.alloc(32, 3).toString('hex'),
    witness: undefined,
  });
  deepStrictEqual(asset.is_collectible, true);
  deepStrictEqual(asset.lease_expires_at, '2027-01-15T08:00:00.000Z');
  deepStrictEqual(asset.lease_owner, Buffer.alloc(32, 1).toString('hex'));
});
