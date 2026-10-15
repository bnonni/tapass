import type {GetPaymentsResult} from 'lightning';
import {rpcPaymentAsPayment} from 'lightning/lnd_responses/index.js';

import rpcAssetAmountAsAmount from './rpc_asset_amount_as_amount.js';
import type {AssetAmount} from './rpc_asset_amount_as_amount.js';
import type {RpcAssetAmount} from './rpc_asset_amount_as_amount.js';

const {isArray} = Array;

export type RpcAssetPayment = {
  asset_amounts: RpcAssetAmount[];
  payment: unknown;
};

export type AssetPayment = GetPaymentsResult['payments'][number] & {
  assets: AssetAmount[];
};

/** Asset payment from an RPC asset payment

  The lnd payment maps with rpcPaymentAsPayment from lightning

  {
    asset_amounts: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Buffer Object>
      group_key: <Asset Group Key Buffer Object>
    }]
    payment: <RPC lnd Payment Object>
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
    ...<lightning Payment Object>
  }
*/
export default (assetPayment?: RpcAssetPayment | null): AssetPayment => {
  if (!assetPayment) {
    throw new Error('ExpectedRpcAssetPaymentDetails');
  }

  if (!isArray(assetPayment.asset_amounts)) {
    throw new Error('ExpectedAssetAmountsInRpcAssetPayment');
  }

  if (!assetPayment.payment) {
    throw new Error('ExpectedPaymentInRpcAssetPayment');
  }

  return {
    ...rpcPaymentAsPayment(assetPayment.payment),
    assets: assetPayment.asset_amounts.map(rpcAssetAmountAsAmount),
  };
};
