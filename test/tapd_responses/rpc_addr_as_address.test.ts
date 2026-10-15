import {deepStrictEqual} from 'node:assert/strict';
import {throws} from 'node:assert/strict';
import test from 'node:test';

import {rpcAddrAsAddress} from '../../src/tapd_responses/index.js';
import {responses} from '../fixtures/tapd_responses.js';

const [rpcAddr] = responses.queryAddrs.addrs;

test('A real tapd address is mapped', () => {
  const address = rpcAddrAsAddress(rpcAddr);

  deepStrictEqual(address.address, rpcAddr.encoded);
  deepStrictEqual(address.amount, rpcAddr.amount);
  deepStrictEqual(address.asset_id, rpcAddr.asset_id.toString('hex'));
  deepStrictEqual(address.group_key, undefined);
  deepStrictEqual(address.is_collectible, false);
  deepStrictEqual(address.script_key, rpcAddr.script_key.toString('hex'));
  deepStrictEqual(typeof address.version, 'number');
});

test('Address details are expected', () => {
  throws(() => rpcAddrAsAddress(null), /ExpectedRpcAddressDetails/);
  throws(
    () => rpcAddrAsAddress({...rpcAddr, encoded: ''}),
    /ExpectedEncodedAddressInRpcAddress/,
  );
  throws(
    () => rpcAddrAsAddress({...rpcAddr, address_version: 'X'}),
    /ExpectedKnownVersionInRpcAddress/,
  );
});
