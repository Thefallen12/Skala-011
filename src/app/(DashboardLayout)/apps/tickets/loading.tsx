import SkeletonLoader from "@/app/components/shared/SkeletonLoader";

export default function TicketsLoading() {
  return (
    <section className="space-y-6 p-4 md:p-6" aria-label="Memuat daftar tiket">
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-72 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <SkeletonLoader variant="dashboard" />
      <SkeletonLoader variant="table" rows={6} />
    </section>
  );
}
