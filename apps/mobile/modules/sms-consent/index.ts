import { requireOptionalNativeModule } from "expo";

type SmsConsentEvents = {
  onMessage: (event: { message: string }) => void;
  onEnd: (event: { reason: "declined" | "timeout" | "unavailable" }) => void;
};

interface SmsConsentModule {
  start(): Promise<void>;
  stop(): void;
  addListener<E extends keyof SmsConsentEvents>(
    event: E,
    listener: SmsConsentEvents[E],
  ): { remove(): void };
}

// Android only; null on iOS (which autofills codes by itself) and on web.
const native = requireOptionalNativeModule<SmsConsentModule>("SmsConsent");

/**
 * Wait for the next SMS, ask the user once for consent to read it, and hand
 * the text back. Returns a cleanup function. A no-op where unsupported.
 */
export function listenForSms(onMessage: (message: string) => void): () => void {
  if (!native) return () => undefined;
  const subscription = native.addListener("onMessage", (event) =>
    onMessage(event.message),
  );
  void native.start().catch(() => undefined);
  return () => {
    subscription.remove();
    native.stop();
  };
}
