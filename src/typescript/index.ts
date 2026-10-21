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

type PaymentHop = {
  /** Standard Format Channel Id */
  channel: string;
  /** Fee Tokens Rounded Down */
  fee: number;
  /** Fee Millitokens */
  fee_mtokens: string;
  /** Forward Tokens */
  forward: number;
  /** Forward Millitokens */
  forward_mtokens: string;
  /** Public Key Hex */
  public_key: string;
  /** Timeout Block Height */
  timeout?: number;
};

type PaymentPath = {
  /** Total Fee Tokens Paid Rounded Down */
  fee: number;
  /** Total Fee Millitokens Paid */
  fee_mtokens: string;
  hops: PaymentHop[];
  /** Total Millitokens Paid */
  mtokens: string;
  /** Payment Identifier Hex */
  payment?: string;
  /** Expiration Block Height */
  timeout?: number;
  /** Total Tokens Paid Rounded Down */
  tokens: number;
  /** Total Payment Millitokens */
  total_mtokens?: string;
};

/** The result of the lightning confirmedFromPayment response mapper */
export type ConfirmedPayment = {
  /** Payment Confirmed At ISO 8601 Date */
  confirmed_at: string;
  /** Payment Created At ISO 8601 Date */
  created_at: string;
  /** Payment Destination Public Key Hex */
  destination: string;
  /** Total Fee Tokens Paid Rounded Down */
  fee: number;
  /** Total Fee Millitokens Paid */
  fee_mtokens: string;
  hops: PaymentHop[];
  /** Payment Hash Hex */
  id: string;
  /** Payment Index Number String */
  index: string;
  /** Total Millitokens Paid */
  mtokens: string;
  paths: PaymentPath[];
  /** BOLT 11 Payment Request */
  request?: string;
  /** Total Fee Tokens Paid Rounded Up */
  safe_fee: number;
  /** Total Tokens Paid Rounded Up */
  safe_tokens: number;
  /** Payment Preimage Hex */
  secret: string;
  /** Expiration Block Height */
  timeout: number;
  /** Total Tokens Paid Rounded Down */
  tokens: number;
};
