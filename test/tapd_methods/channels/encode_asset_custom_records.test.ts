import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {encodeAssetCustomRecords} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {overTheWireResponse} from '../../fixtures/tapd_channel_responses.js';

const assetId = '01'.repeat(32);

const tapdWith = (encodeCustomRecords: (req: any, cbk: Function) => void) => {
  return {tapchannel: {encodeCustomRecords}} as unknown as AuthenticatedTapd;
};

// The real record types of tapd: 65536 asset amounts, 65538 RFQ id
const response = overTheWireResponse('EncodeCustomRecords', {
  custom_records: {
    '65538': Buffer.alloc(32, 3),
    '65536': Buffer.from('012c', 'hex'),
  },
});

const tapd = tapdWith((_, cbk) => cbk(null, response));

const tests = [
  {
    args: {assets: 'assets' as any, tapd},
    description: 'An array of assets is expected',
    error: [400, 'ExpectedArrayOfAssetsToEncodeCustomRecords'],
  },
  {
    args: {tapd},
    description: 'Assets or an RFQ id are expected',
    error: [400, 'ExpectedAssetsOrRfqIdToEncodeCustomRecords'],
  },
  {
    args: {assets: [{amount: '1', asset_id: 'id'}], tapd},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToEncodeCustomRecords'],
  },
  {
    args: {assets: [{amount: '0', asset_id: assetId}], tapd},
    description: 'A positive amount is expected',
    error: [400, 'ExpectedAssetAmountToEncodeCustomRecords'],
  },
  {
    args: {
      assets: [
        {amount: '1', asset_id: assetId},
        {amount: '2', asset_id: assetId.toUpperCase()},
      ],
      tapd,
    },
    description: 'Unique assets are expected',
    error: [400, 'ExpectedUniqueAssetsToEncodeCustomRecords'],
  },
  {
    args: {rfq_id: 'id', tapd},
    description: 'A hex RFQ id is expected',
    error: [400, 'ExpectedRfqIdHexToEncodeCustomRecords'],
  },
  {
    args: {rfq_id: '03'.repeat(32), tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToEncodeRecords'],
  },
  {
    args: {
      rfq_id: '03'.repeat(32),
      tapd: tapdWith((_, cbk) => cbk({code: 14})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToEncodeRecords'],
  },
  {
    args: {
      rfq_id: '03'.repeat(32),
      tapd: tapdWith((_, cbk) => cbk({details: 'permission denied'})),
    },
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToEncodeAssetCustomRecords'],
  },
  {
    args: {rfq_id: '03'.repeat(32), tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorEncodingAssetCustomRecords', {err: 'err'}],
  },
  {
    args: {rfq_id: '03'.repeat(32), tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'Custom records are expected',
    error: [503, 'ExpectedCustomRecordsInEncodeResponse'],
  },
  {
    args: {
      rfq_id: '03'.repeat(32),
      tapd: tapdWith((_, cbk) => cbk(null, {custom_records: {'1': 'x'}})),
    },
    description: 'Record values are expected',
    error: [503, 'ExpectedRecordValuesInEncodeResponse'],
  },
  {
    args: {
      rfq_id: '03'.repeat(32),
      tapd: tapdWith((_, cbk) =>
        cbk(null, {custom_records: {abc: Buffer.alloc(1)}}),
      ),
    },
    description: 'Valid record types are expected',
    error: [503, 'ExpectedLongBitsHashMapKey'],
  },
  {
    args: {assets: [{amount: '300', asset_id: assetId}], tapd},
    description: 'Records are encoded, sorted by type',
    expected: {
      records: [
        {type: '65536', value: '012c'},
        {type: '65538', value: '03'.repeat(32)},
      ],
    },
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(encodeAssetCustomRecords(args), error, 'Got error');
    } else {
      deepStrictEqual(await encodeAssetCustomRecords(args), expected);
    }

    return;
  });
});
