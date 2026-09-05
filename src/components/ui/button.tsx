import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** `primary` só uma vez por tela. `destructive` exige confirmação antes. */
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "destructive"
    | "link"
    | "icon";
  /** `md` é o padrão e cumpre o alvo de 44px da WCAG 2.5.8. */
  size?: "sm" | "md" | "lg" | "icon";
  /** Mantém a largura de repouso e anuncia `aria-busy` enquanto processa. */
  loading?: boolean;
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  ...props
}: Props) {
  return (
    <button
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold",
        "transition-colors disabled:cursor-not-allowed disabled:opacity-50",

        // O primário CLAREIA ao interagir. Escurecer o coral derrubaria o
        // contraste com o rótulo navy de 4,70 para 2,97 e reprovaria em AA.
        variant === "primary" &&
          "bg-action-primary text-text-on-accent hover:bg-action-primary-hover active:bg-action-primary-active",
        variant === "secondary" &&
          "border border-border-control bg-surface-raised text-text-primary hover:bg-surface-page",
        variant === "ghost" &&
          "text-text-primary hover:bg-surface-page active:bg-surface-sunken",
        variant === "destructive" &&
          "bg-danger-action text-text-inverse hover:brightness-90 active:brightness-75",
        variant === "link" &&
          "text-text-link underline-offset-4 hover:underline",
        variant === "icon" &&
          "text-text-primary hover:bg-surface-page active:bg-surface-sunken",

        size === "sm" && "h-9 px-3 text-footnote",
        size === "md" && "h-11 px-4 text-callout",
        size === "lg" && "h-13 px-6 text-body",
        size === "icon" && "size-11 rounded-full p-0",
        variant === "link" && "h-auto p-0",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
