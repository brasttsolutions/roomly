import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Estado sempre com texto. Um badge que é só um ponto colorido não comunica
 * nada para quem não distingue as cores (WCAG 1.4.1).
 */
export type BadgeTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent";

export function Badge({
  children,
  tone = "neutral",
  className,
  ...props
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-caption font-semibold",
        tone === "neutral" && "bg-surface-sunken text-text-secondary",
        tone === "success" && "bg-success-surface text-success-text",
        tone === "warning" && "bg-warning-surface text-warning-text",
        tone === "danger" && "bg-danger-surface text-danger-text",
        tone === "info" && "bg-info-surface text-info-text",
        tone === "accent" && "bg-surface-accent-subtle text-text-primary",
        className,
      )}
    >
      {children}
    </span>
  );
}
