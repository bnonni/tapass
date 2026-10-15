import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {createAssetAddress} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';

const assetId = Buffer.alloc(32, 1).toString('hex');
const key = (n: number) => Buffer.alloc(33, n);

const response = (overrides?: object) => ({
  address_version: 'ADDR_VERSION_V1',
  amount: '100',
  asset_id: Buffer.alloc(32, 1),
  asset_type: 'NORMAL',
  asset_version: 'ASSET_VERSION_V0',
  encoded: 'taptb1address',
  group_key: Buffer.alloc(0),
  internal_key: key(2),
  proof_courier_addr: 'universerpc://localhost:10029',
  script_key: key(3),
  tapscript_sibling: Buffer.alloc(0),
  taproot_output_key: key(4),
  ...overrides,
});

const tapdWith = (newAddr: (req: any, cbk: Function) => void) => {
  return {default: {newAddr}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, response()));

const tests = [
  {
    args: {amount: '1.5', asset_id: assetId, tapd},
    description: 'A numeric amount is expected',
    error: [400, 'ExpectedNumericAmountToCreateAssetAddress'],
  },
  {
    args: {amount: '100', tapd},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToCreateAssetAddress'],
  },
  {
    args: {asset_id: assetId, group_key: key(2).toString('hex'), tapd},
    description: 'An asset id and a group key together are not expected',
    error: [400, 'UnexpectedAssetIdAndGroupKeyForAssetAddress'],
  },
  {
    args: {asset_id: 'asset', tapd},
    description: 'An asset id must be 32 bytes of hex',
    error: [400, 'ExpectedAssetIdHexToCreateAssetAddress'],
  },
  {
    args: {group_key: 'key', tapd},
    description: 'A group key must be hex',
    error: [400, 'ExpectedGroupKeyHexToCreateAssetAddress'],
  },
  {
    args: {asset_id: assetId, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToCreateAssetAddress'],
  },
  {
    args: {asset_id: assetId, tapd, version: 3},
    description: 'A known address version is expected',
    error: [400, 'ExpectedKnownVersionToCreateAssetAddress'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToCreateAssetAddress'],
  },
  {
    args: {asset_id: assetId, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCreatingAssetAddress', {err: 'err'}],
  },
  {
    args: {asset_id: assetId, tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseForAssetAddressCreation'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith((_, cbk) => cbk(null, response({encoded: ''}))),
    },
    description: 'An encoded address is expected',
    error: [503, 'ExpectedEncodedAddressInAddressResponse'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith((_, cbk) => cbk(null, response({script_key: null}))),
    },
    description: 'Keys are expected',
    error: [503, 'ExpectedKeysInAssetAddressResponse'],
  },
  {
    args: {
      asset_id: assetId,
      tapd: tapdWith((_, cbk) => cbk(null, response({address_version: 'X'}))),
    },
    description: 'A known address version is expected in the response',
    error: [503, 'ExpectedKnownVersionInAddressResponse'],
  },
  {
    args: {amount: '100', asset_id: assetId, tapd},
    description: 'An asset address is created',
    expected: {
      address: 'taptb1address',
      amount: '100',
      asset_id: assetId,
      asset_version: 0,
      group_key: undefined,
      internal_key: key(2).toString('hex'),
      is_collectible: false,
      proof_courier: 'universerpc://localhost:10029',
      script_key: key(3).toString('hex'),
      tapscript_sibling: undefined,
      taproot_output_key: key(4).toString('hex'),
      version: 1,
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(createAssetAddress(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await createAssetAddress(args), expected, 'Got address');
    }

    return;
  });
});

test('The request maps the arguments to tapd fields', async () => {
  let request: any;

  await createAssetAddress({
    amount: '5',
    group_key: key(2).toString('hex'),
    proof_courier: 'authmailbox+universerpc://localhost:10029',
    tapd: tapdWith((req, cbk) => {
      request = req;

      return cbk(null, response());
    }),
    version: 2,
  });

  deepStrictEqual(request, {
    address_version: 'ADDR_VERSION_V2',
    amt: '5',
    asset_id: Buffer.alloc(0),
    group_key: key(2),
    proof_courier_addr: 'authmailbox+universerpc://localhost:10029',
  });
});

test('A callback gets the result', async () => {
  const res = await new Promise((resolve, reject) => {
    return createAssetAddress({asset_id: assetId, tapd}, (err, res) => {
      return !!err ? reject(err) : resolve(res?.address);
    });
  });

  deepStrictEqual(res, 'taptb1address', 'Got address');
});
