import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcInvoiceAsInvoice} from 'lightning/lnd_responses/index.js';

import {rpcAssetInvoiceAsInvoice} from '../../src/tapd_responses/index.js';
import {rpcAssetInvoice} from '../fixtures/tapd_channel_responses.js';

const id = '47dc192123551b37f18beccf1793a7dbe13451ae6783c2779757132f44a5cbe3';

test('Details are expected', () => {
  throws(
    () => rpcAssetInvoiceAsInvoice(null),
    /ExpectedRpcAssetInvoiceDetails/,
  );
});

test('Asset amounts are expected', () => {
  throws(
    () => rpcAssetInvoiceAsInvoice({...rpcAssetInvoice, asset_amounts: null}),
    /ExpectedAssetAmountsInRpcAssetInvoice/,
  );
});

test('An lnd invoice is expected', () => {
  throws(
    () => rpcAssetInvoiceAsInvoice({...rpcAssetInvoice, invoice: null}),
    /ExpectedInvoiceInRpcAssetInvoice/,
  );
});

test('A bad lnd invoice is returned as an error', () => {
  throws(
    () => rpcAssetInvoiceAsInvoice({...rpcAssetInvoice, invoice: {}}),
    /ExpectedInvoiceCreationDateInResponse/,
  );
});

test('A real lnd invoice is mapped in the lightning shape with assets', () => {
  const invoice = rpcAssetInvoiceAsInvoice(rpcAssetInvoice);

  deepStrictEqual(invoice, {
    ...rpcInvoiceAsInvoice(rpcAssetInvoice.invoice),
    assets: [{amount: '25', asset_id: '01'.repeat(32), group_key: undefined}],
  });

  equal(invoice.description, 'smoke', 'Got the real description');
  equal(invoice.id, id, 'Got the real payment hash');
  equal(invoice.is_confirmed, false, 'Got the real state');
  equal(invoice.tokens, 5000, 'Got the real value');
});
