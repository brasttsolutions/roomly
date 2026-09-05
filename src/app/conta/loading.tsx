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
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
        <LoadingRegion label="Carregando sua conta">
          <HeadingSkeleton />
          {[52, 60, 40].map((height, index) => (
            <Skeleton
              key={index}
              className="mt-6 w-full rounded-lg first:mt-0"
              style={{ height: `${height * 4}px` }}
            />
          ))}
        </LoadingRegion>
      </main>
    </>
  );
}
