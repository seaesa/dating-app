import * as React from "react";

import { ProfileStep } from "../profile-step";

export function FamilyStep() {
  return (
    <ProfileStep
      title="Gia đình & niềm tin"
      fields={[
        { key: "has_children", field: "hasChildren" },
        { key: "wants_children", field: "wantsChildren" },
        { key: "religion" },
      ]}
    />
  );
}
