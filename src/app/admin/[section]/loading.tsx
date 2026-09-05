import { Card } from "@/components/ui/card";
import {
  HeadingSkeleton,
  LoadingRegion,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";

/**
 * A forma comum das seções: abertura, uma barra de filtro e a tabela. Trocar de
 * aba passa a pintar isto no mesmo quadro do clique, em vez de deixar a aba
 * anterior parada na tela.
 */
export default function Loading() {
  return (
    <LoadingRegion label="Carregando a seção">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <HeadingSkeleton className="mb-0" />
        <Skeleton className="h-11 w-40" />
      </div>
      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-border-subtle p-4">
          <Skeleton className="h-11 w-full max-w-md" />
        </div>
        <TableSkeleton />
      </Card>
    </LoadingRegion>
  );
}
