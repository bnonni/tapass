import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {openAssetChannel} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';

const assetId = '01'.repeat(32);
const peer = `02${'aa'.repeat(32)}`;
const txid = 'ab'.repeat(32);

const tapdWith = (fundChannel: (req: any, cbk: Function) => void) => {
  return {tapchannel: {fundChannel}} as unknown as AuthenticatedTapd;
};

const tapd = tapdWith((_, cbk) => cbk(null, {output_index: 1, txid}));

const failWith = (details: string) => tapdWith((_, cbk) => cbk({details}));

const args = {
  amount: '100',
  asset_id: assetId,
  chain_fee_tokens_per_vbyte: 2,
  partner_public_key: peer,
  tapd,
};

const tests = [
  {
    args: {...args, amount: '0'},
    description: 'An asset amount is expected',
    error: [400, 'ExpectedAssetAmountToOpenAssetChannel'],
  },
  {
    args: {...args, asset_id: undefined},
    description: 'An asset id or a group key is expected',
    error: [400, 'ExpectedAssetIdOrGroupKeyToOpenAssetChannel'],
  },
  {
    args: {...args, group_key: peer},
    description: 'An asset id and a group key are not expected together',
    error: [400, 'UnexpectedAssetIdAndGroupKeyForAssetChannel'],
  },
  {
    args: {...args, asset_id: 'id'},
    description: 'A hex asset id is expected',
    error: [400, 'ExpectedAssetIdHexToOpenAssetChannel'],
  },
  {
    args: {...args, chain_fee_tokens_per_vbyte: 0},
    description: 'A fee rate is expected',
    error: [400, 'ExpectedChainFeeRateToOpenAssetChannel'],
  },
  {
    args: {...args, give_tokens: -1},
    description: 'Give tokens must not be negative',
    error: [400, 'ExpectedGiveTokensToOpenAssetChannel'],
  },
  {
    args: {...args, asset_id: undefined, group_key: 'key'},
    description: 'A group key is expected',
    error: [400, 'ExpectedGroupKeyHexToOpenAssetChannel'],
  },
  {
    args: {...args, partner_public_key: 'key'},
    description: 'A peer public key is expected',
    error: [400, 'ExpectedPartnerPublicKeyToOpenAssetChannel'],
  },
  {
    args: {...args, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToOpenAssetChannel'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'x'}))},
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToOpenAssetChannel'],
  },
  {
    args: {...args, tapd: failWith('permission denied')},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToOpenAssetChannel'],
  },
  {
    args: {
      ...args,
      tapd: failWith(
        'error funding channel: peer 02 does not support asset channels',
      ),
    },
    description: 'A peer without asset channels is returned',
    error: [503, 'PeerDoesNotSupportAssetChannels'],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorOpeningAssetChannel', {err: 'err'}],
  },
  {
    args: {...args, tapd: tapdWith((_, cbk) => cbk(null, {output_index: 1}))},
    description: 'A funding transaction id is expected',
    error: [503, 'ExpectedFundingTransactionIdForAssetChannel'],
  },
  {
    args: {
      ...args,
      tapd: tapdWith((_, cbk) => cbk(null, {output_index: -1, txid})),
    },
    description: 'A funding output index is expected',
    error: [503, 'ExpectedFundingOutputIndexForAssetChannel'],
  },
  {
    args,
    description: 'A channel is opened',
    expected: {transaction_id: txid, transaction_vout: 1},
  },
];

tests.forEach(({args, description, error, expected}) => {
  return test(description, async () => {
    if (!!error) {
      await rejects(openAssetChannel(args), error, 'Got expected error');
    } else {
      deepStrictEqual(await openAssetChannel(args), expected, 'Got channel');
    }

    return;
  });
});
