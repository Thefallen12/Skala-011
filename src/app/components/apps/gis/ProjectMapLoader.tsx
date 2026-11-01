"use client";

import dynamic from "next/dynamic";
import { Map } from "lucide-react";
import type { SurveyGeoJSON } from "@/lib/field-survey-geojson";

const ProjectMap = dynamic(() => import("./ProjectMap"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full min-h-[420px] place-items-center rounded-xl bg-muted text-sm text-muted-foreground">
      <span className="flex items-center gap-2">
        <Map className="size-4 animate-pulse" aria-hidden="true" />
        Menyiapkan peta...
      </span>
    </div>
  ),
});

export type SurveyLayerVisibility = {
  polygon: boolean;
  line: boolean;
  point: boolean;
};

export default function ProjectMapLoader({
  importedData,
  importedDataVersion,
  drawnData,
  visibility,
  onDrawnDataChange,
}: {
  importedData: SurveyGeoJSON | null;
  importedDataVersion: number;
  drawnData: SurveyGeoJSON;
  visibility: SurveyLayerVisibility;
  onDrawnDataChange: (data: SurveyGeoJSON) => void;
}) {
  return (
    <ProjectMap
      importedData={importedData}
      importedDataVersion={importedDataVersion}
      drawnData={drawnData}
      visibility={visibility}
      onDrawnDataChange={onDrawnDataChange}
    />
  );
}
