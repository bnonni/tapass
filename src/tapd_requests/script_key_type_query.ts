const allTypes = 'all';
const types: Record<string, string> = {
  bip86: 'SCRIPT_KEY_BIP86',
  burn: 'SCRIPT_KEY_BURN',
  channel: 'SCRIPT_KEY_CHANNEL',
  script_path_external: 'SCRIPT_KEY_SCRIPT_PATH_EXTERNAL',
  tombstone: 'SCRIPT_KEY_TOMBSTONE',
  unique_pedersen: 'SCRIPT_KEY_UNIQUE_PEDERSEN',
};

/** Script key type query from a script key type

  When there is no type, tapd uses only BIP-86 script keys

  <Script Key Type String> // all, bip86, burn, channel, script_path_external,
                           // tombstone, unique_pedersen

  @throws
  <Error>

  @returns
  {
    [all_types]: <All Script Key Types Bool>
    [explicit_type]: <Script Key Type String>
  }
  or <Undefined> // when there is no type
*/
export default (type?: string) => {
  // Exit early when there is no type, tapd then uses only BIP-86 keys
  if (type === undefined) {
    return undefined;
  }

  // Exit early when the query is for each type of script key
  if (type === allTypes) {
    return {all_types: true};
  }

  if (!types[type]) {
    throw new Error('ExpectedKnownScriptKeyType');
  }

  return {explicit_type: types[type]};
};
