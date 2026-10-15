import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {exportAssetProof} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {proofResponses} from '../../fixtures/tapd_proof_responses.js';
import {responses} from '../../fixtures/tapd_responses.js';

const [asset] = responses.listAssets.assets;
const file = proofResponses.exportProof.raw_proof_file;

const assetId = asset.asset_genesis.asset_id.toString('hex');
const scriptKey = asset.script_key.toString('hex');

const tapdWith = (exportProof: (req: any, cbk: Function) => void) => {
  return {default: {exportProof}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, proofResponses.exportProof));

const args = {asset_id: assetId, script_key: scriptKey, tapd};

const tests = [
  {
    args: {...args, asset_id: 'id'},
    description: 'An asset id is expected',
    error: [400, 'ExpectedAssetIdHexToExportAssetProof'],
  },
  {
    args: {...args, script_key: 'key'},
    description: 'A script key is expected',
    error: [400, 'ExpectedScriptKeyHexToExportAssetProof'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToExportAssetProof'],
  },
  {
    args: {...args, transaction_id: 'ab'.repeat(32)},
    description: 'An output index is expected with a transaction id',
    error: [400, 'ExpectedTransactionIdAndVoutToExportAssetProof'],
  },
  {
    args: {...args, transaction_id: 'id', transaction_vout: 0},
    description: 'A hex transaction id is expected',
    error: [400, 'ExpectedTransactionIdHexToExportAssetProof'],
  },
  {
    args: {...args, transaction_id: 'ab'.repeat(32), transaction_vout: 0.5},
    description: 'An integer output index is expected',
    error: [400, 'ExpectedIntegerOutputIndexToExportAssetProof'],
  },
  {
    args: {...args, transaction_id: 'ab'.repeat(32), transaction_vout: -1},
    description: 'A valid output index is expected',
    error: [400, 'ExpectedValidOutputIndexToExportAssetProof'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'x'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToExportAssetProof'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk({code: 2, details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToExportAssetProof'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk(proofResponses.exportProofMissing.error)),
    },
    description: 'A real tapd missing proof is returned as not found',
    error: [404, 'AssetProofNotFound'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => {
        return cbk({details: 'multiple proofs found with asset ID'});
      }),
    },
    description: 'More than one proof needs an outpoint',
    error: [400, 'ExpectedAnchorOutpointToSelectAssetProof'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorExportingAssetProof', {err: 'err'}],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A proof file is expected',
    error: [503, 'ExpectedProofFileInExportProofResponse'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk(null, {raw_proof_file: Buffer.alloc(0)})),
    },
    description: 'A proof file with data is expected',
    error: [503, 'ExpectedProofFileInExportProofResponse'],
  },
  {
    args,
    description: 'A real tapd proof file is exported',
    expected: {proof: file.toString('hex')},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(exportAssetProof(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await exportAssetProof(args), expected, 'Got proof');
    }

    return;
  });
});

test('The request has the outpoint transaction id in internal order', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, proofResponses.exportProof);
  });

  await exportAssetProof({...args, tapd});

  await exportAssetProof({
    ...args,
    tapd,
    transaction_id: `01${'00'.repeat(31)}`,
    transaction_vout: 2,
  });

  deepStrictEqual(requests, [
    {
      asset_id: Buffer.from(assetId, 'hex'),
      outpoint: undefined,
      script_key: Buffer.from(scriptKey, 'hex'),
    },
    {
      asset_id: Buffer.from(assetId, 'hex'),
      outpoint: {
        output_index: 2,
        txid: Buffer.from(`${'00'.repeat(31)}01`, 'hex'),
      },
      script_key: Buffer.from(scriptKey, 'hex'),
    },
  ]);
});
