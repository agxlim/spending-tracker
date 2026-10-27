import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Checkbox({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      className={cn("size-5 shrink-0 rounded border-input accent-primary focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    />
  );
}
