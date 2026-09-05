import {
  HeadingSkeleton,
  LoadingRegion,
  SiteHeaderSkeleton,
  Skeleton,
} from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <>
      <SiteHeaderSkeleton />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
        <LoadingRegion label="Carregando suas reservas">
          <HeadingSkeleton />
          <Skeleton className="h-56 w-full rounded-lg" />
          <Skeleton className="mt-6 h-4 w-40" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-lg" />
            ))}
          </div>
        </LoadingRegion>
      </main>
    </>
  );
}
