import * as React from "react";

import { ProfileStep } from "../profile-step";

export function AboutStep() {
  return (
    <ProfileStep
      title="Thêm về bạn"
      fields={[
        { key: "height" },
        { key: "education", field: "education" },
        { key: "industry", field: "industry" },
        { key: "hometown" },
      ]}
    />
  );
}
