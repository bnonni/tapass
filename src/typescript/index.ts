import type {AuthenticatedTapd} from '../tapd_grpc/types.js';

/** [Status Code Number, Error Message String, Error Details Object] */
export type TapdError<TDetails = {err: unknown}> =
  | [number, string]
  | [number, string, TDetails];

export type TapdCallback<TResult> = (
  err: TapdError | null | undefined,
  res?: TResult,
) => void;

/** A method returns a Promise, or calls back when it gets a callback */
export type TapdMethod<TArgs, TResult> = {
  (args: TArgs): Promise<TResult>;
  (args: TArgs, cbk: TapdCallback<TResult>): void;
};

export type AuthenticatedTapdArgs<TArgs = object> = TArgs & {
  /** Authenticated tapd API Object */
  tapd: AuthenticatedTapd;
};
