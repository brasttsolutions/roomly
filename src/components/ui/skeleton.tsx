import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * Reproduz a forma real do conteúdo que vai chegar. Skeleton genérico causa
 * mais salto de layout do que evita. O brilho respeita `prefers-reduced-motion`
 * pela regra global do `globals.css`.
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string;
  /** Só para dimensão calculada (a altura de uma barra), nunca para cor. */
  style?: CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={style}
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

/**
 * A faixa do cabeçalho do site enquanto a página chega. O `SiteHeader` de
 * verdade é assíncrono — ele espera a identidade —, então colocá-lo aqui
 * anularia o ganho: o esqueleto voltaria a depender da rede.
 */
export function SiteHeaderSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="sticky top-0 z-40 h-16 border-b border-border-subtle bg-surface-raised"
    />
  );
}

/** Olho-de-página, título e subtítulo: a abertura repetida de toda tela. */
export function HeadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("mb-7", className)}>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-2 h-9 w-64" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
    </div>
  );
}

/** Linhas de tabela no desktop, cartões no telefone — a forma do `DataTable`. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="divide-y divide-border-subtle">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 flex-1 md:block" />
          <Skeleton className="hidden h-4 flex-1 md:block" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      ))}
    </div>
  );
}
