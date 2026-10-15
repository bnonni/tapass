const isTransactionId = (n: string) => /^[0-9a-f]{64}$/i.test(n);
const isVout = (n: string) => /^\d+$/.test(n);

/** Transaction id and output index from an outpoint string

  <Outpoint String> // txid:vout

  @throws
  <Error>

  @returns
  {
    transaction_id: <Transaction Id Hex String>
    transaction_vout: <Transaction Output Index Number>
  }
*/
export default (outpoint: string) => {
  const [id, vout, ...extra] = outpoint.split(':');

  if (!id || !isTransactionId(id) || !vout || !isVout(vout) || !!extra.length) {
    throw new Error('ExpectedOutpointWithTransactionIdAndOutputIndex');
  }

  return {transaction_id: id, transaction_vout: Number(vout)};
};
