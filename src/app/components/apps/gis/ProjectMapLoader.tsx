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

export type SurveyDrawTool =
  | "select"
  | "point"
  | "line"
  | "polygon"
  | "ruler"
  | "edit"
  | "delete"
  | "clear";
export type SurveyDrawRequest = {
  tool: SurveyDrawTool;
  requestId: number;
  featureId?: string;
};

export type SurveyFeatureMetadata = {
  title: string;
  projectTitle: string;
  desa: string;
  kecamatan: string;
  kabupaten: string;
  vendor: string;
  surveyorName: string;
  description: string;
};

export default function ProjectMapLoader({
  importedData,
  importedDataVersion,
  drawnData,
  visibility,
  drawRequest,
  onVisibilityChange,
  onDrawnDataChange,
  onDrawToolSelect,
  onFeatureCreated,
}: {
  importedData: SurveyGeoJSON | null;
  importedDataVersion: number;
  drawnData: SurveyGeoJSON;
  visibility: SurveyLayerVisibility;
  drawRequest: SurveyDrawRequest | null;
  onVisibilityChange: (visibility: SurveyLayerVisibility) => void;
  onDrawnDataChange: (data: SurveyGeoJSON) => void;
  onDrawToolSelect: (tool: SurveyDrawTool, featureId?: string) => void;
  onFeatureCreated: (feature: SurveyGeoJSON["features"][number]) => void;
}) {
  return (
    <ProjectMap
      importedData={importedData}
      importedDataVersion={importedDataVersion}
      drawnData={drawnData}
      visibility={visibility}
      drawRequest={drawRequest}
      onVisibilityChange={onVisibilityChange}
      onDrawnDataChange={onDrawnDataChange}
      onDrawToolSelect={onDrawToolSelect}
      onFeatureCreated={onFeatureCreated}
    />
  );
}
