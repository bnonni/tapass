import type {TapdError} from '../../typescript/index.js';
import type {AssetPaymentRequestArgs} from './asset_payment_request.js';

const isAssetId = (n: string) => /^[0-9A-F]{64}$/i.test(n);
const isNumeric = (n: unknown) => typeof n === 'string' && /^\d+$/.test(n);
const isPublicKey = (n: string) => /^0[23][0-9A-F]{64}$/i.test(n);
const {isSafeInteger} = Number;
const maxMetadataBytes = 32768;

/** Error for arguments of an asset payment that are not valid

  {
    args: <Asset Payment Request Arguments Object>
    name: <Method Name For Error Messages String>
  }

  @returns
  <Error Array> or <Undefined> // when the arguments are valid
*/
export default ({
  args,
  name,
}: {
  args: AssetPaymentRequestArgs;
  name: string;
}) => {
  if (!args.asset_id && !args.group_key) {
    return [400, `ExpectedAssetIdOrGroupKeyTo${name}`] as TapdError;
  }

  if (!!args.asset_id && !!args.group_key) {
    return [400, `UnexpectedAssetIdAndGroupKeyTo${name}`] as TapdError;
  }

  if (!!args.asset_id && !isAssetId(args.asset_id)) {
    return [400, `ExpectedAssetIdHexTo${name}`] as TapdError;
  }

  if (!!args.group_key && !isPublicKey(args.group_key)) {
    return [400, `ExpectedGroupKeyHexTo${name}`] as TapdError;
  }

  if (args.max_fee !== undefined && args.max_fee_mtokens !== undefined) {
    return [400, `ExpectedEitherMaxFeeOrMaxFeeMtokensTo${name}`] as TapdError;
  }

  const maxFee = args.max_fee;

  if (maxFee !== undefined && (!isSafeInteger(maxFee) || maxFee < 0)) {
    return [400, `ExpectedMaxFeeTokensTo${name}`] as TapdError;
  }

  if (!!args.max_fee_mtokens && !isNumeric(args.max_fee_mtokens)) {
    return [400, `ExpectedMaxFeeMillitokensTo${name}`] as TapdError;
  }

  const paths = args.max_paths;

  if (paths !== undefined && (!isSafeInteger(paths) || paths < 1)) {
    return [400, `ExpectedMaxPathsCountTo${name}`] as TapdError;
  }

  const timeout = args.pathfinding_timeout;

  if (timeout !== undefined && (!isSafeInteger(timeout) || timeout < 0)) {
    return [
      400,
      `ExpectedPathfindingTimeoutMillisecondsTo${name}`,
    ] as TapdError;
  }

  if (!!args.peer_public_key && !isPublicKey(args.peer_public_key)) {
    return [400, `ExpectedPeerPublicKeyHexTo${name}`] as TapdError;
  }

  const metadata = args.price_oracle_metadata || '';

  if (Buffer.byteLength(metadata) > maxMetadataBytes) {
    return [400, `ExpectedShorterPriceOracleMetadataTo${name}`] as TapdError;
  }

  return undefined;
};
