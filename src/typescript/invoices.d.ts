declare module 'invoices' {
  /** Parse a BOLT 11 payment request

    Throws when the payment request is not valid
  */
  export function parsePaymentRequest(args: {request: string}): {
    /** Fallback Chain Addresses */
    chain_addresses?: string[];
    /** CLTV Delta */
    cltv_delta: number;
    /** Created At ISO 8601 Date */
    created_at: string;
    /** Description */
    description?: string;
    /** Description Hash Hex */
    description_hash?: string;
    /** Destination Public Key Hex */
    destination: string;
    /** Expires At ISO 8601 Date */
    expires_at: string;
    /** Payment Hash Hex */
    id: string;
    /** Requested Millitokens */
    mtokens: string;
    /** Payment Identifier Hex */
    payment?: string;
    /** Requested Tokens Rounded Down */
    tokens: number;
  };
}
