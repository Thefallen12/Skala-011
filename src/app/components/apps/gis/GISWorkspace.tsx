"use client";

import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Download,
  FileUp,
  Map,
  MapPinned,
  Plus,
  Route,
  Shapes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  measureSurveyGeoJSON,
  type SurveyGeoJSON,
} from "@/lib/field-survey-geojson";
import SurveySidebar, {
  type FieldSurveySummary,
  type SurveyProjectOption,
} from "./SurveySidebar";
import ProjectMapLoader, {
  type SurveyLayerVisibility,
} from "./ProjectMapLoader";

function emptyCollection(): SurveyGeoJSON {
  return { type: "FeatureCollection", features: [] };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
}

export default function GISWorkspace({
  projects,
  surveys,
  surveyorName,
}: {
  projects: SurveyProjectOption[];
  surveys: FieldSurveySummary[];
  surveyorName: string;
}) {
  const [importedData, setImportedData] = useState<SurveyGeoJSON | null>(null);
  const [importedDataVersion, setImportedDataVersion] = useState(0);
  const [drawnData, setDrawnData] = useState<SurveyGeoJSON>(emptyCollection);
  const [resetVersion, setResetVersion] = useState(0);
  const [activeProjectId, setActiveProjectId] = useState(projects[0]?.id ?? "");
  const [visibility, setVisibility] = useState<SurveyLayerVisibility>({
    polygon: true,
    line: true,
    point: true,
  });

  const combinedData = useMemo<SurveyGeoJSON>(
    () => ({
      type: "FeatureCollection",
      features: [...(importedData?.features ?? []), ...drawnData.features],
    }),
    [drawnData.features, importedData],
  );
  const measurements = useMemo(
    () => measureSurveyGeoJSON(combinedData),
    [combinedData],
  );
  const featureCount = combinedData.features.length;

  const updateImportedData = (data: SurveyGeoJSON | null) => {
    setImportedData(data);
    setImportedDataVersion((version) => version + 1);
  };

  const startNewSurvey = () => {
    updateImportedData(null);
    setDrawnData(emptyCollection());
    setResetVersion((version) => version + 1);
  };

  const downloadGeoJSON = () => {
    if (featureCount === 0) return;
    const blob = new Blob([JSON.stringify(combinedData, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "survei-lokasi.geojson";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-3 xl:h-[calc(100vh-12rem)] xl:min-h-[640px]">
      <Card className="flex flex-wrap items-center justify-between gap-4 border-border bg-gradient-to-r from-card via-card to-muted p-3 shadow-sm sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground shadow-sm">
            <Map className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 border-l-2 border-secondary pl-3 sm:pl-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-secondary">
              Skala Prioritas Engineering
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-primary sm:text-2xl">
              Lokasi & Survei Proyek
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Analisis GIS, pemetaan area, dan data survei lapangan tim.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-1.5 border-r border-border pr-3">
              <Shapes className="size-3.5 text-orange-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">{measurements.polygonCount}</span>
              <span className="text-[10px] text-muted-foreground">Area Polygon</span>
            </div>
            <div className="flex items-center gap-1.5 border-r border-border pr-3">
              <Route className="size-3.5 text-sky-500" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">{measurements.lineCount}</span>
              <span className="text-[10px] text-muted-foreground">Jalur Line</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPinned className="size-3.5 text-secondary" aria-hidden="true" />
              <span className="text-sm font-semibold text-foreground">{measurements.pointCount}</span>
              <span className="text-[10px] text-muted-foreground">Titik Point</span>
            </div>
          </div>
          <Button type="button" size="sm" className="bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600" onClick={startNewSurvey}>
            <Plus className="mr-1.5 size-4" />
            Tambah Survei Baru
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1.5"
            asChild
          >
            <label htmlFor="survey-spatial-file" className="cursor-pointer">
              <FileUp className="size-4" aria-hidden="true" />
              Upload SHP/GeoJSON
            </label>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="hidden sm:inline-flex"
            onClick={downloadGeoJSON}
            disabled={featureCount === 0}
          >
            <Download className="mr-1.5 size-4" />
            Unduh GeoJSON
          </Button>
        </div>
      </Card>

      <section className="grid min-h-[720px] flex-1 gap-3 xl:min-h-0 xl:grid-cols-[minmax(17rem,21rem)_minmax(0,1fr)]">
        <SurveySidebar
          key={resetVersion}
          projects={projects}
          surveys={surveys}
          surveyorName={surveyorName}
          initialProjectId={activeProjectId}
          importedData={importedData}
          drawnData={drawnData}
          onProjectChange={setActiveProjectId}
          onImportedDataChange={updateImportedData}
          onDrawnDataChange={setDrawnData}
          visibility={visibility}
          onVisibilityChange={setVisibility}
        />
        <Card className="min-h-[520px] overflow-hidden p-1.5 shadow-sm xl:min-h-0">
          <ProjectMapLoader
            importedData={importedData}
            importedDataVersion={importedDataVersion}
            drawnData={drawnData}
            visibility={visibility}
            onDrawnDataChange={setDrawnData}
          />
        </Card>
      </section>

      <p className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>Skala Prioritas · Dashboard GIS & Survei Lapangan</span>
        <span className="inline-flex items-center gap-1">
          {surveys.length} survei terbaru · {formatNumber(featureCount)} fitur aktif
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </span>
      </p>
    </div>
  );
}
