import {confirmedFromPayment} from 'lightning/lnd_responses/index.js';

import type {AuthenticatedTapd} from '../../tapd_grpc/index.js';
import {isConnectionFailure} from '../../tapd_requests/index.js';
import {isPermissionDenied} from '../../tapd_requests/index.js';
import {assetChannelRpcError} from '../../tapd_responses/index.js';
import {rpcSellQuoteAsQuote} from '../../tapd_responses/index.js';
import type {SellQuote} from '../../tapd_responses/index.js';
import type {ConfirmedPayment} from '../../typescript/index.js';
import type {TapdError} from '../../typescript/index.js';

const {isArray} = Array;
const failedText = /payment failed: (FAILURE_REASON_[A-Z_]+)/;
// The errors are the same as the payment errors of lightning
const failureErrors: Record<string, string> = {
  FAILURE_REASON_CANCELED: 'PaymentExecutionCanceled',
  FAILURE_REASON_INCORRECT_PAYMENT_DETAILS: 'PaymentRejectedByDestination',
  FAILURE_REASON_INSUFFICIENT_BALANCE: 'InsufficientBalanceToAttemptPayment',
  FAILURE_REASON_NO_ROUTE: 'PaymentPathfindingFailedToFindPossibleRoute',
  FAILURE_REASON_TIMEOUT: 'PaymentAttemptsTimedOut',
};
const failedStatus = 'FAILED';
const genericFailure = 'FailedToFindPayableRouteToDestination';
const method = 'sendPayment';
const succeededStatus = 'SUCCEEDED';
const type = 'tapchannel';

type Args = {
  /** Method Name For Error Messages */
  name: string;
  /** tapchannel SendPayment Request Object */
  request: object;
  /** Authenticated tapd API Object */
  tapd: AuthenticatedTapd;
};

export type SendAssetPaymentResult = ConfirmedPayment & {
  quotes: SellQuote[];
};

/** Error for a failed payment

  <Payment Failure Reason String>

  @returns
  <Error Array>
*/
const failureError = (reason: string): TapdError => {
  return [503, failureErrors[reason] || genericFailure];
};

/** Send a tapd asset payment and wait for the final payment state

  {
    name: <Method Name For Error Messages String>
    request: <tapchannel SendPayment Request Object>
    tapd: <Authenticated tapd API Object>
  }

  @returns via cbk
  {
    confirmed_at: <Payment Confirmed At ISO 8601 Date String>
    ...<lightning Confirmed Payment Object>
    quotes: [<Accepted Sell Quote Object>]
  }
*/
export default (
  {name, request, tapd}: Args,
  cbk: (err: TapdError | null, res?: SendAssetPaymentResult) => void,
) => {
  const quotes = new Map<string, SellQuote>();
  let isFinished = false;

  const finish = (err: TapdError | null, res?: SendAssetPaymentResult) => {
    // Exit early when the payment already has a result
    if (isFinished) {
      return;
    }

    isFinished = true;

    return cbk(err, res);
  };

  const addQuote = (quote: unknown) => {
    const mapped = rpcSellQuoteAsQuote(quote as any);

    quotes.set(mapped.id, mapped);
  };

  const sub = tapd[type][method](request);

  sub.on('data', (data: any) => {
    try {
      // The older field has the first quote, the newer field has all quotes
      if (!!data?.accepted_sell_order) {
        addQuote(data.accepted_sell_order);
      }

      if (isArray(data?.accepted_sell_orders?.accepted_sell_orders)) {
        data.accepted_sell_orders.accepted_sell_orders.forEach(addQuote);
      }

      const payment = data?.payment_result;

      // Exit early when there is no payment result in this update
      if (!payment) {
        return;
      }

      if (payment.status === failedStatus) {
        return finish(failureError(payment.failure_reason));
      }

      // Exit early when the payment is not final yet
      if (payment.status !== succeededStatus) {
        return;
      }

      return finish(null, {
        ...confirmedFromPayment(payment),
        quotes: [...quotes.values()],
      });
    } catch (err: any) {
      return finish([503, err.message]);
    }
  });

  sub.on('end', () => {
    return finish([503, `UnexpectedEndOfPaymentUpdatesTo${name}`]);
  });

  sub.on('error', (err: any) => {
    if (isConnectionFailure({err})) {
      return finish([503, `FailedToConnectToTapdTo${name}`]);
    }

    if (isPermissionDenied({err})) {
      return finish([403, `PermissionDeniedTo${name}`]);
    }

    const failed = String(err?.details).match(failedText);

    if (!!failed) {
      return finish(failureError(failed[1]));
    }

    const knownError = assetChannelRpcError({err});

    if (!!knownError) {
      return finish(knownError);
    }

    return finish([503, `UnexpectedErrorIn${name}`, {err}]);
  });

  return;
};
