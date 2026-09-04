import { cn } from "@/lib/utils";

/**
 * Reproduz a forma real do conteúdo que vai chegar. Skeleton genérico causa
 * mais salto de layout do que evita. O brilho respeita `prefers-reduced-motion`
 * pela regra global do `globals.css`.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-surface-sunken",
        className,
      )}
    />
  );
}

/** Anuncia o carregamento uma vez, sem despejar cada bloco no leitor. */
export function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-label={label}>
      {children}
    </div>
  );
}
