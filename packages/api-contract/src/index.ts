import { client } from "./generated/client.gen";
import { attachInterceptors, type InterceptorOptions } from "./interceptors";

export * from "./generated/@tanstack/react-query.gen";
export * from "./generated/sdk.gen";
export * from "./generated/types.gen";
export * from "./generated/zod.gen";
export { attachInterceptors, REFRESH_PATH } from "./interceptors";
export {
  MIN_AGE,
  parseProfileForm,
  type ProfileFormResult,
  type ProfileFormValues,
} from "./forms";
export { createQueryClient, GC_TIME_MS, PRESIGN_TTL_MS } from "./query";
export type { TokenPairValue, TokenProvider } from "./tokens";

/** Call once at app startup, before any query runs. */
export function configureApiClient(
  options: InterceptorOptions & { baseURL?: string },
): void {
  if (options.baseURL) {
    client.setConfig({ baseURL: options.baseURL });
  }
  attachInterceptors(client.instance, options);
}

export { client };
