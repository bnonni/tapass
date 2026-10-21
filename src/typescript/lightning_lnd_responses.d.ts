declare module 'lightning/lnd_responses/index.js' {
  import type {DecodePaymentRequestResult} from 'lightning';
  import type {GetInvoicesResult} from 'lightning';
  import type {GetPaymentsResult} from 'lightning';
  import type {SubscribeToPastPaymentFailedEvent} from 'lightning';
  import type {SubscribeToPastPaymentPayingEvent} from 'lightning';

  /** Confirmed payment details from a SUCCEEDED lnrpc.Payment

    Throws when the payment has no successful HTLC
  */
  export function confirmedFromPayment(
    payment: unknown,
  ): import('./index.js').ConfirmedPayment;

  /** Failed payment details from a FAILED lnrpc.Payment */
  export function failureFromPayment(
    payment: unknown,
  ): SubscribeToPastPaymentFailedEvent;

  /** Payment request details from an lnrpc.PayReq */
  export function paymentRequestDetails(
    details: unknown,
  ): DecodePaymentRequestResult;

  /** Pending payment details from an IN_FLIGHT lnrpc.Payment

    Throws when the payment has no pending HTLC
  */
  export function pendingFromPayment(
    payment: unknown,
  ): SubscribeToPastPaymentPayingEvent;

  /** Invoice details from an lnrpc.Invoice */
  export function rpcInvoiceAsInvoice(
    invoice: unknown,
  ): GetInvoicesResult['invoices'][number];

  /** Payment details from an lnrpc.Payment */
  export function rpcPaymentAsPayment(
    payment: unknown,
  ): GetPaymentsResult['payments'][number];
}
