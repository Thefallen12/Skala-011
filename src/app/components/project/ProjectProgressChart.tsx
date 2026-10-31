"use client";

import dynamic from "next/dynamic";
import CardBox from "@/app/components/shared/CardBox";
import type { ProjectProgressPoint } from "@/app/(DashboardLayout)/types/project";

const ProjectProgressChartView = dynamic(
  () => import("@/app/components/project/ProjectProgressChartView"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[300px] animate-pulse rounded-md bg-lightsecondary" />
    ),
  },
);

export default function ProjectProgressChart({
  data,
}: {
  data: ProjectProgressPoint[];
}) {
  return (
    <CardBox className="h-full">
      <div className="mb-6">
        <h5 className="card-title">Progres Pekerjaan</h5>
        <p className="text-sm font-normal text-muted-foreground">
          Tren progres dari laporan harian yang memiliki data progres.
        </p>
      </div>
      {data.length ? (
        <ProjectProgressChartView data={data} />
      ) : (
        <p className="py-24 text-center text-sm text-muted-foreground">
          Belum ada histori progres. Tambahkan nilai progres pada laporan harian
          untuk melihat tren.
        </p>
      )}
    </CardBox>
  );
}
