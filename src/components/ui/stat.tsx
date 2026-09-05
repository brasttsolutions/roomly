import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Rótulo, valor e — quando existe — variação. A seta **e** o sinal andam juntos
 * de propósito: quem não distingue verde de vermelho precisa dos dois para ler
 * a direção.
 */
export function Stat({
  label,
  value,
  hint,
  delta,
  className,
}: {
  label: string;
  value: string;
  /** Uma linha explicando de onde o número vem. */
  hint?: string;
  /** Variação em pontos percentuais. Positivo sobe, negativo desce. */
  delta?: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-surface-raised p-5", className)}>
      <p className="text-caption font-bold uppercase text-text-secondary">
        {label}
      </p>
      <div className="mt-3 flex flex-wrap items-baseline gap-2">
        <strong className="text-title1 tabular-nums">{value}</strong>
        {delta !== undefined && <Delta value={delta} />}
      </div>
      {hint && <p className="mt-1 text-caption text-text-secondary">{hint}</p>}
    </div>
  );
}

function Delta({ value }: { value: number }) {
  const up = value >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-caption font-bold tabular-nums",
        up ? "text-success-text" : "text-danger-text",
      )}
    >
      <Icon size={14} aria-hidden="true" />
      {up ? "+" : "−"}
      {Math.abs(value)}%
    </span>
  );
}

/** Grade de estatísticas com divisores de 1px, sem borda dupla entre células. */
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "grid gap-px overflow-hidden rounded-lg border border-border-subtle bg-border-subtle sm:grid-cols-2 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </section>
  );
}
