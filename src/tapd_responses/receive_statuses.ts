/** Receive status types by tapd address event status */
export default {
  ADDR_EVENT_STATUS_COMPLETED: 'completed',
  ADDR_EVENT_STATUS_PROOF_RECEIVED: 'proof_received',
  ADDR_EVENT_STATUS_TRANSACTION_CONFIRMED: 'transaction_confirmed',
  ADDR_EVENT_STATUS_TRANSACTION_DETECTED: 'transaction_detected',
  ADDR_EVENT_STATUS_UNKNOWN: 'unknown',
} as Record<string, string>;
