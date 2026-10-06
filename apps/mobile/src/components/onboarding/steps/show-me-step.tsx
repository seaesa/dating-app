import * as React from "react";

import { defaultCriteria, updateMyCriteria } from "@repo/api-contract";
import type { Gender } from "@repo/api-contract";

import { useOnboarding } from "../context";
import { OptionList } from "../option-list";
import { StepLayout } from "../step-layout";

const SHOW_ME: { value: string; label: string; icon: string; genders: Gender[] }[] = [
  { value: "female", label: "Nữ", icon: "👩", genders: ["female"] },
  { value: "male", label: "Nam", icon: "👨", genders: ["male"] },
  {
    value: "all",
    label: "Tất cả mọi người",
    icon: "💫",
    genders: ["female", "male", "other"],
  },
];

export function ShowMeStep() {
  const { me, accept, next } = useOnboarding();
  const saved = me.account?.criteria?.genders ?? [];
  const [choice, setChoice] = React.useState<string | null>(
    () =>
      SHOW_ME.find(
        (o) =>
          o.genders.length === saved.length && o.genders.every((g) => saved.includes(g)),
      )?.value ?? null,
  );

  return (
    <StepLayout
      title="Bạn muốn gặp ai?"
      canContinue={choice !== null}
      onContinue={async () => {
        const genders = SHOW_ME.find((o) => o.value === choice)?.genders ?? [];
        // Age range and distance start from defaults, changed later in the filters.
        accept(
          await updateMyCriteria({
            ...(me.account?.criteria ?? defaultCriteria(me, genders)),
            genders,
          }),
        );
        await next();
      }}
    >
      <OptionList options={SHOW_ME} value={choice} onChange={setChoice} />
    </StepLayout>
  );
}
