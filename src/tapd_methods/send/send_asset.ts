import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {feeRateAsTokensPerKw} from '../../tapd_requests/index.js';
import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {rpcTransferAsTransfer} from '../../tapd_responses/index.js';
import type {Transfer} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const addressParseError = 'error parsing addresses';
const feeRateErrors = [
  'manual fee rate below floor',
  'does not meet minrelayfee',
];
const insufficientError =
  'failed to find coin(s) that satisfy given constraints';
const {isArray} = Array;
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const method = 'sendAsset';
const type = 'default';

export type SendAssetArgs = AuthenticatedTapdArgs<{
  addresses: {
    /** Taproot Assets Address String */
    address: string;
    /** Asset Units To Send Numeric String */
    amount?: string;
  }[];
  /** Chain Fee Tokens Per Virtual Byte Number */
  fee_tokens_per_vbyte?: number;
  /** Skip the Proof Courier Ping Check Bool */
  is_courier_ping_skipped?: boolean;
  /** Transfer Label String */
  label?: string;
}>;

export type SendAssetResult = Transfer;

type Tasks = {
  send: SendAssetResult;
  validate: undefined;
};

/** Send assets to Taproot Assets addresses

  Requires `assets:write` permission

  All addresses must be for the same asset id or asset group

  An `amount` is only for an address without an amount, for example a V2
  address. An address without an amount needs an `amount`. An `amount` needs
  tapd v0.7.0 or later.

  A fee rate below 253 tokens per thousand weight units (about 1.012 tokens
  per virtual byte) is raised to 253, because tapd rejects a lower rate

  {
    addresses: [{
      address: <Taproot Assets Address String>
      [amount]: <Asset Units To Send Numeric String>
    }]
    [fee_tokens_per_vbyte]: <Chain Fee Tokens Per Virtual Byte Number>
    [is_courier_ping_skipped]: <Skip the Proof Courier Ping Check Bool>
    [label]: <Transfer Label String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    [block_hash]: <Anchor Block Hash Hex String>
    [block_height]: <Anchor Block Height Number>
    created_at: <Transfer Created At ISO 8601 Date String>
    fee: <Anchor Transaction Chain Fee Tokens Number>
    height_hint: <Anchor Transaction Confirmation Height Hint Number>
    inputs: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
      [group_key]: <Asset Group Key Hex String>
      is_collectible: <Asset Is Collectible Bool>
      script_key: <Script Key Hex String>
      transaction_id: <Spent Anchor Transaction Id Hex String>
      transaction_vout: <Spent Anchor Transaction Output Index Number>
    }]
    [label]: <Transfer Label String>
    outputs: [{
      [address]: <Taproot Assets Address Of the Recipient String>
      amount: <Asset Units Numeric String>
      anchor: {
        internal_key: <Anchor Internal Key Hex String>
        merkle_root: <Anchor Taproot Merkle Root Hex String>
        output_script: <Output Script Hex String>
        passive_assets_count: <Count Of Passive Assets In the Anchor Number>
        taproot_asset_root: <Taproot Asset Root Commitment Hex String>
        [tapscript_sibling]: <Tapscript Sibling Preimage Hex String>
        tokens: <Anchor Output Tokens Number>
        transaction_id: <Anchor Transaction Id Hex String>
        transaction_vout: <Anchor Transaction Output Index Number>
      }
      [asset_id]: <Asset Id Hex String>
      asset_version: <Asset Version Number>
      [group_key]: <Asset Group Key Hex String>
      is_collectible: <Asset Is Collectible Bool>
      is_local: <Script Key Belongs To This Node Bool>
      is_split_root: <Output Is the Split Root Bool>
      [lock_time]: <Lock Time Number>
      [proof]: <Proof File Hex String>
      [proof_courier]: <Proof Courier Address String>
      [proof_delivery]: <Proof Delivery State String> // complete, pending
      [relative_lock_time]: <Relative Lock Time Number>
      script_key: <Script Key Hex String>
      [split_root_hash]: <Split Commitment Root Hash Hex String>
    }]
    [transaction]: <Raw Anchor Transaction Hex String>
    transaction_id: <Anchor Transaction Id Hex String>
  }
*/
const sendAsset: TapdMethod<SendAssetArgs, SendAssetResult> = (
  args: SendAssetArgs,
  cbk?: TapdCallback<SendAssetResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isArray(args.addresses) || !args.addresses.length) {
            return cbk([400, 'ExpectedAddressesToSendAsset']);
          }

          if (args.addresses.some(n => !n?.address)) {
            return cbk([400, 'ExpectedAddressForEachSendAssetRecipient']);
          }

          const amounts = args.addresses.map(n => n.amount);

          if (amounts.some(n => n !== undefined && !isNumeric(n))) {
            return cbk([400, 'ExpectedNumericAmountToSendAsset']);
          }

          const feeRate = args.fee_tokens_per_vbyte;

          if (feeRate !== undefined && !(feeRate > 0)) {
            return cbk([400, 'ExpectedPositiveFeeRateToSendAsset']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToSendAsset']);
          }

          return cbk();
        },

        // Send the assets
        send: [
          'validate',
          ({}, cbk) => {
            const hasAmounts = args.addresses.some(n => !!n.amount);

            // Older tapd versions only know the addresses without amounts
            const request = {
              addresses_with_amounts: !hasAmounts
                ? []
                : args.addresses.map(n => ({
                    amount: n.amount || '0',
                    tap_addr: n.address,
                  })),
              fee_rate: feeRateAsTokensPerKw(args.fee_tokens_per_vbyte),
              label: args.label || '',
              skip_proof_courier_ping_check: !!args.is_courier_ping_skipped,
              tap_addrs: hasAmounts ? [] : args.addresses.map(n => n.address),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToSendAsset']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToSendAsset']);
              }

              const details = String(err?.details);

              if (!!err && details.includes(addressParseError)) {
                return cbk([400, 'ExpectedValidAddressesToSendAsset', {err}]);
              }

              if (!!err && feeRateErrors.some(n => details.includes(n))) {
                return cbk([400, 'ExpectedHigherFeeRateToSendAsset', {err}]);
              }

              if (!!err && details.includes(insufficientError)) {
                return cbk([400, 'InsufficientAssetsToSendAsset']);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorSendingAsset', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToSendAssetRequest']);
              }

              try {
                return cbk(null, rpcTransferAsTransfer(res.transfer));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'send'}, cbk),
    );
  });
};

export default sendAsset;
