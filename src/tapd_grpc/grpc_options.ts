import type {Options} from '@grpc/proto-loader';

/** Proto loader options */
export default {
  defaults: true,
  enums: String,
  keepCase: true,
  longs: String,
  oneofs: true,
} satisfies Options;
