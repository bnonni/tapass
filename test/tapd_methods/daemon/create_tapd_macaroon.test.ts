import {deepStrictEqual} from 'node:assert/strict';
import {rejects} from 'node:assert/strict';
import test from 'node:test';

import {createTapdMacaroon} from '../../../src/index.js';
import type {AuthenticatedTapd} from '../../../src/index.js';

const permissions = [{action: 'read', entity: 'assets'}];

const tapdWith = (bakeMacaroon: (req: any, cbk: Function) => void) => {
  return {default: {bakeMacaroon}} as unknown as AuthenticatedTapd;
};

const failWith = (details: string) =>
  tapdWith((_, cbk) => cbk({code: 2, details}));

const tapd = tapdWith((_, cbk) => cbk(null, {macaroon: '0201'}));

const tests = [
  {
    args: {permissions: [], tapd},
    description: 'Permissions are expected',
    error: [400, 'ExpectedPermissionsToCreateTapdMacaroon'],
  },
  {
    args: {permissions: [{action: 'read'} as any], tapd},
    description: 'An action and an entity are expected',
    error: [400, 'ExpectedActionAndEntityForTapdPermission'],
  },
  {
    args: {permissions, root_key_id: '-1', tapd},
    description: 'A numeric root key id is expected',
    error: [400, 'ExpectedNumericRootKeyIdToCreateTapdMacaroon'],
  },
  {
    args: {permissions, tapd: {} as AuthenticatedTapd},
    description: 'An authenticated tapd is expected',
    error: [400, 'ExpectedAuthenticatedTapdToCreateTapdMacaroon'],
  },
  {
    args: {
      permissions,
      tapd: tapdWith((_, cbk) => cbk({code: 14, details: 'unavailable'})),
    },
    description: 'A connection failure is returned',
    error: [503, 'FailedToConnectToTapdToCreateTapdMacaroon'],
  },
  {
    args: {permissions, tapd: failWith('permission denied')},
    description: 'A permission failure is returned',
    error: [403, 'PermissionDeniedToCreateTapdMacaroon'],
  },
  {
    args: {permissions, tapd: failWith('invalid permission entity. help')},
    description: 'An unknown permission is returned',
    error: [400, 'ExpectedKnownPermissionsForTapdMacaroon'],
  },
  {
    args: {permissions, tapd: failWith('unsupported permission pair. help')},
    description: 'An unsupported permission pair is returned',
    error: [400, 'ExpectedKnownPermissionsForTapdMacaroon'],
  },
  {
    args: {
      permissions,
      tapd: failWith(
        'macaroon authentication disabled, remove --no-macaroons flag',
      ),
    },
    description: 'Macaroons that are off in tapd are returned',
    error: [501, 'MacaroonsAreDisabledInTapd'],
  },
  {
    args: {permissions, tapd: tapdWith((_, cbk) => cbk('err'))},
    description: 'An unexpected error is returned',
    error: [503, 'UnexpectedErrorCreatingTapdMacaroon', {err: 'err'}],
  },
  {
    args: {
      permissions,
      tapd: tapdWith((_, cbk) => cbk(null, {macaroon: 'mac'})),
    },
    description: 'A hex macaroon is expected',
    error: [503, 'ExpectedHexMacaroonInBakeMacaroonResponse'],
  },
];

tests.forEach(({args, description, error}) => {
  return test(description, async () => {
    await rejects(createTapdMacaroon(args), error, 'Got expected error');
  });
});

test('A macaroon is returned as base64', async () => {
  const {macaroon} = await createTapdMacaroon({permissions, tapd});

  deepStrictEqual(macaroon, Buffer.from('0201', 'hex').toString('base64'));
});

test('The request has the permissions and the root key id', async () => {
  const requests: any[] = [];

  const tapd = tapdWith((req, cbk) => {
    requests.push(req);

    return cbk(null, {macaroon: '0201'});
  });

  await createTapdMacaroon({permissions, tapd});

  await createTapdMacaroon({
    is_external_allowed: true,
    permissions: [{action: '/taprpc.TaprootAssets/ListAssets', entity: 'uri'}],
    root_key_id: '7',
    tapd,
  });

  deepStrictEqual(requests, [
    {
      allow_external_permissions: false,
      permissions: [{action: 'read', entity: 'assets'}],
      root_key_id: '0',
    },
    {
      allow_external_permissions: true,
      permissions: [
        {action: '/taprpc.TaprootAssets/ListAssets', entity: 'uri'},
      ],
      root_key_id: '7',
    },
  ]);
});
