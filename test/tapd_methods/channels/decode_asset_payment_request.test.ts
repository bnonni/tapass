import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {decodeAssetPaymentRequest} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';
import {rpcAssetPayReqAsRequest} from '../../../src/tapd_responses/index.js';
import {responses} from '../../fixtures/tapd_channel_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const request = responses.lndInvoice.payment_request;

const tapdWith = (decodeAssetPayReq: (req: any, cbk: Function) => void) => {
  return {tapchannel: {decodeAssetPayReq}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, responses.decodeAssetPayReq));

const failWith = (details: string) => tapdWith((_, cbk) => cbk({details}));

const args = {asset_id: assetId, request, tapd};

const tests = [
  {
    args: {...args, asset_id: undefined},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToDecodeAssetRequest'],
  },
  {
    args: {...args, group_key: `02${'aa'.repeat(32)}`},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'UnexpectedAssetIdAndGroupKeyToDecodeRequest'],
  },
  {
    args: {...args, asset_id: 'id'},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToDecodeAssetRequest'],
  },
  {
    args: {...args, asset_id: undefined, group_key: '02'},
    description: 'A group key is expected',
    error: [400, 'ExpectedGroupKeyHexToDecodeAssetRequest'],
  },
  {
    args: {...args, price_oracle_metadata: 'x'.repeat(32769)},
    description: 'Price oracle metadata has a maximum size',
    error: [400, 'ExpectedShorterOracleMetadataToDecodeRequest'],
  },
  {
    args: {...args, request: ''},
    description: 'A payment request is expected',
    error: [400, 'ExpectedPaymentRequestToDecodeAssetRequest'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToDecodeAssetRequest'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'x'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToDecodeAssetRequest'],
  },
  {
    args: {...args, tapd: failWith('permission denied')},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToDecodeAssetPaymentRequest'],
  },
  {
    args: {...args, tapd: failWith('price oracle is not set')},
    description: 'A missing price oracle is returned',
    error: [503, 'PriceOracleIsNotSet'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorDecodingAssetPaymentRequest', {err: 'err'}],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk(null, {}))},
    description: 'A valid response is expected',
    error: [503, 'ExpectedAssetAmountInRpcAssetPayReq'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(decodeAssetPaymentRequest(args), error, 'Got expected error');

    return;
  });
});

test('A payment request is decoded with the asset amount', async () => {
  deepStrictEqual(
    await decodeAssetPaymentRequest(args),
    rpcAssetPayReqAsRequest(responses.decodeAssetPayReq),
  );
});

test('A 32 byte group key is accepted', async () => {
  let sent: any;

  await decodeAssetPaymentRequest({
    group_key: 'aa'.repeat(32),
    request,
    tapd: tapdWith((req, cbk) => {
      sent = req;

      return cbk(null, responses.decodeAssetPayReq);
    }),
  });

  deepStrictEqual(sent, {
    asset_id: Buffer.alloc(0),
    group_key: Buffer.alloc(32, 0xaa),
    pay_req_string: request,
    price_oracle_metadata: '',
  });
});
