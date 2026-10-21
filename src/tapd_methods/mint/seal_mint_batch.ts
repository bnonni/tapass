import {auto as asyncAuto} from 'async';
import {returnResult} from 'asyncjs-util';

import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {isTapd} from '../../tapd_requests/index.js';
import {mintRpcError} from '../../tapd_responses/index.js';
import {rpcBatchAsBatch} from '../../tapd_responses/index.js';
import type {Batch} from '../../tapd_responses/index.js';
import type {AuthenticatedTapdArgs} from '../../typescript/index.js';
import type {TapdCallback} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';
import type {TapdMethod} from '../../typescript/index.js';

const hexAsBase64 = (n: string) => Buffer.from(n, 'hex').toString('base64');
const {isArray} = Array;
const isAssetId = (n: unknown) => /^[0-9A-F]{64}$/i.test(String(n));
const isHex = (n: unknown) => /^([0-9A-F]{2})+$/i.test(String(n));
const method = 'sealBatch';
const type = 'mint';

export type SealMintBatchArgs = AuthenticatedTapdArgs<{
  group_witnesses?: {
    /** Asset Id Hex String */
    asset_id: string;
    /** Witness Stack Element Hex Strings */
    witness: string[];
  }[];
  /** Signed Group Virtual Transaction PSBT Hex Strings */
  signed_group_psbts?: string[];
}>;

export type SealMintBatchResult = Batch;

type Tasks = {
  seal: SealMintBatchResult;
  validate: undefined;
};

/** Seal the pending mint batch with asset group witnesses

  Requires `mint:write` permission

  This is only necessary when an asset in the batch has a group key that needs
  an external signer. Fund the batch first with `fundMintBatch`, and sign the
  `group_virtual_psbt` of each unsealed asset.

  tapd signs the group witnesses that are not given

  Give `group_witnesses` or `signed_group_psbts`, not both

  {
    [group_witnesses]: [{
      asset_id: <Asset Id Hex String>
      witness: [<Witness Stack Element Hex String>]
    }]
    [signed_group_psbts]: [<Signed Group Virtual Transaction PSBT Hex String>]
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk or Promise
  {
    assets: [{
      amount: <Asset Units Numeric String>
      [group_anchor]: <Name of the Asset That Anchors a New Group String>
      [group_internal_key]: <Group Internal Public Key Hex String>
      [group_key]: <Group Key Hex String>
      [group_tapscript_root]: <Group Tapscript Root Hex String>
      is_collectible: <Asset Is Collectible Bool>
      is_new_group: <Asset Starts a New Group Bool>
      [metadata]: <Metadata Hex String>
      [metadata_hash]: <Metadata Hash Hex String>
      [metadata_type]: <Metadata Type String> // json, opaque, unknown
      name: <Asset Name String>
      [script_key]: <Script Key Hex String>
      version: <Asset Version Number>
    }]
    created_at: <Created At ISO 8601 Date String>
    created_height: <Block Height When Created Number>
    id: <Batch Key Hex String>
    [psbt]: <Genesis Transaction PSBT Hex String>
    state: <Batch State String>
    [transaction_id]: <Genesis Transaction Id Hex String>
    unsealed_assets: []
  }
*/
const sealMintBatch: TapdMethod<SealMintBatchArgs, SealMintBatchResult> = (
  args: SealMintBatchArgs,
  cbk?: TapdCallback<SealMintBatchResult>,
) => {
  return new Promise((resolve, reject) => {
    return asyncAuto<Tasks, TapdError>(
      {
        // Check arguments
        validate: cbk => {
          const psbts = args.signed_group_psbts;
          const witnesses = args.group_witnesses;

          if (!!witnesses && !!psbts) {
            return cbk([400, 'ExpectedGroupWitnessesOrSignedPsbtsNotBoth']);
          }

          if (!!witnesses && !isArray(witnesses)) {
            return cbk([400, 'ExpectedArrayOfGroupWitnessesToSealMintBatch']);
          }

          if (!!witnesses && witnesses.some(n => !isAssetId(n?.asset_id))) {
            return cbk([400, 'ExpectedAssetIdForGroupWitnessToSealMintBatch']);
          }

          if (!!witnesses) {
            const isValid = (n: {witness: string[]}) => {
              return isArray(n.witness) && n.witness.every(isHex);
            };

            if (!witnesses.every(isValid)) {
              return cbk([400, 'ExpectedHexWitnessStackToSealMintBatch']);
            }
          }

          if (!!psbts && (!isArray(psbts) || !psbts.every(isHex))) {
            return cbk([400, 'ExpectedHexSignedGroupPsbtsToSealMintBatch']);
          }

          if (!isTapd({method, type, tapd: args.tapd})) {
            return cbk([400, 'ExpectedAuthenticatedTapdToSealMintBatch']);
          }

          return cbk();
        },

        // Seal the batch
        seal: [
          'validate',
          ({}, cbk) => {
            const request = {
              group_witnesses: (args.group_witnesses || []).map(n => ({
                genesis_id: Buffer.from(n.asset_id, 'hex'),
                witness: n.witness.map(element => Buffer.from(element, 'hex')),
              })),
              short_response: false,
              signed_group_virtual_psbts: (args.signed_group_psbts || []).map(
                hexAsBase64,
              ),
            };

            return args.tapd[type][method](request, (err: any, res: any) => {
              if (isConnectionFailure({err})) {
                return cbk([503, 'FailedToConnectToTapdToSealMintBatch']);
              }

              if (isPermissionDenied({err})) {
                return cbk([403, 'PermissionDeniedToSealMintBatch']);
              }

              const knownError = mintRpcError({err});

              if (!!knownError) {
                return cbk(knownError);
              }

              if (!!err) {
                return cbk([503, 'UnexpectedErrorSealingMintBatch', {err}]);
              }

              if (!res) {
                return cbk([503, 'ExpectedResponseToSealMintBatch']);
              }

              try {
                return cbk(null, rpcBatchAsBatch({batch: res.batch}));
              } catch (err: any) {
                return cbk([503, err.message]);
              }
            });
          },
        ],
      },
      returnResult({reject, resolve, of: 'seal'}, cbk),
    );
  });
};

export default sealMintBatch;
