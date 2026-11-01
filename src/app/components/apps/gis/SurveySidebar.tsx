"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  Clock3,
  FileUp,
  Layers3,
  MapPinned,
  Ruler,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  loadFieldSurveyGeoJSON,
  saveFieldSurvey,
} from "@/app/actions/field-surveys";
import {
  isSurveyGeoJSON,
  measureSurveyGeoJSON,
  type SurveyGeoJSON,
} from "@/lib/field-survey-geojson";
import { readSpatialUpload } from "./geojson-upload";
import type { SurveyLayerVisibility } from "./ProjectMapLoader";

export type SurveyProjectOption = {
  id: string;
  title: string;
};

export type FieldSurveySummary = {
  id: string;
  projectId: string;
  projectName: string;
  locationName: string;
  responsibleName: string;
  surveyorName: string;
  areaSqm: number | null;
  lengthM: number | null;
  perimeterM: number | null;
  notes: string | null;
  createdAt: string;
};

function formatNumber(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits }).format(value);
}

function formatArea(value: number) {
  return `${formatNumber(value)} m² · ${formatNumber(value / 10_000, 2)} Ha`;
}

function formatDistance(value: number) {
  return value >= 1_000
    ? `${formatNumber(value / 1_000, 2)} km · ${formatNumber(value)} m`
    : `${formatNumber(value)} m`;
}

function mergeSurveyData(
  importedData: SurveyGeoJSON | null,
  drawnData: SurveyGeoJSON,
): SurveyGeoJSON {
  return {
    type: "FeatureCollection",
    features: [...(importedData?.features ?? []), ...drawnData.features],
  };
}

export default function SurveySidebar({
  projects,
  surveys,
  surveyorName,
  initialProjectId,
  importedData,
  drawnData,
  onProjectChange,
  onImportedDataChange,
  onDrawnDataChange,
  visibility,
  onVisibilityChange,
}: {
  projects: SurveyProjectOption[];
  surveys: FieldSurveySummary[];
  surveyorName: string;
  initialProjectId: string;
  importedData: SurveyGeoJSON | null;
  drawnData: SurveyGeoJSON;
  onProjectChange: (projectId: string) => void;
  onImportedDataChange: (data: SurveyGeoJSON | null) => void;
  onDrawnDataChange: (data: SurveyGeoJSON) => void;
  visibility: SurveyLayerVisibility;
  onVisibilityChange: (visibility: SurveyLayerVisibility) => void;
}) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(initialProjectId);
  const [locationName, setLocationName] = useState("");
  const [responsibleName, setResponsibleName] = useState(surveyorName);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [loadingSurveyId, setLoadingSurveyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const combinedData = useMemo(
    () => mergeSurveyData(importedData, drawnData),
    [drawnData, importedData],
  );
  const measurements = useMemo(
    () => (isSurveyGeoJSON(combinedData) ? measureSurveyGeoJSON(combinedData) : null),
    [combinedData],
  );

  const changeProject = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    onProjectChange(nextProjectId);
  };

  const importFile = (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const data = await readSpatialUpload(file);
        onImportedDataChange(data);
        onDrawnDataChange({ type: "FeatureCollection", features: [] });
        setUploadName(file.name);
        setMessage({
          type: "success",
          text: `${formatNumber(data.features.length, 0)} fitur berhasil dimuat dari ${file.name}.`,
        });
      } catch (error) {
        console.error("Importing spatial survey file failed:", error);
        setMessage({
          type: "error",
          text:
            error instanceof Error
              ? error.message
              : "Berkas spasial gagal diproses.",
        });
      }
    });
  };

  const loadSurvey = async (survey: FieldSurveySummary) => {
    setLoadingSurveyId(survey.id);
    setMessage(null);
    try {
      const result = await loadFieldSurveyGeoJSON(survey.id);
      if (!result.success || !result.data) {
        setMessage({ type: "error", text: result.message });
        return;
      }
      onProjectChange(survey.projectId);
      setProjectId(survey.projectId);
      onDrawnDataChange({ type: "FeatureCollection", features: [] });
      onImportedDataChange(result.data);
      setLocationName(survey.locationName);
      setResponsibleName(survey.responsibleName);
      setNotes(survey.notes ?? "");
      setUploadName(`Survei tersimpan · ${survey.locationName}`);
      setMessage({ type: "success", text: "Data survei berhasil dimuat ke peta." });
    } catch (error) {
      console.error("Loading saved survey failed:", error);
      setMessage({ type: "error", text: "Survei gagal dimuat. Silakan coba kembali." });
    } finally {
      setLoadingSurveyId(null);
    }
  };

  const submitSurvey = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (!projectId) {
      setMessage({ type: "error", text: "Pilih proyek terlebih dahulu." });
      return;
    }
    if (!isSurveyGeoJSON(combinedData)) {
      setMessage({
        type: "error",
        text: "Gambarkan atau unggah minimal satu fitur spasial sebelum menyimpan.",
      });
      return;
    }

    startTransition(async () => {
      const result = await saveFieldSurvey({
        projectId,
        locationName,
        responsibleName,
        notes,
        geoJsonData: combinedData,
      });
      setMessage({
        type: result.success ? "success" : "error",
        text: result.message,
      });
      if (result.success) {
        setLocationName("");
        setNotes("");
        router.refresh();
      }
    });
  };

  const handleVisibility = (
    type: keyof SurveyLayerVisibility,
    checked: boolean,
  ) => {
    onVisibilityChange({ ...visibility, [type]: checked });
  };

  return (
    <Card className="flex h-[min(74vh,720px)] min-h-[480px] flex-col overflow-hidden p-0 xl:h-full xl:min-h-0">
      <CardHeader className="gap-1 border-b border-border p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers3 className="size-4 text-secondary" aria-hidden="true" />
            Alat Pemetaan
          </CardTitle>
          <Badge variant="secondary">{surveys.length} survei</Badge>
        </div>
        <CardDescription>Draw tools, layer proyek, dan kalkulator GIS.</CardDescription>
      </CardHeader>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-3 sm:p-4">
          <section className="space-y-2" aria-labelledby="survey-tools-label">
            <h2 id="survey-tools-label" className="text-sm font-semibold">
              Alat Pemetaan (Draw Tools)
            </h2>
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              Pilih ikon Point, Line, Polygon, Edit, atau Hapus pada toolbar di atas peta.
            </p>
          </section>

          <section className="space-y-2 border-t border-border pt-4" aria-labelledby="survey-project-label">
            <Label id="survey-project-label" htmlFor="survey-project">
              Proyek
            </Label>
            <Select value={projectId} onValueChange={changeProject}>
              <SelectTrigger id="survey-project" className="w-full">
                <SelectValue placeholder="Pilih proyek" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {projects.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada proyek yang dapat dipetakan untuk akun ini.
              </p>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Unggah SHP / GeoJSON</h2>
            <Label
              htmlFor="survey-spatial-file"
              className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/50 px-3 py-4 text-center transition hover:border-primary hover:bg-accent"
            >
              <FileUp className="size-5 text-secondary" aria-hidden="true" />
              <span className="text-xs font-medium">
                {uploadName || "Pilih ZIP Shapefile atau GeoJSON"}
              </span>
              <span className="text-[11px] text-muted-foreground">
                ZIP maks. 25 MB · sistem koordinat WGS84
              </span>
              <Input
                id="survey-spatial-file"
                type="file"
                accept=".zip,.geojson,.json"
                className="sr-only"
                disabled={isPending}
                onChange={(event) => {
                  importFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </Label>
            {importedData && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-muted-foreground"
                onClick={() => {
                  onImportedDataChange(null);
                  setUploadName("");
                }}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Hapus layer impor
              </Button>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">Daftar Layer Proyek</h2>
            <div className="space-y-2 rounded-lg border border-border p-3">
              {(
                [
                  ["polygon", "Batas area / Polygon", "text-orange-600 dark:text-orange-400"],
                  ["line", "Jalur survei / Line", "text-sky-600 dark:text-sky-400"],
                  ["point", "Titik survei / Point", "text-secondary"],
                ] as const
              ).map(([type, label, colorClass]) => (
                <Label key={type} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={visibility[type]}
                    onCheckedChange={(checked) =>
                      handleVisibility(type, checked === true)
                    }
                  />
                  <span className={`size-2 rounded-full ${colorClass.replace("text-", "bg-")}`} />
                  {label}
                </Label>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Ruler className="size-4 text-secondary" aria-hidden="true" />
              Kalkulator GIS
            </h2>
            <div className="divide-y divide-border rounded-lg border border-border px-3">
              <div className="flex items-center justify-between gap-3 py-2">
                <p className="text-xs text-muted-foreground">Luas estimasi</p>
                <p className="text-right text-xs font-semibold">
                  {measurements && measurements.areaSqm > 0
                    ? formatArea(measurements.areaSqm)
                    : "—"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <p className="text-xs text-muted-foreground">Panjang jalur</p>
                <p className="text-right text-xs font-semibold">
                  {measurements && measurements.lengthM > 0
                    ? formatDistance(measurements.lengthM)
                    : "—"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <p className="text-xs text-muted-foreground">Keliling polygon</p>
                <p className="text-right text-xs font-semibold">
                  {measurements && measurements.perimeterM > 0
                    ? formatDistance(measurements.perimeterM)
                    : "—"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <p className="text-xs text-muted-foreground">Objek terukur</p>
                <p className="text-right text-xs font-semibold">
                  {measurements
                    ? `${measurements.polygonCount} area · ${measurements.lineCount} jalur · ${measurements.pointCount} titik`
                    : "—"}
                </p>
              </div>
            </div>
          </section>

          <form onSubmit={submitSurvey} className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPinned className="size-4 text-secondary" aria-hidden="true" />
              <h2 className="text-sm font-semibold">Metadata Survei</h2>
            </div>
            <div className="space-y-2">
              <Label htmlFor="survey-location-name">Nama lokasi</Label>
              <Input
                id="survey-location-name"
                value={locationName}
                onChange={(event) => setLocationName(event.target.value)}
                placeholder="Contoh: Area proyek Bintang Kejora"
                maxLength={160}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="survey-responsible">Penanggung jawab</Label>
              <Input
                id="survey-responsible"
                value={responsibleName}
                onChange={(event) => setResponsibleName(event.target.value)}
                placeholder="Nama penanggung jawab survei"
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="survey-notes">Catatan lapangan</Label>
              <Textarea
                id="survey-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Kondisi medan, akses, patok, atau informasi lapangan..."
                maxLength={5000}
                rows={3}
              />
            </div>
            {message && (
              <p
                role={message.type === "error" ? "alert" : "status"}
                className={`flex items-start gap-2 rounded-md border p-2.5 text-xs ${
                  message.type === "error"
                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                    : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                {message.type === "error" ? (
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                ) : (
                  <Check className="mt-0.5 size-3.5 shrink-0" />
                )}
                {message.text}
              </p>
            )}
            <Button
              type="submit"
              className="w-full"
              disabled={
                isPending ||
                !projectId ||
                !locationName.trim() ||
                !responsibleName.trim() ||
                !isSurveyGeoJSON(combinedData)
              }
            >
              <Save className="mr-2 size-4" />
              {isPending ? "Menyimpan..." : "Simpan Data Survei"}
            </Button>
          </form>

          <section className="space-y-2 border-t border-border pt-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 className="size-4 text-secondary" aria-hidden="true" />
              Survei Tersimpan
            </h2>
            {surveys.length === 0 ? (
              <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
                Belum ada survei yang tersimpan untuk proyek yang dapat Anda akses.
              </p>
            ) : (
              <ul className="space-y-2">
                {surveys.map((survey) => (
                  <li key={survey.id}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                      disabled={loadingSurveyId !== null}
                      onClick={() => void loadSurvey(survey)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">
                          {survey.locationName}
                        </span>
                        <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                          {survey.projectName} · {survey.surveyorName}
                        </span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {new Date(survey.createdAt).toLocaleDateString("id-ID")} ·{" "}
                          {formatNumber(survey.areaSqm ?? 0)} m² ·{" "}
                          {formatDistance(survey.lengthM ?? 0)}
                        </span>
                      </span>
                      {loadingSurveyId === survey.id ? (
                        <Upload className="size-4 animate-pulse" />
                      ) : (
                        <FileUp className="size-4 shrink-0 text-muted-foreground" />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </ScrollArea>
    </Card>
  );
}
