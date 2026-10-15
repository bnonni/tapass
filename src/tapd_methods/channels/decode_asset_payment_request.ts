import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {assetChannelRpcError} from '../../tapd_responses/index.js';
import {rpcAssetPayReqAsRequest} from '../../tapd_responses/index.js';
import type {AssetPaymentRequest} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {from} = Buffer;
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
// tapd reads a 32 byte or a 33 byte group key here
const isGroupKey = (n: string) => /^(0[23])?[0-9A-F]{64}$/i.test(n);
const maxMetadataBytes = 32768;
const method = 'decodeAssetPayReq';
const type = 'tapchannel';

export type DecodeAssetPaymentRequestArgs = AuthenticatedTapdArgs<{
  /** Asset Id Hex String */
  asset_id?: string;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Price Oracle Metadata String */
  price_oracle_metadata?: string;
  /** BOLT 11 Payment Request String */
  request: string;
}>;

export type DecodeAssetPaymentRequestResult = AssetPaymentRequest;

type Tasks = {
  decode: DecodeAssetPaymentRequestResult;
  validate: undefined;
};

/** Decode a payment request and get its amount in units of an asset

  tapd asks its price oracle for the asset rate

  Requires `channels:read` permission

  An `asset_id` or a `group_key` is required, but not both

  {
    [asset_id]: <Asset Id Hex String>
    [group_key]: <Asset Group Key Hex String>
    [price_oracle_metadata]: <Price Oracle Metadata String>
    request: <BOLT 11 Payment Request String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
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
    chain_address: <Fallback Chain Address String>
    [cltv_delta]: <Final CLTV Delta Number>
    created_at: <Payment Request Created At ISO 8601 Date String>
    description: <Payment Description String>
    description_hash: <Payment Longer Description Hash Hex String>
    destination: <Public Key Hex String>
    expires_at: <ISO 8601 Date String>
    features: [{
      bit: <BOLT 09 Feature Bit Number>
      is_known: <Feature is Known Bool>
      is_required: <Feature Support is Required To Pay Bool>
      type: <Feature Type String>
    }]
    id: <Payment Hash Hex String>
    is_expired: <Invoice is Expired Bool>
    mtokens: <Requested Millitokens String>
    [payment]: <Payment Identifier Hex Encoded String>
    routes: [[{
      [base_fee_mtokens]: <Base Routing Fee In Millitokens String>
      [channel]: <Standard Format Channel Id String>
      [cltv_delta]: <CLTV Blocks Delta Number>
      [fee_rate]: <Fee Rate In Millitokens Per Million Number>
      public_key: <Forward Edge Public Key Hex String>
    }]]
    safe_tokens: <Requested Tokens Rounded Up Number>
    tokens: <Requested Tokens Rounded Down Number>
  }
*/
const decodeAssetPaymentRequest: TapdMethod<
  DecodeAssetPaymentRequestArgs,
  DecodeAssetPaymentRequestResult
> = (
  args: DecodeAssetPaymentRequestArgs,
  cbk?: TapdCallback<DecodeAssetPaymentRequestResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!args.asset_id && !args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyToDecodeAssetRequest']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'UnexpectedAssetIdAndGroupKeyToDecodeRequest']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToDecodeAssetRequest']);
          }

          if (!!args.group_key && !isGroupKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToDecodeAssetRequest']);
          }

          const metadata = args.price_oracle_metadata || '';

          if (Buffer.byteLength(metadata) > maxMetadataBytes) {
            return cbk([400, 'ExpectedShorterOracleMetadataToDecodeRequest']);
          }

          if (!args.request || typeof args.request !== 'string') {
            return cbk([400, 'ExpectedPaymentRequestToDecodeAssetRequest']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToDecodeAssetRequest']);
          }

          return cbk();
        },

        // Decode the payment request
        decode: [
          'validate',
          ({}, cbk) => {
            const request = {
              asset_id: from(args.asset_id || '', 'hex'),
              group_key: from(args.group_key || '', 'hex'),
              pay_req_string: args.request,
              price_oracle_metadata: args.price_oracle_metadata || '',
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToDecodeAssetRequest']);
              }

              if (isPermissionDenied({err})) {
                return cbk([
                  403,
                  'PermissionDeniedToDecodeAssetPaymentRequest',
                ]);
              }

              const knownError = assetChannelRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorDecodingAssetPaymentRequest',
                  {err},
                ]);
              }

              try {
                return cbk(null, rpcAssetPayReqAsRequest(res));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'decode'}, cbk),
    );
  });
};

export default decodeAssetPaymentRequest;
