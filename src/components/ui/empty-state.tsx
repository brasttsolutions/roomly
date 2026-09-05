import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Diz por que está vazio e o que fazer em seguida. "Sem resultados" obriga a
 * pessoa a adivinhar qual filtro afrouxar.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-6 py-12 text-center",
        className,
      )}
    >
      {icon && (
        <span className="text-text-secondary" aria-hidden="true">
          {icon}
        </span>
      )}
      <h2 className="text-title3 font-bold">{title}</h2>
      <p className="max-w-prose text-subheadline text-text-secondary">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
