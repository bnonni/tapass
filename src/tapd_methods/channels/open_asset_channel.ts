import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {assetChannelRpcError} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {from} = Buffer;
const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPositive = (n: string) => isNumeric(n) && BigInt(n) > BigInt(0);
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const {isSafeInteger} = Number;
const isTransactionId = (n: unknown) => /^[0-9a-f]{64}$/i.test(String(n));
const maxFeeRate = 4294967295;
const method = 'fundChannel';
const type = 'tapchannel';

export type OpenAssetChannelArgs = AuthenticatedTapdArgs<{
  /** Asset Units To Fund the Channel With Numeric String */
  amount: string;
  /** Asset Id Hex String */
  asset_id?: string;
  /** Chain Fee Tokens Per Virtual Byte Number */
  chain_fee_tokens_per_vbyte: number;
  /** Tokens To Give To the Peer Number */
  give_tokens?: number;
  /** Asset Group Key Hex String */
  group_key?: string;
  /** Connected Peer Public Key Hex String */
  partner_public_key: string;
}>;

export type OpenAssetChannelResult = {
  /** Funding Transaction Id Hex */
  transaction_id: string;
  /** Funding Transaction Output Index */
  transaction_vout: number;
};

type Tasks = {
  open: OpenAssetChannelResult;
  validate: undefined;
};

/** Open a channel that is funded with an asset

  The peer must be connected. tapd sets the satoshi amount of the channel.

  tapd must run inside litd, with lnd and tapd in integrated mode

  Requires `channels:write` permission

  An `asset_id` or a `group_key` is required, but not both

  `give_tokens` is a gift to the peer, in the same way as with openChannel

  {
    amount: <Asset Units To Fund the Channel With Numeric String>
    [asset_id]: <Asset Id Hex String>
    chain_fee_tokens_per_vbyte: <Chain Fee Tokens Per Virtual Byte Number>
    [give_tokens]: <Tokens To Give To the Peer Number>
    [group_key]: <Asset Group Key Hex String>
    partner_public_key: <Connected Peer Public Key Hex String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    transaction_id: <Funding Transaction Id Hex String>
    transaction_vout: <Funding Transaction Output Index Number>
  }
*/
const openAssetChannel: TapdMethod<
  OpenAssetChannelArgs,
  OpenAssetChannelResult
> = (
  args: OpenAssetChannelArgs,
  cbk?: TapdCallback<OpenAssetChannelResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!isPositive(args.amount)) {
            return cbk([400, 'ExpectedAssetAmountToOpenAssetChannel']);
          }

          if (!args.asset_id && !args.group_key) {
            return cbk([400, 'ExpectedAssetIdOrGroupKeyToOpenAssetChannel']);
          }

          if (!!args.asset_id && !!args.group_key) {
            return cbk([400, 'UnexpectedAssetIdAndGroupKeyForAssetChannel']);
          }

          if (!!args.asset_id && !isAssetId(args.asset_id)) {
            return cbk([400, 'ExpectedAssetIdHexToOpenAssetChannel']);
          }

          const feeRate = args.chain_fee_tokens_per_vbyte;

          if (!isSafeInteger(feeRate) || feeRate < 1 || feeRate > maxFeeRate) {
            return cbk([400, 'ExpectedChainFeeRateToOpenAssetChannel']);
          }

          const give = args.give_tokens;

          if (give !== undefined && (!isSafeInteger(give) || give < 0)) {
            return cbk([400, 'ExpectedGiveTokensToOpenAssetChannel']);
          }

          if (!!args.group_key && !isPublicKey(args.group_key)) {
            return cbk([400, 'ExpectedGroupKeyHexToOpenAssetChannel']);
          }

          if (
            !args.partner_public_key ||
            !isPublicKey(args.partner_public_key)
          ) {
            return cbk([400, 'ExpectedPartnerPublicKeyToOpenAssetChannel']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToOpenAssetChannel']);
          }

          return cbk();
        },

        // Open the channel
        open: [
          'validate',
          ({}, cbk) => {
            const request = {
              asset_amount: args.amount,
              asset_id: from(args.asset_id || '', 'hex'),
              fee_rate_sat_per_vbyte: args.chain_fee_tokens_per_vbyte,
              group_key: from(args.group_key || '', 'hex'),
              peer_pubkey: from(args.partner_public_key, 'hex'),
              push_sat: args.give_tokens || 0,
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToOpenAssetChannel']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToOpenAssetChannel']);
              }

              const knownError = assetChannelRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorOpeningAssetChannel', {err}]);
              }

              if (!res || !isTransactionId(res.txid)) {
                return cbk([
                  503,
                  'ExpectedFundingTransactionIdForAssetChannel',
                ]);
              }

              if (!isSafeInteger(res.output_index) || res.output_index < 0) {
                return cbk([503, 'ExpectedFundingOutputIndexForAssetChannel']);
              }

              return cbk(null, {
                transaction_id: res.txid,
                transaction_vout: res.output_index,
              });
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'open'}, cbk),
    );
  });
};

export default openAssetChannel;
