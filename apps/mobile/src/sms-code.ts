import { useEffect } from "react";

import { listenForSms } from "../modules/sms-consent";

/**
 * Fill the OTP from the SMS as it arrives (Android, after one consent tap).
 * `attempt` restarts the wait after a resend: each wait reads one message.
 */
export function useSmsCode(
  length: number,
  attempt: number,
  onCode: (code: string) => void,
) {
  useEffect(
    () =>
      listenForSms((message) => {
        const code = message.match(new RegExp(`\\b\\d{${length}}\\b`))?.[0];
        if (code) onCode(code);
      }),
    // onCode is a state setter in practice; restarting on its identity would
    // reopen the wait on every render.
    [length, attempt],
  );
}
