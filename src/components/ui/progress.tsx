import { cn } from "@/lib/utils";

/**
 * Trilho de 4px com preenchimento no acento. O valor vem sempre acompanhado de
 * texto: uma barra sozinha não diz quanto.
 */
export function Progress({
  value,
  max = 100,
  label,
  className,
}: {
  value: number;
  max?: number;
  /** Descreve o que a barra mede, para o leitor de tela. */
  label: string;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <span
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn(
        "block h-1 w-20 overflow-hidden rounded-full bg-surface-sunken",
        className,
      )}
    >
      <span
        className="block h-full rounded-full bg-action-primary"
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}
