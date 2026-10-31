import SkeletonLoader from "@/app/components/shared/SkeletonLoader";

export default function ProjectsLoading() {
  return (
    <section className="space-y-6 p-4 md:p-6" aria-label="Memuat daftar proyek">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-muted" />
      </div>
      <SkeletonLoader variant="table" rows={8} />
    </section>
  );
}
