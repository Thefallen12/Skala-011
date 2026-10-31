import { MorphingInfinity } from "@/components/ui/morphing-infinity";

export default function Loading() {
  return (
    <main
      className="fixed inset-0 z-[9999] grid place-items-center bg-background/75 backdrop-blur-sm"
      role="status"
      aria-label="Memuat aplikasi"
    >
      <div className="flex flex-col items-center gap-4">
        <MorphingInfinity size={64} className="text-orange-500" />
        <p className="text-sm font-medium text-primary dark:text-white">
          Memuat Skala Prioritas...
        </p>
        <span className="sr-only">Harap tunggu.</span>
      </div>
    </main>
  );
}
