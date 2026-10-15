/** Mint batch state names for the tapd batch states */
export default {
  BATCH_STATE_BROADCAST: 'broadcast',
  BATCH_STATE_COMMITTED: 'committed',
  BATCH_STATE_CONFIRMED: 'confirmed',
  BATCH_STATE_FINALIZED: 'finalized',
  BATCH_STATE_FROZEN: 'frozen',
  BATCH_STATE_PENDING: 'pending',
  BATCH_STATE_SEEDLING_CANCELLED: 'seedling_cancelled',
  BATCH_STATE_SPROUT_CANCELLED: 'sprout_cancelled',
  BATCH_STATE_UNKNOWN: 'unknown',
} as Record<string, string>;
