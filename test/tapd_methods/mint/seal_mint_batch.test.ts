import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {sealMintBatch} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcBatchAsBatch} from '../../../src/tapd_responses/index.js';
import {mintResponses} from '../../fixtures/tapd_mint_responses.js';

const assetId = '22'.repeat(32);
const res = mintResponses.sealBatch;

const tapdWith = (sealBatch: (req: any, cbk: Function) => void) => {
  return {mint: {sealBatch}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, res));

const tests = [
  {
    args: {
      group_witnesses: [{asset_id: assetId, witness: ['00']}],
      signed_group_psbts: ['00'],
      tapd,
    },
    description: 'Witnesses and PSBTs are not expected together',
    error: [400, 'ExpectedGroupWitnessesOrSignedPsbtsNotBoth'],
  },
  {
    args: {group_witnesses: {} as any, tapd},
    description: 'An array of witnesses is expected',
    error: [400, 'ExpectedArrayOfGroupWitnessesToSealMintBatch'],
  },
  {
    args: {group_witnesses: [{asset_id: '00', witness: []}], tapd},
    description: 'An asset id is expected for each witness',
    error: [400, 'ExpectedAssetIdForGroupWitnessToSealMintBatch'],
  },
  {
    args: {group_witnesses: [{asset_id: assetId, witness: ['x']}], tapd},
    description: 'A hex witness stack is expected',
    error: [400, 'ExpectedHexWitnessStackToSealMintBatch'],
  },
  {
    args: {signed_group_psbts: ['psbt'], tapd},
    description: 'Hex PSBTs are expected',
    error: [400, 'ExpectedHexSignedGroupPsbtsToSealMintBatch'],
  },
  {
    args: {tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToSealMintBatch'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToSealMintBatch'],
  },
  {
    args: {
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToSealMintBatch'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({details: 'no pending batch'}))},
    description: 'A missing pending batch is returned as not found',
    error: [404, 'PendingMintBatchNotFound'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk({details: 'batch is not funded'}))},
    description: 'An unfunded batch is returned',
    error: [400, 'ExpectedFundedMintBatch'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorSealingMintBatch', {err: 'err'}],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk())},
    description: 'A response is expected',
    error: [503, 'ExpectedResponseToSealMintBatch'],
  },
  {
    args: {tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A batch is expected',
    error: [503, 'ExpectedRpcMintingBatch'],
  },
  {
    args: {tapd},
    description: 'The sealed batch is returned',
    expected: rpcBatchAsBatch({batch: res.batch}),
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(sealMintBatch(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await sealMintBatch(args), expected, 'Got batch');
    }

    return;
  });
});

test('A real sealed batch has the group key', async () => {
  const {assets} = await sealMintBatch({tapd});

  deepStrictEqual(assets[0].group_key?.length, 66);
});

test('The request has the witnesses and the PSBTs', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, res);
  });

  await sealMintBatch({tapd});
  await sealMintBatch({
    group_witnesses: [{asset_id: assetId, witness: ['0102', '03']}],
    tapd,
  });
  await sealMintBatch({signed_group_psbts: ['70736274ff'], tapd});

  deepStrictEqual(requests, [
    {
      group_witnesses: [],
      short_response: false,
      signed_group_virtual_psbts: [],
    },
    {
      group_witnesses: [
        {
          genesis_id: Buffer.from(assetId, 'hex'),
          witness: [Buffer.from('0102', 'hex'), Buffer.from('03', 'hex')],
        },
      ],
      short_response: false,
      signed_group_virtual_psbts: [],
    },
    {
      group_witnesses: [],
      short_response: false,
      signed_group_virtual_psbts: [
        Buffer.from('70736274ff', 'hex').toString('base64'),
      ],
    },
  ]);
});
