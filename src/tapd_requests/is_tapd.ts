type Args = {
  method: string;
  tapd?: unknown;
  type: string;
};

/** Determine if object is an expected tapd Object

  {
    method: <Method Name String>
    [tapd]: <tapd Object>
    type: <Method Type String>
  }

  @returns
  <Is Expected tapd Object Bool>
*/
export default ({method, tapd, type}: Args) => {
  const service = (tapd as Record<string, Record<string, unknown>>)?.[type];

  return !!service && typeof service[method] === 'function';
};
