import * as React from "react";

import { updateMyProfile } from "@repo/api-contract";

import { useOnboarding } from "../context";
import { OptionList } from "../option-list";
import { StepLayout } from "../step-layout";

export function IntentStep() {
  const { me, options, accept, next } = useOnboarding();
  const [intent, setIntent] = React.useState<string | null>(
    me.profile.attributes.intent ?? null,
  );

  return (
    <StepLayout
      title="Bạn đang tìm kiếm điều gì?"
      canContinue={intent !== null}
      onContinue={async () => {
        accept(
          await updateMyProfile({ attributes: { ...me.profile.attributes, intent } }),
        );
        await next();
      }}
      skipLabel="Bỏ qua"
      onSkip={next}
    >
      <OptionList
        options={options.attributes.find((a) => a.key === "intent")?.options ?? []}
        value={intent}
        onChange={setIntent}
      />
    </StepLayout>
  );
}
