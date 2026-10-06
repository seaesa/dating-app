import * as React from "react";

import { cn, Input } from "@repo/ui";

/** A text input that matches DatePickerInput and SelectPicker, so forms line up. */
export function TextField({ className, ...props }: React.ComponentProps<typeof Input>) {
  return (
    <Input
      className={cn(
        "h-14 rounded-2xl border border-border bg-secondary/50 px-4 py-0 text-base font-medium shadow-none",
        className,
      )}
      {...props}
    />
  );
}
