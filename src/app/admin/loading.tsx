import { Card, CardHeader } from "@/components/ui/card";
import {
  HeadingSkeleton,
  LoadingRegion,
  Skeleton,
  TableSkeleton,
} from "@/components/ui/skeleton";
import { StatGrid } from "@/components/ui/stat";

/**
 * Sem esta fronteira, clicar numa aba congelava a tela até o servidor terminar
 * de renderizar: nada indicava que o clique tinha valido. Ela também é o que
 * permite ao `<Link>` pré-carregar uma rota dinâmica — sem `loading`, o
 * prefetch de uma rota `force-dynamic` é descartado e o custo inteiro cai no
 * clique.
 */
export default function Loading() {
  return (
    <LoadingRegion label="Carregando a visão geral">
      <HeadingSkeleton />
      <Card padding="none">
        <CardHeader title="Precisa de atenção" />
        <div className="divide-y divide-border-subtle">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 p-4">
              <Skeleton className="size-5 rounded-full" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="mt-2 h-3 w-64 max-w-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <StatGrid className="mt-6">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-surface-raised p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-8 w-20" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </StatGrid>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card padding="none">
          <CardHeader title="Ocupação da semana" />
          <div className="flex h-64 items-end gap-3 p-6">
            {[45, 70, 30, 85, 55, 40, 65].map((height, index) => (
              <Skeleton
                key={index}
                className="flex-1 rounded-t"
                // Alturas fixas: um esqueleto de gráfico com barras iguais não
                // parece um gráfico, e um aleatório muda a cada renderização.
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </Card>
        <Card padding="none">
          <CardHeader title="Reservas de hoje" />
          <TableSkeleton rows={5} />
        </Card>
      </div>
    </LoadingRegion>
  );
}
