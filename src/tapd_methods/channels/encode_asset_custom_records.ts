import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {longKeyAsNumber} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const {entries} = Object;
const {fromEntries} = Object;
const {isArray} = Array;
const isAssetId = (n: unknown) => /^[0-9A-F]{64}$/i.test(String(n));
const isBuffer = (n: unknown): n is Buffer => Buffer.isBuffer(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPositive = (n: unknown) => isNumeric(n) && BigInt(n as string) > 0;
const isRfqId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const method = 'encodeCustomRecords';
const type = 'tapchannel';

export type EncodeAssetCustomRecordsArgs = AuthenticatedTapdArgs<{
  assets?: {
    /** Asset Units Numeric String */
    amount: string;
    /** Asset Id Hex String */
    asset_id: string;
  }[];
  /** RFQ Quote Id Hex String */
  rfq_id?: string;
}>;

export type EncodeAssetCustomRecordsResult = {
  records: {
    /** Record Type Number String */
    type: string;
    /** Record Value Hex */
    value: string;
  }[];
};

type Tasks = {
  encode: EncodeAssetCustomRecordsResult;
  validate: undefined;
};

/** Encode the first hop custom records of an asset payment

  Use the records as the first hop custom records of an lnd payment, to pay
  with assets over an asset channel

  This method does not need a permission

  An `rfq_id` is for a payment that uses an accepted RFQ quote

  `assets` or an `rfq_id` is required

  Each `asset_id` in `assets` must be unique. The records are in ascending
  `type` order.

  tapd v0.8.5 marks the EncodeCustomRecords RPC as deprecated

  {
    [assets]: [{
      amount: <Asset Units Numeric String>
      asset_id: <Asset Id Hex String>
    }]
    [rfq_id]: <RFQ Quote Id Hex String>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    records: [{
      type: <Record Type Number String>
      value: <Record Value Hex String>
    }]
  }
*/
const encodeAssetCustomRecords: TapdMethod<
  EncodeAssetCustomRecordsArgs,
  EncodeAssetCustomRecordsResult
> = (
  args: EncodeAssetCustomRecordsArgs,
  cbk?: TapdCallback<EncodeAssetCustomRecordsResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          if (!!args.assets && !isArray(args.assets)) {
            return cbk([400, 'ExpectedArrayOfAssetsToEncodeCustomRecords']);
          }

          if (!args.assets?.length && !args.rfq_id) {
            return cbk([400, 'ExpectedAssetsOrRfqIdToEncodeCustomRecords']);
          }

          const assets = args.assets || [];

          if (assets.some(n => !isAssetId(n?.asset_id))) {
            return cbk([400, 'ExpectedAssetIdHexToEncodeCustomRecords']);
          }

          if (assets.some(n => !isPositive(n.amount))) {
            return cbk([400, 'ExpectedAssetAmountToEncodeCustomRecords']);
          }

          const ids = assets.map(n => n.asset_id.toLowerCase());

          if (new Set(ids).size !== ids.length) {
            return cbk([400, 'ExpectedUniqueAssetsToEncodeCustomRecords']);
          }

          if (!!args.rfq_id && !isRfqId(args.rfq_id)) {
            return cbk([400, 'ExpectedRfqIdHexToEncodeCustomRecords']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToEncodeRecords']);
          }

          return cbk();
        },

        // Encode the records
        encode: [
          'validate',
          ({}, cbk) => {
            const assets = args.assets || [];

            const request = {
              router_send_payment: {
                asset_amounts: fromEntries(
                  assets.map(n => [n.asset_id.toLowerCase(), n.amount]),
                ),
                rfq_id: Buffer.from(args.rfq_id || '', 'hex'),
              },
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToEncodeRecords']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToEncodeAssetCustomRecords']);
              }

              if (!!err) {
                return cbk([
                  503,
                  'UnexpectedErrorEncodingAssetCustomRecords',
                  {err},
                ]);
              }

              if (!res || !res.custom_records) {
                return cbk([503, 'ExpectedCustomRecordsInEncodeResponse']);
              }

              const records = entries(res.custom_records as object);

              if (records.some(([, value]) => !isBuffer(value))) {
                return cbk([503, 'ExpectedRecordValuesInEncodeResponse']);
              }

              try {
                return cbk(null, {
                  records: records
                    .map(([recordType, value]) => ({
                      type: longKeyAsNumber(recordType),
                      value: (value as Buffer).toString('hex'),
                    }))
                    .sort((a, b) => (BigInt(a.type) < BigInt(b.type) ? -1 : 1)),
                });
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'encode'}, cbk),
    );
  });
};

export default encodeAssetCustomRecords;
