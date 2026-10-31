import { Skeleton } from "@/components/ui/skeleton";

type SkeletonLoaderProps = {
  variant?: "table" | "sheet" | "dashboard";
  rows?: number;
};

export default function SkeletonLoader({
  variant = "table",
  rows = 6,
}: SkeletonLoaderProps) {
  if (variant === "sheet") {
    return (
      <div
        className="space-y-5"
        aria-label="Memuat detail"
        role="status"
      >
        <span className="sr-only">Memuat detail...</span>
        <div className="space-y-2">
          <Skeleton className="h-7 w-2/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-24" />
          ))}
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === "dashboard") {
    return (
      <div className="space-y-6" aria-label="Memuat dashboard" role="status">
        <span className="sr-only">Memuat dashboard...</span>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-label="Memuat data" role="status">
      <span className="sr-only">Memuat data...</span>
      <div className="flex gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-10 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}
