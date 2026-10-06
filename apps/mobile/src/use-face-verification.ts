import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCameraPermissions } from "expo-camera";
import * as React from "react";

import {
  createVerificationChallenge,
  meQuery,
  recordVerificationConsent,
  submitVerification,
} from "@repo/api-contract";
import type { ChallengeRead } from "@repo/api-contract";

import { uploadLocalFile } from "@/upload-media";

export type VerificationPhase = "intro" | "camera" | "sending" | "waiting";

const POLL_MS = 2000;

/**
 * The face verification flow without its screens: consent, camera permission
 * through the system dialog, the challenge, uploading the frames, and polling
 * until the server has a verdict.
 */
export function useFaceVerification() {
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = React.useState<VerificationPhase>("intro");
  const [challenge, setChallenge] = React.useState<ChallengeRead | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [cameraBlocked, setCameraBlocked] = React.useState(false);

  const { data } = useQuery({
    ...meQuery(),
    refetchInterval: (query) =>
      phase === "waiting" && query.state.data?.account?.verification.status === "pending"
        ? POLL_MS
        : false,
  });
  const verification = data?.account?.verification;
  const status = verification?.status;

  React.useEffect(() => {
    if (phase === "waiting" && status && status !== "pending") setPhase("intro");
  }, [phase, status]);

  async function start() {
    setError(null);
    setCameraBlocked(false);
    // Only a permanent refusal needs our help; otherwise the system dialog asks.
    const granted = permission?.granted || (await requestPermission()).granted;
    if (!granted) {
      setCameraBlocked(true);
      return;
    }
    try {
      // Pressing "Bắt đầu" under the consent line is the consent.
      if (!verification?.consented) await recordVerificationConsent();
      setChallenge(await createVerificationChallenge());
      setPhase("camera");
    } catch {
      setError("Chưa bắt đầu được. Thử lại sau ít phút.");
    }
  }

  async function send(uris: string[]) {
    if (!challenge) return;
    setPhase("sending");
    try {
      const mediaIds: string[] = [];
      for (const uri of uris) {
        mediaIds.push(await uploadLocalFile(uri, "image/jpeg", "private"));
      }
      await submitVerification({
        challengeId: challenge.challengeId,
        // One frame per action; the challenge always has three.
        mediaIds: mediaIds as [string, string, string],
      });
      await queryClient.invalidateQueries({ queryKey: meQuery().queryKey });
      setPhase("waiting");
    } catch {
      setError("Không gửi được ảnh. Kiểm tra kết nối rồi thử lại.");
      setPhase("intro");
    }
  }

  function cancelCamera(message?: string) {
    if (message) setError(message);
    setPhase("intro");
  }

  return {
    phase,
    challenge,
    error,
    cameraBlocked,
    verification,
    start,
    send,
    cancelCamera,
  };
}
