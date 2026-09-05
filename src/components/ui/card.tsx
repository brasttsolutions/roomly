import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A mesma casca aparecia com a mesma string de classes em quinze arquivos. Um
 * componente acaba com a divergência: quando o raio ou a borda mudarem, mudam
 * em um lugar.
 */
export function Card({
  children,
  className,
  padding = "md",
  as: Tag = "div",
  ...props
}: {
  children: ReactNode;
  className?: string;
  /** `none` para quem tem cabeçalho e corpo com divisores próprios. */
  padding?: "none" | "sm" | "md";
  /** `section` ou `article` quando o card é uma região com rótulo próprio. */
  as?: "div" | "section" | "article";
} & HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      {...props}
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-raised",
        padding === "sm" && "p-4",
        padding === "md" && "p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </Tag>
  );
}

/** Cabeçalho com divisor. Só existe dentro de um `Card` com `padding="none"`. */
export function CardHeader({
  title,
  hint,
  action,
  id,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  /** Para o `aria-labelledby` de quem envolve o card numa `section`. */
  id?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle p-5">
      <div>
        <h2 id={id} className="font-bold">
          {title}
        </h2>
        {hint && (
          <p className="mt-1 text-caption text-text-secondary">{hint}</p>
        )}
      </div>
      {action}
    </div>
  );
}
