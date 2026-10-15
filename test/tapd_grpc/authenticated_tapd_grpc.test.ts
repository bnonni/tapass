import {deepStrictEqual} from 'node:assert/strict';
import {equal} from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import test from 'node:test';

import {authenticatedTapdGrpc} from '../../src/index.js';

const protosPath = fileURLToPath(new URL('../../protos/', import.meta.url));

// One method of each service shows that its proto file loaded
const expectedMethods = {
  assetwallet: 'fundVirtualPsbt',
  default: 'newAddr',
  mailbox: 'sendMessage',
  mint: 'mintAsset',
  rfq: 'addAssetBuyOrder',
  tapchannel: 'fundChannel',
  tapdev: 'importProof',
  universe: 'multiverseRoot',
};

const tests = [
  {
    args: {macaroon: Buffer.alloc(1).toString('hex')},
    description: 'An authenticated tapd gRPC Object is returned',
  },
  {
    args: {cert: '00', macaroon: Buffer.alloc(1).toString('hex')},
    description: 'Passing a cert for the authenticated tapd gRPC is supported',
  },
  {
    args: {path: protosPath},
    description: 'The path can be specified',
  },
];

tests.forEach(({args, description}) => {
  return test(description, () => {
    const {tapd} = authenticatedTapdGrpc(args);

    deepStrictEqual(
      Object.keys(tapd).sort(),
      Object.keys(expectedMethods).sort(),
      'Got services',
    );

    Object.entries(expectedMethods).forEach(([type, method]) => {
      const service = tapd[type as keyof typeof tapd];

      equal(typeof service[method], 'function', `Got ${type}.${method}`);
    });

    return;
  });
});
