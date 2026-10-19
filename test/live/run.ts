// Live test of the tapass methods on a Polar network
//
// This script does not run in CI, because it needs the Polar desktop app.
//
// Needs two started litd nodes (tapd v0.8.1 or later) in integrated mode. The
// proof courier of the network must run. Node A makes an asset channel to
// node B if it does not have one. Optionally, a tapd node older than v0.8.0
// checks the 501 of the methods that need a newer tapd.
//
// Each run mints a new asset on A and sends some units to B on-chain. The
// units that A pays to B over the asset channel go back to A at the end.
//
// stopTapd uses a read-only macaroon and expects 403, so tapd keeps running.
//
// Usage: NETWORK_ID=1 pnpm test:live
// Env: NETWORK_ID (required), NODES (alice,bob), OLD_NODE (not set)
import type EventEmitter from 'node:events';

import {addPeer} from 'lightning';
import {authenticatedLndGrpc} from 'lightning';
import {createInvoice} from 'lightning';
import {getChainBalance} from 'lightning';
import type {AuthenticatedLnd} from 'lightning';
import {depositFunds} from 'polarln';
import {getNodeCredentials} from 'polarln';
import {mineBlocks} from 'polarln';
import {polarBridge} from 'polarln';
import {syncTapUniverse} from 'polarln';

import * as tapass from '../../src/index.js';

const assetName = `tapass-live-${Date.now()}`;
const channelAssetName = 'tapass-live-coin';
const label = `${assetName}-send`;
const metadataText = 'tapass live test';
const networkId = Number(process.env.NETWORK_ID);
const [nameA, nameB] = (process.env.NODES || 'alice,bob').split(',');
const oldName = process.env.OLD_NODE;
const {polar} = polarBridge({});
const results: {name: string; ok: boolean}[] = [];
const start = new Date().toISOString();
const subscriptions: EventEmitter[] = [];
const unknownKey = `02${'ab'.repeat(32)}`;
const unknownHash = 'ab'.repeat(32);

if (!Number.isSafeInteger(networkId) || !nameA || !nameB) {
  console.log('Set NETWORK_ID, and NODES as two node names (alice,bob)');
  process.exit(1);
}

const check = async (name: string, fn: () => Promise<unknown>) => {
  try {
    const detail = await fn();
    results.push({name, ok: true});
    console.log(
      'ok  ',
      name,
      detail === undefined ? '' : JSON.stringify(detail),
    );
  } catch (err) {
    results.push({name, ok: false});
    console.log(
      'FAIL',
      name,
      err instanceof Error ? err.message : JSON.stringify(err),
    );
  }
};

function expect(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const rejectsWith = async (
  promise: Promise<unknown>,
  code: number,
  message: string,
) => {
  try {
    await promise;
  } catch (err) {
    const [errCode, errMessage] = err as [number, string];
    expect(
      errCode === code && errMessage === message,
      `got ${JSON.stringify(err)}`,
    );
    return [errCode, errMessage];
  }
  throw new Error(`expected ${code} ${message}`);
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const inMinutes = (minutes: number) =>
  new Date(Date.now() + 60e3 * minutes).toISOString();
const mine = () => mineBlocks({blocks: 6, networkId, polar});

// Poll until the function gives a truthy value
const waitFor = async <T>(name: string, fn: () => Promise<T>) => {
  for (let i = 0; i < 60; i++) {
    const value = await fn();
    if (!!value) {
      return value;
    }
    await delay(1000);
  }
  throw new Error(`timed out: ${name}`);
};

// Keep the events of a subscription, and close it at the end of the test
const record = (sub: EventEmitter, names: string[]) => {
  const events: {data: any; name: string}[] = [];
  names.forEach(name => sub.on(name, data => events.push({data, name})));
  sub.on('error', data => events.push({data, name: 'error'}));
  subscriptions.push(sub);
  return events;
};

const connectTapd = async (nodeName: string) => {
  const creds = await getNodeCredentials({networkId, nodeName, polar});
  expect(!!creds.tapd, `expected ${nodeName} to have tapd`);
  const {tapd} = tapass.authenticatedTapdGrpc(creds.tapd);
  return {creds: creds.tapd, tapd};
};

const connect = async (nodeName: string) => {
  const creds = await getNodeCredentials({networkId, nodeName, polar});
  expect(!!creds.lnd && !!creds.tapd, `expected ${nodeName} to be a litd node`);
  const {lnd} = authenticatedLndGrpc(creds.lnd);
  const {tapd} = tapass.authenticatedTapdGrpc(creds.tapd);
  const info = await tapass.getTapdInfo({tapd});
  return {creds: creds.tapd, info, lnd, name: nodeName, tapd};
};

const a = await connect(nameA);
const b = await connect(nameB);

// lnd writes the asset data of an asset channel as JSON
const channelAssetIds = async (lnd: AuthenticatedLnd, peer: string) => {
  const {channels} = await new Promise<{channels: any[]}>((resolve, reject) => {
    (lnd as any).default.listChannels(
      {peer: Buffer.from(peer, 'hex')},
      (err: unknown, res: {channels: any[]}) =>
        !!err ? reject(err) : resolve(res),
    );
  });
  return channels.flatMap(({custom_channel_data}) => {
    try {
      const {funding_assets} = JSON.parse(String(custom_channel_data));
      return funding_assets.map((n: any) => String(n.asset_genesis.asset_id));
    } catch {
      return [];
    }
  });
};

// Setup: chain funds on A, and an asset channel from A to B
const {chain_balance} = await getChainBalance({lnd: a.lnd});

if (chain_balance < 1e6) {
  console.log('setup: fund A');
  await depositFunds({networkId, nodeName: a.name, polar, sats: 5e6});
  await mine();
}

if (!(await channelAssetIds(a.lnd, b.info.public_key)).length) {
  const findChannelAsset = async () => {
    const {assets} = await tapass.getAssets({tapd: a.tapd});
    return assets.find(n => n.name === channelAssetName);
  };

  if (!(await findChannelAsset())) {
    console.log('setup: mint the channel asset on A');
    await tapass.addAssetToMintBatch({
      amount: '1000000',
      decimal_display: 2,
      name: channelAssetName,
      tapd: a.tapd,
    });
    await tapass.finalizeMintBatch({tapd: a.tapd});
    await delay(2000);
    await mine();
  }

  const asset = await waitFor('channel asset', findChannelAsset);

  console.log('setup: sync the universe of B and open an asset channel');
  await syncTapUniverse({
    networkId,
    nodeName: b.name,
    polar,
    universeNodeName: a.name,
  });
  await addPeer({
    lnd: a.lnd,
    public_key: b.info.public_key,
    socket: `${b.name}:9735`,
  });

  // An asset payment moves few sats, so give B sats to pay back with
  await check('openAssetChannel: A opens an asset channel to B', async () => {
    const res = await tapass.openAssetChannel({
      amount: '100000',
      asset_id: asset.asset_id,
      chain_fee_tokens_per_vbyte: 2,
      give_tokens: 10000,
      partner_public_key: b.info.public_key,
      tapd: a.tapd,
    });
    expect(
      /^[0-9a-f]{64}$/.test(res.transaction_id),
      'expected a transaction id',
    );
    return res;
  });

  await delay(3000);
  await mine();
  await waitFor(
    'asset channel',
    async () => (await channelAssetIds(a.lnd, b.info.public_key)).length,
  );
  await delay(5000);
}

const [channelAssetId] = await channelAssetIds(a.lnd, b.info.public_key);
expect(!!channelAssetId, 'expected an asset channel from A to B');

// Daemon
await check('getTapdInfo: A is synced and has the lnd key', async () => {
  const {info} = a;
  expect(info.is_synced_to_chain, 'expected synced to chain');
  expect(info.network === 'regtest', `network ${info.network}`);
  expect(/^\d+\.\d+\.\d+/.test(info.version), `version ${info.version}`);
  expect(/^0[23][0-9a-f]{64}$/.test(info.public_key), 'expected a public key');
  return {height: info.current_block_height, version: info.version};
});

const {macaroon: readOnlyMacaroon} = await tapass.createTapdMacaroon({
  permissions: [
    {action: 'read', entity: 'assets'},
    {action: 'read', entity: 'daemon'},
  ],
  tapd: a.tapd,
});

const readOnly = tapass.authenticatedTapdGrpc({
  ...a.creds,
  macaroon: readOnlyMacaroon,
}).tapd;

await check('createTapdMacaroon: a read-only macaroon can read', async () => {
  return (await tapass.getTapdInfo({tapd: readOnly})).version;
});

await check('stopTapd: a read-only macaroon is a 403', async () => {
  return rejectsWith(
    tapass.stopTapd({tapd: readOnly}),
    403,
    'PermissionDeniedToStopTapd',
  );
});

await check('addAssetToMintBatch: a read-only macaroon is a 403', async () => {
  return rejectsWith(
    tapass.addAssetToMintBatch({amount: '1', name: assetName, tapd: readOnly}),
    403,
    'PermissionDeniedToAddAssetToMintBatch',
  );
});

await check('setTapdDebugLevel: a level for all subsystems', async () => {
  await tapass.setTapdDebugLevel({level: 'info', tapd: a.tapd});
});

await check('setTapdDebugLevel: an unknown level is a 400', async () => {
  return rejectsWith(
    tapass.setTapdDebugLevel({level: 'unknown', tapd: a.tapd}),
    400,
    'FailedToSetTapdDebugLevel',
  );
});

// Mint a new grouped asset on A
const mintEvents = record(tapass.subscribeToMintEvents({tapd: a.tapd}), [
  'batch',
]);

const mintArgs = {
  amount: '1000000',
  decimal_display: 2,
  is_new_group: true,
  metadata_text: metadataText,
  name: assetName,
  tapd: a.tapd,
};

await check('addAssetToMintBatch: a pending batch has the asset', async () => {
  const batch = await tapass.addAssetToMintBatch(mintArgs);
  const [asset] = batch.assets;
  expect(batch.state === 'pending', `state ${batch.state}`);
  expect(asset?.name === assetName && asset.is_new_group, 'expected the asset');
  return {id: batch.id, state: batch.state};
});

await check('cancelMintBatch: the batch is cancelled', async () => {
  const {id} = await tapass.cancelMintBatch({tapd: a.tapd});
  const {batches} = await tapass.getMintBatches({id, tapd: a.tapd});
  expect(
    batches[0]?.state === 'seedling_cancelled',
    `state ${batches[0]?.state}`,
  );
  return {id, state: batches[0].state};
});

await check('cancelMintBatch: no pending batch is a 404', async () => {
  return rejectsWith(
    tapass.cancelMintBatch({tapd: a.tapd}),
    404,
    'PendingMintBatchNotFound',
  );
});

const {id: batchId} = await tapass.addAssetToMintBatch(mintArgs);

await check('fundMintBatch: the batch has a group PSBT', async () => {
  const batch = await tapass.fundMintBatch({tapd: a.tapd});
  const [unsealed] = batch.unsealed_assets;
  expect(!!batch.psbt, 'expected a genesis PSBT');
  expect(!!unsealed?.group_virtual_psbt, 'expected a group PSBT');
  return {state: batch.state, unsealed: batch.unsealed_assets.length};
});

await check('fundMintBatch: a funded batch is a 400', async () => {
  return rejectsWith(
    tapass.fundMintBatch({tapd: a.tapd}),
    400,
    'MintBatchIsAlreadyFunded',
  );
});

await check(
  'getMintBatches: a verbose batch has the unsealed asset',
  async () => {
    const {batches} = await tapass.getMintBatches({
      id: batchId,
      is_verbose: true,
      tapd: a.tapd,
    });
    expect(
      batches[0]?.unsealed_assets.length === 1,
      'expected an unsealed asset',
    );
    return {state: batches[0].state};
  },
);

await check('sealMintBatch: tapd signs the group witness', async () => {
  const batch = await tapass.sealMintBatch({tapd: a.tapd});
  expect(!!batch.assets[0]?.group_key, 'expected a group key');
  return {group_key: batch.assets[0].group_key};
});

await check('finalizeMintBatch: tapd broadcasts the genesis', async () => {
  const batch = await tapass.finalizeMintBatch({tapd: a.tapd});
  expect(batch.state === 'broadcast', `state ${batch.state}`);
  expect(!!batch.transaction_id, 'expected a transaction id');
  return {state: batch.state, transaction_id: batch.transaction_id};
});

await delay(2000);
await mine();

const asset = await waitFor('minted asset', async () => {
  const {assets} = await tapass.getAssets({tapd: a.tapd});
  return assets.find(n => n.name === assetName);
});

const groupKey = asset.group?.key ?? '';

await check('subscribeToMintEvents: the batch states', async () => {
  const states = await waitFor('finalized event', async () => {
    const batch = mintEvents.filter(n => n.data.batch.id === batchId);
    const list = batch.map(n => String(n.data.state));
    return list.includes('finalized') && list;
  });
  return states;
});

await check('getMintBatches: the batch is finalized', async () => {
  const {batches} = await tapass.getMintBatches({id: batchId, tapd: a.tapd});
  expect(batches[0]?.state === 'finalized', `state ${batches[0]?.state}`);
});

// Asset reads on A
await check('getAssets: A has the new asset in a group', async () => {
  expect(asset.amount === '1000000', `amount ${asset.amount}`);
  expect(asset.decimal_display === 2, `decimals ${asset.decimal_display}`);
  expect(/^0[23][0-9a-f]{64}$/.test(groupKey), 'expected a group key');
  const {assets} = await tapass.getAssets({
    asset_id: asset.asset_id,
    tapd: a.tapd,
  });
  expect(assets.length === 1, `got ${assets.length} assets by id`);
  return {asset_id: asset.asset_id, group_key: groupKey};
});

await check('getAssetMetadata: the metadata text', async () => {
  const meta = await tapass.getAssetMetadata({
    asset_id: asset.asset_id,
    tapd: a.tapd,
  });
  expect(
    meta.data === Buffer.from(metadataText).toString('hex'),
    `data ${meta.data}`,
  );
  expect(meta.decimal_display === 2, `decimals ${meta.decimal_display}`);
  expect(meta.hash === asset.meta_hash, 'expected the meta hash');
  return {type: meta.type};
});

await check('getAssetMetadata: an unknown asset is a 404', async () => {
  return rejectsWith(
    tapass.getAssetMetadata({asset_id: unknownHash, tapd: a.tapd}),
    404,
    'AssetNotFound',
  );
});

await check('getAssetGroups: the group has the asset', async () => {
  const {groups} = await tapass.getAssetGroups({tapd: a.tapd});
  const group = groups.find(n => n.key === groupKey);
  expect(
    !!group?.assets.find(n => n.asset_id === asset.asset_id),
    'expected the asset',
  );
});

await check('getAssetBalances: by asset and by group', async () => {
  const byAsset = await tapass.getAssetBalances({
    asset_id: asset.asset_id,
    tapd: a.tapd,
  });
  const byGroup = await tapass.getAssetBalances({
    group_key: groupKey,
    tapd: a.tapd,
  });
  const [balance] = byAsset.balances;
  const [groupBalance] = byGroup.group_balances;
  expect(
    balance?.balance === '1000000' && balance.name === assetName,
    'balance',
  );
  expect(groupBalance?.balance === '1000000', 'expected the group balance');
});

await check('getAssetUtxos: an output holds the asset', async () => {
  const {utxos} = await tapass.getAssetUtxos({tapd: a.tapd});
  const utxo = utxos.find(n =>
    n.assets.find(n => n.asset_id === asset.asset_id),
  );
  expect(!!utxo, 'expected an output');
  expect(
    utxo.transaction_id === asset.anchor?.transaction_id,
    'expected the anchor',
  );
  return {tokens: utxo.tokens, transaction_id: utxo.transaction_id};
});

// On-chain send from A to B
await syncTapUniverse({
  networkId,
  nodeName: b.name,
  polar,
  universeNodeName: a.name,
});

const address = await tapass.createAssetAddress({
  amount: '1000',
  asset_id: asset.asset_id,
  tapd: b.tapd,
});

await check('createAssetAddress: B has an address for the asset', async () => {
  expect(
    address.amount === '1000' && address.asset_id === asset.asset_id,
    'address',
  );
  return {proof_courier: address.proof_courier, version: address.version};
});

await check('decodeAssetAddress: A decodes the address of B', async () => {
  const decoded = await tapass.decodeAssetAddress({
    address: address.address,
    tapd: a.tapd,
  });
  expect(decoded.script_key === address.script_key, 'expected the script key');
  expect(decoded.amount === '1000', `amount ${decoded.amount}`);
});

const sendEvents = record(tapass.subscribeToAssetSends({label, tapd: a.tapd}), [
  'send',
]);

const receiveEvents = record(
  tapass.subscribeToAssetReceives({address: address.address, tapd: b.tapd}),
  ['receive'],
);

await delay(1000);

const transfer = await tapass.sendAsset({
  addresses: [{address: address.address}],
  fee_tokens_per_vbyte: 2,
  label,
  tapd: a.tapd,
});

await check('sendAsset: A sends the units to B', async () => {
  const output = transfer.outputs.find(
    n => n.script_key === address.script_key,
  );
  expect(
    output?.amount === '1000' && !output.is_local,
    'expected the output to B',
  );
  expect(transfer.label === label, 'expected the label');
  return {transaction_id: transfer.transaction_id};
});

await delay(2000);
await mine();

const receive = await waitFor('completed receive', async () => {
  const {receives} = await tapass.getAssetReceives({
    address: address.address,
    tapd: b.tapd,
  });
  return receives.find(n => n.status === 'completed');
});

await check('getAssetReceives: B has the completed receive', async () => {
  expect(receive.address.address === address.address, 'expected the address');
  expect(receive.is_proof_available, 'expected the proof');
  return {status: receive.status, transaction_id: receive.transaction_id};
});

await check('subscribeToAssetReceives: the receive states', async () => {
  const statuses = receiveEvents.map(n => String(n.data.status));
  expect(statuses.includes('completed'), `statuses ${statuses.join()}`);
  return statuses;
});

await check('subscribeToAssetSends: the send states', async () => {
  const states = await waitFor('complete send', async () => {
    const list = sendEvents.map(n => String(n.data.state));
    return list.includes('complete') && list;
  });
  return states;
});

await check('getAssetAddresses: B has the address', async () => {
  const {addresses} = await tapass.getAssetAddresses({
    created_after: start,
    tapd: b.tapd,
  });
  expect(
    !!addresses.find(n => n.address === address.address),
    'expected the address',
  );
  return addresses.length;
});

await check('getAssetTransfers: A has the transfer', async () => {
  const {transfers} = await tapass.getAssetTransfers({
    tapd: a.tapd,
    transaction_id: transfer.transaction_id,
  });
  expect(transfers[0]?.label === label, 'expected the labeled transfer');
  return {outputs: transfers[0].outputs.map(n => n.amount)};
});

// Proofs of the units that B received
const {proof} = await tapass.exportAssetProof({
  asset_id: asset.asset_id,
  script_key: address.script_key,
  tapd: b.tapd,
});

await check('exportAssetProof: an unknown script key is a 404', async () => {
  return rejectsWith(
    tapass.exportAssetProof({
      asset_id: asset.asset_id,
      script_key: unknownKey,
      tapd: b.tapd,
    }),
    404,
    'AssetProofNotFound',
  );
});

await check(
  'unpackAssetProofFile: the genesis and the send proofs',
  async () => {
    const {proofs} = await tapass.unpackAssetProofFile({proof, tapd: b.tapd});
    expect(proofs.length === 2, `got ${proofs.length} proofs`);
  },
);

await check(
  'decodeAssetProof: the last proof and the genesis proof',
  async () => {
    const last = await tapass.decodeAssetProof({
      is_including_meta: true,
      proof,
      tapd: b.tapd,
    });
    const genesis = await tapass.decodeAssetProof({
      depth: 1,
      proof,
      tapd: b.tapd,
    });
    expect(
      last.asset.amount === '1000' && last.proofs_count === 2,
      'last proof',
    );
    expect(
      last.meta?.data === Buffer.from(metadataText).toString('hex'),
      'metadata',
    );
    expect(
      genesis.genesis?.asset_id === asset.asset_id,
      'expected the genesis',
    );
    return {depth: genesis.depth, name: genesis.genesis.name};
  },
);

await check('verifyAssetProof: the proof file is valid', async () => {
  const res = await tapass.verifyAssetProof({proof, tapd: b.tapd});
  expect(
    res.is_valid && res.proof?.asset.amount === '1000',
    'expected a valid proof',
  );
});

const outpoint = {
  transaction_id: receive.transaction_id,
  transaction_vout: receive.transaction_vout,
};

await check('registerAssetTransfer: a known transfer is a 409', async () => {
  return rejectsWith(
    tapass.registerAssetTransfer({
      ...outpoint,
      asset_id: asset.asset_id,
      script_key: address.script_key,
      tapd: b.tapd,
    }),
    409,
    'AssetTransferIsAlreadyRegistered',
  );
});

await check(
  'registerAssetTransfer: an unknown script key is a 404',
  async () => {
    return rejectsWith(
      tapass.registerAssetTransfer({
        ...outpoint,
        asset_id: asset.asset_id,
        script_key: unknownKey,
        tapd: b.tapd,
      }),
      404,
      'ScriptKeyNotFoundToRegisterAssetTransfer',
    );
  },
);

// A V2 address of the group has no amount, so the sender gives the amount
await check('sendAsset: an amount to a V2 group address', async () => {
  const groupAddress = await tapass.createAssetAddress({
    group_key: groupKey,
    tapd: b.tapd,
  });
  expect(
    groupAddress.version === 2 && groupAddress.amount === '0',
    'V2 address',
  );
  const res = await tapass.sendAsset({
    addresses: [{address: groupAddress.address, amount: '5'}],
    fee_tokens_per_vbyte: 2,
    tapd: a.tapd,
  });
  expect(
    !!res.outputs.find(n => n.amount === '5' && !n.is_local),
    'expected 5 units',
  );
  await delay(2000);
  await mine();
  return waitFor('V2 receive', async () => {
    const {receives} = await tapass.getAssetReceives({
      address: groupAddress.address,
      tapd: b.tapd,
    });
    return receives.find(n => n.status === 'completed')?.status;
  });
});

// Burn on A, after the change of the sends confirms
await check('burnAsset: A burns units with a note', async () => {
  await waitFor('confirmed change', async () => {
    const {assets} = await tapass.getAssets({
      asset_id: asset.asset_id,
      tapd: a.tapd,
    });
    return assets.find(n => !!n.anchor?.block_height && !n.is_spent);
  });
  const res = await tapass.burnAsset({
    amount: '10',
    asset_id: asset.asset_id,
    is_burn_confirmed: true,
    note: metadataText,
    tapd: a.tapd,
  });
  expect(
    res.assets.every(n => n.is_burn && n.amount === '10'),
    'expected the burn',
  );
  await delay(2000);
  await mine();
  const {burns} = await tapass.getAssetBurns({
    tapd: a.tapd,
    transaction_id: res.transfer.transaction_id,
  });
  expect(
    burns[0]?.note === metadataText && burns[0].amount === '10',
    'expected the burn',
  );
  return {transaction_id: res.transfer.transaction_id};
});

await check('getAssetBurns: the burns of the group', async () => {
  const {burns} = await tapass.getAssetBurns({
    group_key: groupKey,
    tapd: a.tapd,
  });
  expect(
    burns.length === 1 && burns[0]?.asset_id === asset.asset_id,
    'expected the burn',
  );
});

await check('burnAsset: more than the balance is a 400', async () => {
  return rejectsWith(
    tapass.burnAsset({
      amount: '999999999',
      asset_id: asset.asset_id,
      is_burn_confirmed: true,
      tapd: a.tapd,
    }),
    400,
    'InsufficientAssetsToBurnAsset',
  );
});

// Asset channel payments from A to B
const channelArgs = {asset_id: channelAssetId};
const invoiceEvents = record(tapass.subscribeToAssetInvoices({tapd: b.tapd}), [
  'invoice_updated',
]);
const paymentEvents = record(tapass.subscribeToAssetPayments({tapd: a.tapd}), [
  'confirmed',
  'failed',
  'paying',
]);
const rfqEvents = record(tapass.subscribeToRfqEvents({tapd: a.tapd}), [
  'accepted_buy_quote',
  'accepted_htlc',
  'accepted_sell_quote',
]);

await delay(1000);

await check(
  'openAssetChannel: a peer that is not connected is a 503',
  async () => {
    return rejectsWith(
      tapass.openAssetChannel({
        ...channelArgs,
        amount: '1000',
        chain_fee_tokens_per_vbyte: 2,
        partner_public_key: unknownKey,
        tapd: a.tapd,
      }),
      503,
      'ExpectedConnectedPeerForAssetChannel',
    );
  },
);

await check(
  'createAssetInvoice: one unit is below the minimum, a 400',
  async () => {
    return rejectsWith(
      tapass.createAssetInvoice({...channelArgs, amount: '1', tapd: b.tapd}),
      400,
      'ExpectedAtLeastMinTransportableAssetAmount',
    );
  },
);

const invoice = await tapass.createAssetInvoice({
  ...channelArgs,
  amount: '1000',
  description: label,
  tapd: b.tapd,
});

await check('createAssetInvoice: B has an asset invoice', async () => {
  expect(
    !!invoice.request && invoice.description === label,
    'expected the request',
  );
  expect(
    invoice.quote?.peer_public_key === a.info.public_key,
    'expected a quote from A',
  );
  return {rate: invoice.quote.rate, tokens: invoice.tokens};
});

await check('decodeAssetPaymentRequest: A has the asset amount', async () => {
  const decoded = await tapass.decodeAssetPaymentRequest({
    ...channelArgs,
    request: invoice.request,
    tapd: a.tapd,
  });
  expect(decoded.asset.amount === '1000', `amount ${decoded.asset.amount}`);
  expect(decoded.destination === b.info.public_key, 'expected B');
  return {name: decoded.asset.name, tokens: decoded.tokens};
});

const payment = await tapass.payAssetInvoice({
  ...channelArgs,
  request: invoice.request,
  tapd: a.tapd,
});

await check('payAssetInvoice: A pays the invoice with the asset', async () => {
  expect(payment.id === invoice.id && !!payment.secret, 'expected the payment');
  expect(payment.quotes.length === 1, `got ${payment.quotes.length} quotes`);
  return {fee: payment.fee, tokens: payment.tokens};
});

await check('payAssetInvoice: a paid request is a 409', async () => {
  return rejectsWith(
    tapass.payAssetInvoice({
      ...channelArgs,
      request: invoice.request,
      tapd: a.tapd,
    }),
    409,
    'InvoiceIsAlreadyPaid',
  );
});

const keysend = await tapass.sendAssetKeysend({
  ...channelArgs,
  amount: '50',
  destination: b.info.public_key,
  tapd: a.tapd,
});

await check('sendAssetKeysend: A sends units to B', async () => {
  expect(
    !!keysend.secret && keysend.destination === b.info.public_key,
    'keysend',
  );
  return {tokens: keysend.tokens};
});

const hasUnits = (
  assets: {amount: string; asset_id: string}[],
  amount: string,
) => {
  return !!assets.find(
    n => n.asset_id === channelAssetId && n.amount === amount,
  );
};

await check('getAssetInvoices: B has the invoice and the keysend', async () => {
  const {invoices} = await tapass.getAssetInvoices({
    created_after: start,
    tapd: b.tapd,
  });
  const paid = invoices.find(n => n.id === invoice.id);
  expect(
    paid?.is_confirmed && hasUnits(paid.assets, '1000'),
    'expected the invoice',
  );
  expect(
    !!invoices.find(n => hasUnits(n.assets, '50')),
    'expected the keysend',
  );
  return invoices.length;
});

await check('getAssetPayments: A has the payment and the keysend', async () => {
  const {payments} = await tapass.getAssetPayments({
    created_after: start,
    tapd: a.tapd,
  });
  const paid = payments.find(n => n.id === payment.id);
  expect(!!paid && hasUnits(paid.assets, '1000'), 'expected the payment');
  expect(
    !!payments.find(n => n.id === keysend.id && hasUnits(n.assets, '50')),
    'keysend',
  );
  return payments.length;
});

await check('subscribeToAssetInvoices: B sees the paid invoice', async () => {
  return waitFor('paid invoice event', async () => {
    const {data} =
      invoiceEvents.find(
        n => n.data.id === invoice.id && n.data.is_confirmed,
      ) ?? {};
    return !!data && hasUnits(data.assets, '1000') && {index: data.index};
  });
});

await check('subscribeToAssetPayments: A sees the payments', async () => {
  const names = (id: string) =>
    paymentEvents.filter(n => n.data.id === id).map(n => n.name);
  expect(
    names(payment.id).includes('confirmed'),
    `payment ${names(payment.id).join()}`,
  );
  expect(
    names(keysend.id).includes('confirmed'),
    `keysend ${names(keysend.id).join()}`,
  );
  return {keysend: names(keysend.id), payment: names(payment.id)};
});

await check('subscribeToPastAssetPayment: the paid invoice', async () => {
  const events = record(
    tapass.subscribeToPastAssetPayment({id: payment.id, tapd: a.tapd}),
    ['confirmed', 'failed', 'paying'],
  );
  const confirmed = await waitFor('confirmed event', async () => {
    return events.find(n => n.name === 'confirmed');
  });
  expect(hasUnits(confirmed.data.assets, '1000'), 'expected the asset units');
  return {secret: confirmed.data.secret === payment.secret};
});

await check(
  'subscribeToPastAssetPayment: an unknown payment is a 404',
  async () => {
    const events = record(
      tapass.subscribeToPastAssetPayment({id: unknownHash, tapd: a.tapd}),
      [],
    );
    const {data} = await waitFor('error event', async () =>
      events.find(n => n.name === 'error'),
    );
    expect(
      data[0] === 404 && data[1] === 'SentAssetPaymentNotFound',
      JSON.stringify(data),
    );
    return data.slice(0, 2);
  },
);

await check(
  'encodeAssetCustomRecords: the records of asset units',
  async () => {
    const {records} = await tapass.encodeAssetCustomRecords({
      assets: [{amount: '10', asset_id: channelAssetId}],
      tapd: a.tapd,
    });
    expect(
      records.length === 1 && records[0]?.value.includes(channelAssetId),
      'records',
    );
    return {type: records[0].type};
  },
);

// RFQ: B is the edge node for orders from A
await check('addAssetSellOffer: B offers to sell the asset', async () => {
  await tapass.addAssetSellOffer({
    ...channelArgs,
    max_amount: '100000',
    tapd: b.tapd,
  });
});

await check('addAssetBuyOffer: B offers to buy the asset', async () => {
  await tapass.addAssetBuyOffer({
    ...channelArgs,
    max_amount: '100000',
    tapd: b.tapd,
  });
});

const buyQuote = await tapass.addAssetBuyOrder({
  ...channelArgs,
  expires_at: inMinutes(5),
  max_amount: '1000',
  peer_public_key: b.info.public_key,
  tapd: a.tapd,
});

await check('addAssetBuyOrder: B gives a buy quote', async () => {
  expect(
    buyQuote.peer_public_key === b.info.public_key,
    'expected a quote from B',
  );
  expect(buyQuote.max_amount === '1000' && Number(buyQuote.rate) > 0, 'quote');
  return {rate: buyQuote.rate};
});

const sellInvoice = await tapass.createAssetInvoice({
  ...channelArgs,
  amount: '1000',
  tapd: b.tapd,
});

const sellQuote = await tapass.addAssetSellOrder({
  ...channelArgs,
  expires_at: inMinutes(5),
  max_mtokens: sellInvoice.mtokens,
  peer_public_key: b.info.public_key,
  tapd: a.tapd,
});

await check('addAssetSellOrder: B gives a sell quote', async () => {
  expect(
    sellQuote.peer_public_key === b.info.public_key,
    'expected a quote from B',
  );
  expect(Number(sellQuote.amount) > 0 && Number(sellQuote.rate) > 0, 'quote');
  return {amount: sellQuote.amount, rate: sellQuote.rate};
});

await check('addAssetBuyOrder: a peer without a channel is a 503', async () => {
  return rejectsWith(
    tapass.addAssetBuyOrder({
      ...channelArgs,
      expires_at: inMinutes(5),
      max_amount: '1000',
      peer_public_key: unknownKey,
      tapd: a.tapd,
      timeout_seconds: 5,
    }),
    503,
    'NoAssetChannelWithPeerForAssetBuyOrder',
  );
});

await check('getAcceptedQuotes: A has the buy and sell quotes', async () => {
  const quotes = await tapass.getAcceptedQuotes({tapd: a.tapd});
  expect(
    !!quotes.buy_quotes.find(n => n.id === buyQuote.id),
    'expected the buy quote',
  );
  expect(
    !!quotes.sell_quotes.find(n => n.id === sellQuote.id),
    'expected the sell quote',
  );
});

await check('subscribeToRfqEvents: A sees the accepted quotes', async () => {
  const ids = rfqEvents.map(n => `${n.name}:${n.data.id}`);
  expect(
    ids.includes(`accepted_buy_quote:${buyQuote.id}`),
    'expected the buy quote',
  );
  expect(
    ids.includes(`accepted_sell_quote:${sellQuote.id}`),
    'expected the sell quote',
  );
  return rfqEvents.map(n => n.name);
});

await check('encodeAssetCustomRecords: the records of a quote', async () => {
  const {records} = await tapass.encodeAssetCustomRecords({
    rfq_id: sellQuote.id,
    tapd: a.tapd,
  });
  expect(records.length === 1, `got ${records.length} records`);
});

await check('payAssetInvoice: A pays with the sell quote', async () => {
  const res = await tapass.payAssetInvoice({
    ...channelArgs,
    request: sellInvoice.request,
    rfq_id: sellQuote.id,
    tapd: a.tapd,
  });
  expect(
    res.quotes.length === 1 && res.quotes[0]?.id === sellQuote.id,
    'expected the quote',
  );
  return {tokens: res.tokens};
});

await check('payAssetInvoice: an unknown quote is a 404', async () => {
  const {request} = await createInvoice({lnd: b.lnd, tokens: 500});
  return rejectsWith(
    tapass.payAssetInvoice({
      ...channelArgs,
      request,
      rfq_id: unknownHash,
      tapd: a.tapd,
    }),
    404,
    'AcceptedQuoteNotFoundForRfqId',
  );
});

await check('getAssetForwards: B forwarded no swaps', async () => {
  const {forwards} = await tapass.getAssetForwards({tapd: b.tapd});
  expect(!forwards.length, `got ${forwards.length} forwards`);
});

// Send the units of the payments back, so the channel stays usable
await check('sendAssetKeysend: B sends the units back to A', async () => {
  const res = await tapass.sendAssetKeysend({
    ...channelArgs,
    amount: String(1050 + Number(sellQuote.amount)),
    destination: a.info.public_key,
    tapd: b.tapd,
  });
  return {tokens: res.tokens};
});

// A tapd older than v0.8.0 does not have some RPCs
if (!!oldName) {
  const old = await connectTapd(oldName);

  await check(
    `getAssets: older tapd (${oldName}) by asset id is a 501`,
    async () => {
      return rejectsWith(
        tapass.getAssets({asset_id: asset.asset_id, tapd: old.tapd}),
        501,
        'ExpectedNewerTapdToGetAssetsByAssetId',
      );
    },
  );

  await check(
    `getAssetForwards: older tapd (${oldName}) is a 501`,
    async () => {
      return rejectsWith(
        tapass.getAssetForwards({tapd: old.tapd}),
        501,
        'GetAssetForwardsMethodNotSupported',
      );
    },
  );

  await check(
    `getAssetInvoices: older tapd (${oldName}) is a 501`,
    async () => {
      return rejectsWith(
        tapass.getAssetInvoices({tapd: old.tapd}),
        501,
        'ExpectedNewerTapdToGetAssetInvoices',
      );
    },
  );

  await check(
    `getAssetPayments: older tapd (${oldName}) is a 501`,
    async () => {
      return rejectsWith(
        tapass.getAssetPayments({tapd: old.tapd}),
        501,
        'ExpectedNewerTapdToGetAssetPayments',
      );
    },
  );

  // Make each subscription in its check, so that no error event is lost
  const unsupported = [
    {
      message: 'ExpectedNewerTapdToSubscribeToAssetInvoices',
      sub: () => tapass.subscribeToAssetInvoices({tapd: old.tapd}),
    },
    {
      message: 'ExpectedNewerTapdToSubscribeToAssetPayments',
      sub: () => tapass.subscribeToAssetPayments({tapd: old.tapd}),
    },
    {
      message: 'ExpectedNewerTapdToTrackAssetPayment',
      sub: () =>
        tapass.subscribeToPastAssetPayment({
          id: unknownHash,
          tapd: old.tapd,
        }),
    },
  ];

  for (const {message, sub} of unsupported) {
    await check(
      `subscriptions: older tapd (${oldName}) gives ${message}`,
      async () => {
        const events = record(sub(), []);
        const {data} = await waitFor('error event', async () =>
          events.find(n => n.name === 'error'),
        );
        expect(data[0] === 501 && data[1] === message, JSON.stringify(data));
      },
    );
  }
}

subscriptions.forEach(n => n.removeAllListeners());

const passed = results.filter(n => n.ok).length;
console.log(`\n${passed}/${results.length} passed`);
process.exit(passed === results.length ? 0 : 1);
