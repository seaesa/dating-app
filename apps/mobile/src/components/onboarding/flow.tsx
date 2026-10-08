import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import * as React from "react";

import {
  completeMyOnboarding,
  firstMissingStep,
  meQuery,
  ONBOARDING_STEPS,
} from "@repo/api-contract";
import type { OnboardingStep, ProfileOptionsRead, UserRead } from "@repo/api-contract";
import { useAuthStore } from "@repo/store";

import { OnboardingContext, type OnboardingContextValue } from "./context";
import { AboutStep } from "./steps/about-step";
import { BasicsStep } from "./steps/basics-step";
import { FamilyStep } from "./steps/family-step";
import { HabitsStep } from "./steps/habits-step";
import { IntentStep } from "./steps/intent-step";
import { InterestsStep } from "./steps/interests-step";
import { PhotosStep } from "./steps/photos-step";
import { ShowMeStep } from "./steps/show-me-step";

import { askForLocation } from "@/location-access";
import { askForNotifications } from "@/notification-access";

const STEPS: Record<OnboardingStep, React.ComponentType> = {
  basics: BasicsStep,
  showMe: ShowMeStep,
  intent: IntentStep,
  photos: PhotosStep,
  about: AboutStep,
  habits: HabitsStep,
  family: FamilyStep,
  interests: InterestsStep,
};

export interface OnboardingFlowProps {
  initialMe: UserRead;
  options: ProfileOptionsRead;
}

/** Required answers first, then optional details; resumes where it left off. */
export function OnboardingFlow({ initialMe, options }: OnboardingFlowProps) {
  const queryClient = useQueryClient();
  const completeLocally = useAuthStore((s) => s.completeOnboarding);
  const [me, setMe] = React.useState(initialMe);
  const [step, setStep] = React.useState<OnboardingStep>(
    () => firstMissingStep(initialMe) ?? "interests",
  );
  const index = ONBOARDING_STEPS.indexOf(step);

  const value = React.useMemo<OnboardingContextValue>(() => {
    const accept = (next: UserRead) => {
      setMe(next);
      queryClient.setQueryData(meQuery().queryKey, next);
    };

    const finish = async () => {
      // System dialogs only, as the user enters the app. A refusal still lets
      // them in; features that need the location ask again there. The fix
      // itself is stored by useLocationRefresh, so a slow GPS never holds this.
      await askForLocation();
      await askForNotifications();
      const done = await completeMyOnboarding();
      // Clear the local flag before the cache says "active": the other way
      // round, (onboarding) and (app) redirect to each other in a loop.
      await completeLocally();
      accept(done);
      router.replace("/(app)/(tabs)/profile");
    };

    const next = async () => {
      const following = ONBOARDING_STEPS[index + 1];
      if (following) setStep(following);
      else await finish();
    };

    const previous = ONBOARDING_STEPS[index - 1];
    return {
      me,
      options,
      accept,
      next,
      finish,
      back: previous ? () => setStep(previous) : null,
      index,
      total: ONBOARDING_STEPS.length,
    };
  }, [me, options, index, queryClient, completeLocally]);

  const Step = STEPS[step];
  return (
    <OnboardingContext.Provider value={value}>
      {/* Keyed so a step's local answers reset when it is entered again. */}
      <Step key={step} />
    </OnboardingContext.Provider>
  );
}
