declare module 'asyncjs-util' {
  /** Return a specific result of an async/auto process

    Omit a cbk and specify reject/resolve if using a Promise
  */
  export function returnResult<TResult>(
    args: {
      of?: string;
      reject?: (err: unknown) => void;
      resolve?: (res: TResult) => void;
    },
    cbk?: (err: any, res?: TResult) => void,
  ): (err: any, res?: any) => void;
}
