import {paymentRequestDetails} from 'lightning/lnd_responses/index.js';

import type {PaymentRequestDetails} from '../typescript/index.js';

const hexOf = (n?: Buffer | null) =>
  !n?.length ? undefined : n.toString('hex');
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);

export type RpcAssetPayReq = {
  asset_amount: string;
  asset_group: {tweaked_group_key: Buffer} | null;
  decimal_display: {decimal_display: number} | null;
  genesis_info: {
    asset_id: Buffer;
    asset_type: string;
    meta_hash: Buffer;
    name: string;
  } | null;
  pay_req: unknown;
};

export type AssetPaymentRequest = PaymentRequestDetails & {
  asset: {
    /** Asset Units To Pay Numeric String */
    amount: string;
    /** Decimal Places To Show */
    decimal_display?: number;
    /** Asset Group Key Hex */
    group_key?: string;
    /** Asset Id Hex */
    id: string;
    /** Asset Is Collectible */
    is_collectible: boolean;
    /** Asset Metadata Hash Hex */
    meta_hash: string;
    /** Asset Name */
    name: string;
  };
};

/** Asset payment request details from an RPC asset pay req response

  The lnd payment request maps with paymentRequestDetails from lightning

  {
    asset_amount: <Asset Units To Pay Numeric String>
    [asset_group]: {
      tweaked_group_key: <Asset Group Key Buffer Object>
    }
    [decimal_display]: {
      decimal_display: <Decimal Places To Show Number>
    }
    genesis_info: {
      asset_id: <Asset Id Buffer Object>
      asset_type: <Asset Type String>
      meta_hash: <Asset Metadata Hash Buffer Object>
      name: <Asset Name String>
    }
    pay_req: <RPC lnd PayReq Object>
  }

  @throws
  <Error>

  @returns
  {
    asset: {
      amount: <Asset Units To Pay Numeric String>
      [decimal_display]: <Decimal Places To Show Number>
      [group_key]: <Asset Group Key Hex String>
      id: <Asset Id Hex String>
      is_collectible: <Asset Is Collectible Bool>
      meta_hash: <Asset Metadata Hash Hex String>
      name: <Asset Name String>
    }
    ...<lightning Decoded Payment Request Object>
  }
*/
export default (res?: RpcAssetPayReq | null): AssetPaymentRequest => {
  if (!res) {
    throw new Error('ExpectedRpcAssetPayReqDetails');
  }

  if (!isNumeric(res.asset_amount)) {
    throw new Error('ExpectedAssetAmountInRpcAssetPayReq');
  }

  const genesis = res.genesis_info;

  if (!genesis || !isBuffer(genesis.asset_id) || !genesis.asset_id.length) {
    throw new Error('ExpectedGenesisInfoInRpcAssetPayReq');
  }

  if (!isBuffer(genesis.meta_hash)) {
    throw new Error('ExpectedMetaHashInRpcAssetPayReq');
  }

  if (!res.pay_req) {
    throw new Error('ExpectedPayReqInRpcAssetPayReq');
  }

  return {
    ...paymentRequestDetails(res.pay_req),
    asset: {
      amount: res.asset_amount,
      decimal_display: res.decimal_display?.decimal_display || undefined,
      group_key: hexOf(res.asset_group?.tweaked_group_key),
      id: genesis.asset_id.toString('hex'),
      is_collectible: genesis.asset_type === 'COLLECTIBLE',
      meta_hash: genesis.meta_hash.toString('hex'),
      name: genesis.name,
    },
  };
};
