import type {GetInvoicesResult} from 'lightning';
import {rpcInvoiceAsInvoice} from 'lightning/lnd_responses/index.js';

import rpcAssetAmountAsAmount from './rpc_asset_amount_as_amount.js';
import type {AssetAmount} from './rpc_asset_amount_as_amount.js';
import type {RpcAssetAmount} from './rpc_asset_amount_as_amount.js';

const {isArray} = Array;

export type RpcAssetInvoice = {
  asset_amounts: RpcAssetAmount[];
  invoice: unknown;
};

export type AssetInvoice = GetInvoicesResult['invoices'][number] & {
  assets: AssetAmount[];
};

/** Asset invoice from an RPC asset invoice

  The lnd invoice maps with rpcInvoiceAsInvoice from lightning

  {
    asset_amounts: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Buffer Object>
      group_key: <Asset Group Key Buffer Object>
    }]
    invoice: <RPC lnd Invoice Object>
  }

  @throws
  <Error>

  @returns
  {
    assets: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
    }]
    ...<lightning Invoice Object>
  }
*/
export default (assetInvoice?: RpcAssetInvoice | null): AssetInvoice => {
  if (!assetInvoice) {
    throw new Error('ExpectedRpcAssetInvoiceDetails');
  }

  if (!isArray(assetInvoice.asset_amounts)) {
    throw new Error('ExpectedAssetAmountsInRpcAssetInvoice');
  }

  if (!assetInvoice.invoice) {
    throw new Error('ExpectedInvoiceInRpcAssetInvoice');
  }

  return {
    ...rpcInvoiceAsInvoice(assetInvoice.invoice),
    assets: assetInvoice.asset_amounts.map(rpcAssetAmountAsAmount),
  };
};
