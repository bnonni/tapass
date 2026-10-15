import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcTransferAsTransfer} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_send_responses.js';

const assetId =
  '664d168bed3e038f2105107fad772f532979d1ce95c60fb410cd5c78448da4e2';
const {transfer} = responses.sendAsset;
const txId = 'c94adff6655fcbadf9d5acefa3a552c573b305846a9397927a73f7603b276964';

const tests = [
  {args: null, error: 'ExpectedRpcTransferDetails'},
  {
    args: {...transfer, anchor_tx_chain_fees: 1},
    error: 'ExpectedChainFeesInRpcTransfer',
  },
  {
    args: {...transfer, anchor_tx_hash: null},
    error: 'ExpectedAnchorTransactionHashInRpcTransfer',
  },
  {
    args: {...transfer, anchor_tx_hash: Buffer.alloc(31)},
    error: 'ExpectedAnchorTransactionHashInRpcTransfer',
  },
  {
    args: {...transfer, inputs: null},
    error: 'ExpectedArrayOfInputsInRpcTransfer',
  },
  {
    args: {...transfer, outputs: null},
    error: 'ExpectedArrayOfOutputsInRpcTransfer',
  },
  {
    args: {...transfer, transfer_timestamp: ''},
    error: 'ExpectedTimestampInRpcTransfer',
  },
  {
    args: {...transfer, inputs: [{}]},
    error: 'ExpectedAmountInRpcTransferInput',
  },
  {
    args: {...transfer, inputs: [{amount: '1', asset_id: Buffer.alloc(32)}]},
    error: 'ExpectedAssetIdAndScriptKeyInRpcTransferInput',
  },
  {
    args: {...transfer, outputs: [{}]},
    error: 'ExpectedAmountInRpcTransferOutput',
  },
  {
    args: {...transfer, outputs: [{...transfer.outputs[0], anchor: null}]},
    error: 'ExpectedAnchorInRpcTransferOutput',
  },
  {
    args: {
      ...transfer,
      outputs: [
        {
          ...transfer.outputs[0],
          anchor: {...transfer.outputs[0].anchor, value: 1},
        },
      ],
    },
    error: 'ExpectedAnchorValueInRpcTransferOutput',
  },
  {
    args: {...transfer, outputs: [{...transfer.outputs[0], script_key: null}]},
    error: 'ExpectedScriptKeyInRpcTransferOutput',
  },
];

tests.forEach(({args, error}) => {
  return test(`A transfer that is not valid throws ${error}`, () => {
    throws(() => rpcTransferAsTransfer(args), new Error(error));
  });
});

test('A real unconfirmed send transfer is mapped', () => {
  const mapped = rpcTransferAsTransfer(transfer);

  equal(mapped.block_hash, undefined);
  equal(mapped.block_height, undefined);
  equal(mapped.created_at, '2026-10-15T21:48:17.000Z');
  equal(mapped.fee, 6362);
  equal(mapped.height_hint, 108);
  equal(mapped.label, 'fork-send-1792100897086');
  equal(mapped.transaction, transfer.anchor_tx.toString('hex'));

  // The transaction id is the same as the transaction id of each anchor
  equal(mapped.transaction_id, txId);
  mapped.outputs.forEach(n => equal(n.anchor.transaction_id, txId));

  deepStrictEqual(mapped.inputs, [
    {
      amount: '1000000',
      asset_id: assetId,
      group_key: undefined,
      is_collectible: false,
      script_key:
        '02aa423ce3a4f9727445d6f9eb3ad99ae9d3fdc01959913a844045ac17504a316b',
      transaction_id:
        '35c4f78c160694f4d2401edf6b8c483cc0e2853a43c1648f2e09596da19a5aae',
      transaction_vout: 0,
    },
  ]);

  const [change, recipient] = mapped.outputs;

  deepStrictEqual(change, {
    address: undefined,
    amount: '999990',
    anchor: {
      internal_key:
        '03cd10657a444e4ffd90afdb918a3d2e686fc9696626d4a5053b50c41ffdc6592e',
      merkle_root:
        '51246d74eb02c52593c274f744a806aa330bd40639519f6db2b7c8809e19c874',
      output_script:
        '51203f0416deaaffde5c651b85667bd3b000eb9f1527a736a6dbe9214068207dbcab',
      passive_assets_count: 0,
      taproot_asset_root:
        '51246d74eb02c52593c274f744a806aa330bd40639519f6db2b7c8809e19c874',
      tapscript_sibling: undefined,
      tokens: 1000,
      transaction_id: txId,
      transaction_vout: 0,
    },
    asset_id: assetId,
    asset_version: 0,
    group_key: undefined,
    is_collectible: false,
    is_local: true,
    is_split_root: true,
    lock_time: undefined,
    proof: transfer.outputs[0].new_proof_blob.toString('hex'),
    proof_courier: undefined,
    proof_delivery: undefined,
    relative_lock_time: undefined,
    script_key:
      '02d1bb20f95ce70c1fc298e31e53ac42f07427810b75b2574d923e82b94eb32891',
    split_root_hash:
      '6e1ab4bf50d99528d1ad1075f39725b7fb219e8484d22dd8b306972a24757a87',
  });

  equal(recipient.address, transfer.outputs[1].tap_addr);
  equal(recipient.amount, '10');
  equal(recipient.is_split_root, false);
  equal(recipient.proof_courier, 'universerpc://polar-n4-bob:8443');
  equal(recipient.split_root_hash, undefined);
});

test('A real confirmed transfer has the block hash in display order', () => {
  const [confirmed] = responses.listTransfers.transfers;

  const mapped = rpcTransferAsTransfer(confirmed);

  equal(
    mapped.block_hash,
    '1d96213229848c9cb2e152b31495c9101c06b9bf37106f0aafe2faab167e2875',
  );
  equal(mapped.block_height, 109);
  equal(mapped.transaction_id, txId);
});

test('Proof delivery states are mapped', () => {
  const [output] = transfer.outputs;

  const states = [
    'PROOF_DELIVERY_STATUS_COMPLETE',
    'PROOF_DELIVERY_STATUS_PENDING',
    'PROOF_DELIVERY_STATUS_NOT_APPLICABLE',
  ];

  const mapped = states.map(proof_delivery_status => {
    const outputs = [{...output, proof_delivery_status}];

    const [mapped] = rpcTransferAsTransfer({...transfer, outputs}).outputs;

    return mapped?.proof_delivery;
  });

  deepStrictEqual(mapped, ['complete', 'pending', undefined]);
});
