import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAssetPaymentAsPayment} from '../../src/tapd_responses/index.js';
import {makeRpcAssetPayment} from '../fixtures/tapd_channel_responses.js';
import {payment} from '../fixtures/tapd_channel_responses.js';

const rpcPayment = makeRpcAssetPayment({status: 'SUCCEEDED'});

test('Details are expected', () => {
  throws(
    () => rpcAssetPaymentAsPayment(null),
    /ExpectedRpcAssetPaymentDetails/,
  );
});

test('Asset amounts are expected', () => {
  throws(
    () => rpcAssetPaymentAsPayment({...rpcPayment, asset_amounts: null}),
    /ExpectedAssetAmountsInRpcAssetPayment/,
  );
});

test('An lnd payment is expected', () => {
  throws(
    () => rpcAssetPaymentAsPayment({...rpcPayment, payment: null}),
    /ExpectedPaymentInRpcAssetPayment/,
  );
});

test('A bad lnd payment is returned as an error', () => {
  throws(
    () => rpcAssetPaymentAsPayment({...rpcPayment, payment: {}}),
    /ExpectedCreationDateInRpcPaymentDetails/,
  );
});

test('An lnd payment is mapped in the lightning shape with assets', () => {
  const mapped = rpcAssetPaymentAsPayment(rpcPayment);

  deepStrictEqual(mapped.assets, [
    {amount: '25', asset_id: '01'.repeat(32), group_key: undefined},
  ]);

  equal(mapped.destination, payment.destination, 'Got destination');
  equal(mapped.fee_mtokens, '1000', 'Got fee');
  equal(mapped.id, payment.id, 'Got payment hash');
  equal(mapped.is_confirmed, true, 'Got confirmed payment');
  equal(mapped.secret, payment.secret, 'Got preimage');
  equal(mapped.tokens, 5000, 'Got tokens');
});
