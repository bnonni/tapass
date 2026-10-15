import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAssetMetaAsMetadata} from '../../src/tapd_responses/index.js';
import {assetResponses} from '../fixtures/tapd_asset_responses.js';

const meta = assetResponses.fetchAssetMeta;

test('Real tapd metadata is mapped', () => {
  deepStrictEqual(rpcAssetMetaAsMetadata(meta), {
    canonical_universes: [],
    data: '',
    decimal_display: undefined,
    delegation_key: undefined,
    hash: 'f19bbf25df2e3f02ef33bd8edfdea2a176f38f608065f920aeef077644a268bd',
    is_publishing_supply_commitments: false,
    type: 'opaque',
    unknown_types: [],
  });
});

test('All metadata details are mapped', () => {
  const key = Buffer.alloc(33, 2);

  deepStrictEqual(
    rpcAssetMetaAsMetadata({
      ...meta,
      canonical_universe_urls: ['universerpc://universe.example:10029'],
      data: Buffer.from('{"a":1}'),
      decimal_display: 2,
      delegation_key: key,
      type: 'META_TYPE_JSON',
      universe_commitments: true,
      unknown_odd_types: {'101': Buffer.from('ff', 'hex')},
    }),
    {
      canonical_universes: ['universerpc://universe.example:10029'],
      data: Buffer.from('{"a":1}').toString('hex'),
      decimal_display: 2,
      delegation_key: key.toString('hex'),
      hash: meta.meta_hash.toString('hex'),
      is_publishing_supply_commitments: true,
      type: 'json',
      unknown_types: [{type: '101', value: 'ff'}],
    },
  );
});

const errors = [
  {args: null, error: 'ExpectedRpcAssetMetaDetails'},
  {args: {...meta, data: 'data'}, error: 'ExpectedDataInRpcAssetMeta'},
  {
    args: {...meta, meta_hash: Buffer.alloc(0)},
    error: 'ExpectedMetaHashInRpcAssetMeta',
  },
  {
    args: {...meta, canonical_universe_urls: 'url'},
    error: 'ExpectedArrayOfUniverseUrlsInRpcAssetMeta',
  },
];

errors.forEach(({args, error}) => {
  return test(`Bad metadata is ${error}`, () => {
    throws(() => rpcAssetMetaAsMetadata(args), new Error(error));
  });
});
