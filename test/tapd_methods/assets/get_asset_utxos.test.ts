import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {getAssetUtxos} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const tapdWith = (listUtxos: (req: any, cbk: Function) => void) => {
  return {default: {listUtxos}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, responses.listUtxos));

const tests = [
  {
    args: {script_key_type: 'other', tapd},
    description: 'A known script key type is expected',
    error: [400, 'ExpectedKnownScriptKeyTypeToGetAssetUtxos'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToGetAssetUtxos'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToGetAssetUtxos'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToGetAssetUtxos'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorGettingAssetUtxos', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'Managed UTXOs are expected',
    error: [503, 'ExpectedManagedUtxosInAssetUtxosResponse'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {managed_utxos: {a: {}}}))},
    description: 'Valid UTXOs are expected',
    error: [503, 'ExpectedOutputValueInRpcManagedUtxo'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(getAssetUtxos(args), error, 'Got expected error');

    return;
  });
});

test('Real tapd UTXOs are returned, sorted by outpoint', async () => {
  const [utxo] = Object.values(responses.listUtxos.managed_utxos) as any[];

  const tapd = tapdWith((_, cbk) => {
    return cbk(null, {
      managed_utxos: {
        b: {...utxo, out_point: `${'ff'.repeat(32)}:0`},
        a: {...utxo, out_point: `${'00'.repeat(32)}:2`},
        c: {...utxo, out_point: `${'00'.repeat(32)}:1`},
      },
    });
  });

  const {utxos} = await getAssetUtxos({tapd});

  deepStrictEqual(
    utxos.map(n => `${n.transaction_id.slice(0, 2)}:${n.transaction_vout}`),
    ['00:1', '00:2', 'ff:0'],
  );

  equal(utxos[0]?.assets[0]?.name, 'smoke-coin');
});

test('The request has the filters', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {managed_utxos: {}});
  });

  await getAssetUtxos({tapd});
  await getAssetUtxos({
    is_including_leased: true,
    script_key_type: 'all',
    tapd,
  });

  deepStrictEqual(requests, [
    {include_leased: false, script_key_type: undefined},
    {include_leased: true, script_key_type: {all_types: true}},
  ]);
});
