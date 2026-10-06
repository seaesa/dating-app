import * as React from "react";

import { ProfileStep } from "../profile-step";

export function HabitsStep() {
  return (
    <ProfileStep
      title="Thói quen của bạn"
      fields={[
        { key: "drinking", field: "drinking" },
        { key: "smoking", field: "smoking" },
        { key: "exercise", field: "exercise" },
        { key: "pets", field: "pets" },
      ]}
    />
  );
}
