import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {registerAssetTransfer} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {responses} from '../../fixtures/tapd_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const [asset] = responses.listAssets.assets;
const scriptKey = `02${'11'.repeat(32)}`;
const txId = `01${'00'.repeat(31)}`;

const tapdWith = (registerTransfer: (req: any, cbk: Function) => void) => {
  return {default: {registerTransfer}} as unknown as AuthenticatedTapd;
};

const failWith = (details: string) =>
  tapdWith((_, cbk) => cbk({code: 2, details}));

const tapd = tapdWith((_, cbk) => cbk(null, {registered_asset: asset}));

const args = {
  asset_id: assetId,
  script_key: scriptKey,
  tapd,
  transaction_id: txId,
  transaction_vout: 1,
};

const tests = [
  {
    args: {...args, asset_id: 'asset'},
    description: 'An asset id is expected',
    error: [400, 'ExpectedAssetIdToRegisterAssetTransfer'],
  },
  {
    args: {...args, group_key: 'key'},
    description: 'A hex group key is expected',
    error: [400, 'ExpectedGroupKeyHexToRegisterAssetTransfer'],
  },
  {
    args: {...args, script_key: ''},
    description: 'A script key is expected',
    error: [400, 'ExpectedScriptKeyToRegisterAssetTransfer'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToRegisterAssetTransfer'],
  },
  {
    args: {...args, transaction_id: 'tx'},
    description: 'A transaction id is expected',
    error: [400, 'ExpectedTransactionIdToRegisterAssetTransfer'],
  },
  {
    args: {...args, transaction_vout: -1},
    description: 'An output index is expected',
    error: [400, 'ExpectedOutputIndexToRegisterAssetTransfer'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToRegisterAssetTransfer'],
  },
  {
    args: {...args, tapd: failWith('permission denied')},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToRegisterAssetTransfer'],
  },
  {
    args: {
      ...args,
      tapd: failWith('error parsing script key: invalid public key'),
    },
    description: 'A script key that is not a valid key is returned',
    error: [400, 'ExpectedValidKeysToRegisterAssetTransfer'],
  },
  {
    args: {
      ...args,
      tapd: failWith(
        'error fetching script key, consider declaring it: script key not found',
      ),
    },
    description: 'An unknown script key is returned',
    error: [404, 'ScriptKeyNotFoundToRegisterAssetTransfer'],
  },
  {
    args: {...args, tapd: failWith('proof already exists for this transfer')},
    description: 'A registered transfer is returned',
    error: [409, 'AssetTransferIsAlreadyRegistered'],
  },
  {
    args: {
      ...args,
      tapd: failWith(
        'error fetching full proof: fetching single proof failed: unable to find proof',
      ),
    },
    description: 'A missing proof is returned',
    error: [404, 'ProofNotFoundToRegisterAssetTransfer'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorRegisteringAssetTransfer', {err: 'err'}],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToRegisterAssetTransfer'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A registered asset is expected',
    error: [503, 'ExpectedRpcAssetDetails'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(registerAssetTransfer(args), error, 'Got expected error');
  });
});

test('A registered asset is returned', async () => {
  const registered = await registerAssetTransfer(args);

  equal(registered.asset_id, assetId);
  equal(registered.amount, '1000000');
});

test('The request has the outpoint transaction id in internal byte order', async () => {
  let request: any;

  await registerAssetTransfer({
    ...args,
    group_key: scriptKey,
    tapd: tapdWith((req, cbk) => {
      request = req;

      return cbk(null, {registered_asset: asset});
    }),
  });

  deepStrictEqual(request, {
    asset_id: Buffer.from(assetId, 'hex'),
    group_key: Buffer.from(scriptKey, 'hex'),
    outpoint: {output_index: 1, txid: Buffer.from(txId, 'hex').reverse()},
    script_key: Buffer.from(scriptKey, 'hex'),
  });
});
