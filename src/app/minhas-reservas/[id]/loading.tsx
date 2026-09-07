import {
  LoadingRegion,
  SiteHeaderSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-10">
        <LoadingRegion label="Carregando a reserva">
          <Skeleton className="h-4 w-56" />
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
            <div>
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="mt-3 h-9 w-72 max-w-full" />
              <Skeleton className="mt-3 h-4 w-64 max-w-full" />
              <Skeleton className="mt-6 h-28 w-full rounded-lg" />
              <Skeleton className="mt-6 h-64 w-full rounded-lg" />
            </div>
            <Skeleton className="h-80 w-full rounded-lg" />
          </div>
        </LoadingRegion>
      </main>
    </>
  );
}
