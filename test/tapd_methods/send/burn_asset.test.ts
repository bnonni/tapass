import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {burnAsset} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_send_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const groupKey = `02${'11'.repeat(32)}`;

const tapdWith = (burnAsset: (req: any, cbk: Function) => void) => {
  return {default: {burnAsset}} as unknown as AuthenticatedTapd;
};

const failWith = (details: string) =>
  tapdWith((_, cbk) => cbk({code: 2, details}));

const tapd = tapdWith((_, cbk) => cbk(null, responses.burnAsset));

const args = {amount: '5', asset_id: assetId, is_burn_confirmed: true, tapd};

const tests = [
  {
    args: {...args, amount: '0'},
    description: 'A positive amount is expected',
    error: [400, 'ExpectedPositiveAmountToBurnAsset'],
  },
  {
    args: {...args, asset_id: undefined},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToBurnAsset'],
  },
  {
    args: {...args, group_key: groupKey},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'ExpectedAssetIdOrGroupKeyNotBothToBurnAsset'],
  },
  {
    args: {...args, asset_id: 'asset'},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToBurnAsset'],
  },
  {
    args: {...args, asset_id: undefined, group_key: 'key'},
    description: 'A hex group key is expected',
    error: [400, 'ExpectedGroupKeyHexToBurnAsset'],
  },
  {
    args: {...args, is_burn_confirmed: false},
    description: 'A confirmation is expected',
    error: [400, 'ExpectedConfirmationToBurnAsset'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToBurnAsset'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToBurnAsset'],
  },
  {
    args: {...args, tapd: failWith('permission denied')},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToBurnAsset'],
  },
  {
    args: {
      ...args,
      tapd: failWith(
        'error funding burn: failed to find coin(s) that satisfy given constraints',
      ),
    },
    description: 'Insufficient assets are returned',
    error: [400, 'InsufficientAssetsToBurnAsset'],
  },
  {
    args: {
      ...args,
      asset_id: undefined,
      group_key: groupKey,
      tapd: failWith('asset ID must be specified'),
    },
    description: 'An old tapd cannot burn by group key',
    error: [501, 'ExpectedNewerTapdToBurnAssetByGroupKey'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorBurningAsset', {err: 'err'}],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToBurnAssetRequest'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'Burn proofs are expected',
    error: [503, 'ExpectedArrayOfBurnProofsInBurnResponse'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk(null, {burn_proofs: [{asset: null}]})),
    },
    description: 'Burn proof assets are expected',
    error: [503, 'ExpectedRpcAssetDetails'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(burnAsset(args), error, 'Got expected error');
  });
});

test('A real burn returns the burned asset and the transfer', async () => {
  const {assets, transfer} = await burnAsset(args);

  equal(assets.length, 1);
  equal(assets[0]?.amount, '5');
  equal(assets[0]?.asset_id, assetId);
  equal(assets[0]?.is_burn, true);
  equal(transfer.outputs.length, 2);
});

test('The burn proofs list is used when tapd sends it', async () => {
  const {burn_proof} = responses.burnAsset;

  const tapd = tapdWith((_, cbk) => {
    return cbk(null, {
      ...responses.burnAsset,
      burn_proof: null,
      burn_proofs: [burn_proof],
    });
  });

  const {assets} = await burnAsset({...args, tapd});

  equal(assets.length, 1);
});

test('The request has the asset, the amount, and the confirmation', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, responses.burnAsset);
  });

  await burnAsset({...args, note: 'note', tapd});
  await burnAsset({...args, asset_id: undefined, group_key: groupKey, tapd});

  deepStrictEqual(requests, [
    {
      amount_to_burn: '5',
      asset_id: Buffer.from(assetId, 'hex'),
      asset_specifier: {asset_id: Buffer.from(assetId, 'hex')},
      confirmation_text: 'assets will be destroyed',
      note: 'note',
    },
    {
      amount_to_burn: '5',
      asset_id: undefined,
      asset_specifier: {group_key: Buffer.from(groupKey, 'hex')},
      confirmation_text: 'assets will be destroyed',
      note: '',
    },
  ]);
});
