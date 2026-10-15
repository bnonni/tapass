import type {EventEmitter} from 'node:events';

import {confirmedFromPayment} from 'lightning/lnd_responses/index.js';
import {failureFromPayment} from 'lightning/lnd_responses/index.js';
import {pendingFromPayment} from 'lightning/lnd_responses/index.js';

import {rpcAssetAmountAsAmount} from '../../tapd_responses/index.js';

const confirmedStatus = 'SUCCEEDED';
const failedStatus = 'FAILED';
const {isArray} = Array;
const pendingStatus = 'IN_FLIGHT';

type Args = {
  /** RPC Asset Payment Object */
  data: any;
  /** Event Emitter Object */
  emitter: EventEmitter;
  /** Emit Error Function */
  emitError: (err: unknown) => void;
};

/** Emit an asset payment update as a lightning payment event

  The events are the same as in lightning subscribeToPastPayment, with the
  asset amounts of the payment added as `assets`

  {
    data: {
      asset_amounts: [<RPC Asset Amount Object>]
      payment: <RPC lnd Payment Object>
    }
    emitter: <Event Emitter Object>
    emitError: <Emit Error Function>
  }

  @event 'confirmed'
  @event 'failed'
  @event 'paying'
*/
export default ({data, emitter, emitError}: Args) => {
  try {
    if (!data || !isArray(data.asset_amounts) || !data.payment) {
      throw new Error('ExpectedRpcAssetPaymentInPaymentUpdate');
    }

    const assets = data.asset_amounts.map(rpcAssetAmountAsAmount);
    const {payment} = data;

    switch (payment.status) {
      case confirmedStatus:
        return emitter.emit('confirmed', {
          ...confirmedFromPayment(payment),
          assets,
        });

      case failedStatus:
        return emitter.emit('failed', {...failureFromPayment(payment), assets});

      case pendingStatus:
        // Exit early when no HTLC is in flight
        if (!isArray(payment.htlcs)) {
          return;
        }

        if (!payment.htlcs.some((n: any) => n.status === pendingStatus)) {
          return;
        }

        return emitter.emit('paying', {...pendingFromPayment(payment), assets});

      default:
        return;
    }
  } catch (err: any) {
    return emitError([503, err.message]);
  }
};
