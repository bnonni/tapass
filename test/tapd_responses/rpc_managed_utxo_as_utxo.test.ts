import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcManagedUtxoAsUtxo} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_responses.js';

const [rpcUtxo] = Object.values(responses.listUtxos.managed_utxos) as any[];

test('A real tapd UTXO is mapped', () => {
  const utxo = rpcManagedUtxoAsUtxo(rpcUtxo);

  deepStrictEqual(utxo.assets.length, 1);
  deepStrictEqual(utxo.assets[0]?.name, 'smoke-coin');
  deepStrictEqual(utxo.internal_key, rpcUtxo.internal_key.toString('hex'));
  deepStrictEqual(
    utxo.lease_expires_at,
    undefined,
    'The zero time is no lease',
  );
  deepStrictEqual(utxo.lease_owner, undefined);
  deepStrictEqual(utxo.merkle_root, rpcUtxo.merkle_root.toString('hex'));
  deepStrictEqual(
    utxo.taproot_asset_root,
    rpcUtxo.taproot_asset_root.toString('hex'),
  );
  deepStrictEqual(utxo.tokens, 1000);
  deepStrictEqual(
    utxo.transaction_id,
    '35c4f78c160694f4d2401edf6b8c483cc0e2853a43c1648f2e09596da19a5aae',
  );
  deepStrictEqual(utxo.transaction_vout, 0);
});

test('A lease is mapped', () => {
  const utxo = rpcManagedUtxoAsUtxo({
    ...rpcUtxo,
    lease_expiry_unix: '1800000000',
    lease_owner: Buffer.alloc(32, 1),
  });

  deepStrictEqual(utxo.lease_expires_at, '2027-01-15T08:00:00.000Z');
  deepStrictEqual(utxo.lease_owner, Buffer.alloc(32, 1).toString('hex'));
});

const errors = [
  {args: null, error: 'ExpectedRpcManagedUtxoDetails'},
  {
    args: {...rpcUtxo, amt_sat: undefined},
    error: 'ExpectedOutputValueInRpcManagedUtxo',
  },
  {
    args: {...rpcUtxo, assets: null},
    error: 'ExpectedArrayOfAssetsInRpcManagedUtxo',
  },
  {
    args: {...rpcUtxo, internal_key: 'key'},
    error: 'ExpectedKeysInRpcManagedUtxo',
  },
  {
    args: {...rpcUtxo, taproot_asset_root: null},
    error: 'ExpectedTaprootAssetRootInRpcManagedUtxo',
  },
  {
    args: {...rpcUtxo, out_point: 'x'},
    error: 'ExpectedOutpointWithTransactionIdAndOutputIndex',
  },
];

errors.forEach(({args, error}) => {
  return test(`A bad UTXO is ${error}`, () => {
    throws(() => rpcManagedUtxoAsUtxo(args), new Error(error));
  });
});
