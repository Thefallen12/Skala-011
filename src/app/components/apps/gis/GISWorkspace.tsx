"use client";

import { useMemo, useRef, useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { center } from "@turf/turf";
import {
  ArrowUpRight,
  Download,
  FileUp,
  MapPinned,
  MapPin,
  Plus,
  Route,
  Shapes,
  Pencil,
  Upload,
  FileText,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GlobalModal } from "@/components/ui/global-modal";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { loadFieldSurveyGeoJSON } from "@/app/actions/field-surveys";
import {
  measureSurveyGeoJSON,
  type SurveyGeoJSON,
} from "@/lib/field-survey-geojson";
import SurveyForm from "./SurveyForm";
import SurveyMapControls from "./SurveyMapControls";
import { readSpatialUpload } from "./geojson-upload";
import type {
  FieldSurveySummary,
  SurveyProjectOption,
} from "./SurveySidebar";
import ProjectMapLoader, {
  type SurveyFeatureMetadata,
  type SurveyDrawRequest,
  type SurveyLayerVisibility,
} from "./ProjectMapLoader";
import { FIELD_SURVEY_PHOTO_CLOUDINARY_FOLDER } from "@/lib/field-survey-photo-config";

function emptyCollection(): SurveyGeoJSON {
  return { type: "FeatureCollection", features: [] };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value);
}

function readFeatureText(
  properties: Record<string, unknown> | null,
  key: string,
) {
  const value = properties?.[key];
  return typeof value === "string" ? value : "";
}

function getDefaultFeatureTitle(geometryType: string | undefined) {
  if (geometryType?.includes("Polygon")) return "Area survei";
  if (geometryType?.includes("Line")) return "Jalur survei";
  return "Titik survei";
}

export default function GISWorkspace({
  projects,
  surveys,
  surveyorName,
  captureTime,
  cloudinaryCloudName,
  cloudinaryApiKey,
  initialProjectId,
  initialView = "map",
  onViewChange,
  onProjectChange,
}: {
  projects: SurveyProjectOption[];
  surveys: FieldSurveySummary[];
  surveyorName: string;
  captureTime: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  initialProjectId?: string | null;
  initialView?: "map" | "details";
  onViewChange?: (view: "map" | "details") => void;
  onProjectChange?: (projectId: string) => void;
}) {
  const [importedData, setImportedData] = useState<SurveyGeoJSON | null>(null);
  const [importedDataVersion, setImportedDataVersion] = useState(0);
  const [drawnData, setDrawnData] = useState<SurveyGeoJSON>(emptyCollection);
  const [newSurveyRequest, setNewSurveyRequest] = useState(0);
  const [confirmNewSurvey, setConfirmNewSurvey] = useState(false);
  const [featureEditorOpen, setFeatureEditorOpen] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
  const [featureMetadata, setFeatureMetadata] = useState<SurveyFeatureMetadata>({
    title: "",
    category: "Area Rehab Sawah",
    photoUrls: "",
    projectTitle: "",
    desa: "",
    kecamatan: "",
    kabupaten: "",
    vendor: "",
    surveyorName,
    description: "",
  });
  const [featureFormError, setFeatureFormError] = useState("");
  const activeProjectId = initialProjectId ?? projects[0]?.id ?? "";
  const activeView = initialView;
  const [importMessage, setImportMessage] = useState("");
  const [visibility, setVisibility] = useState<SurveyLayerVisibility>({
    polygon: true,
    line: true,
    point: true,
  });
  const [drawRequest, setDrawRequest] = useState<SurveyDrawRequest | null>(null);
  const [reportSurveyId, setReportSurveyId] = useState<string | null>(surveys[0]?.id ?? null);
  const [reportPreviewOpen, setReportPreviewOpen] = useState(false);
  const reportFrameRef = useRef<HTMLIFrameElement>(null);

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
  const geometryKinds = useMemo(
    () =>
      [
        ...new Set(
          combinedData.features.flatMap((feature) =>
            feature.geometry ? [feature.geometry.type] : [],
          ),
        ),
      ],
    [combinedData],
  );
  const centerCoordinate = useMemo(() => {
    const featuresWithGeometry = combinedData.features.filter(
      (feature) => feature.geometry,
    );
    if (featuresWithGeometry.length === 0) return null;
    const [longitude = 0, latitude = 0] = center({
      type: "FeatureCollection",
      features: featuresWithGeometry,
    }).geometry.coordinates;
    return { longitude, latitude };
  }, [combinedData]);
  const coordinateLabel = centerCoordinate
    ? `${Math.abs(centerCoordinate.latitude).toFixed(4)}° ${
        centerCoordinate.latitude >= 0 ? "N" : "S"
      }, ${Math.abs(centerCoordinate.longitude).toFixed(4)}° ${
        centerCoordinate.longitude >= 0 ? "E" : "W"
      }`
    : "—";
  const geometryLabel =
    geometryKinds.length > 0
      ? geometryKinds
          .map((kind) =>
            kind.includes("Polygon")
              ? "Polygon / Area Proyek"
              : kind.includes("Line")
                ? "Line / Jalur"
                : kind.includes("Point")
                  ? "Point / Temuan"
                  : kind,
          )
          .join(", ")
      : "—";

  const updateImportedData = (data: SurveyGeoJSON | null) => {
    setImportedData(data);
    setImportedDataVersion((version) => version + 1);
  };

  const startNewSurvey = () => {
    setConfirmNewSurvey(true);
  };

  const changeView = (view: "map" | "details") => {
    onViewChange?.(view);
  };

  const changeProject = (projectId: string) => {
    onProjectChange?.(projectId);
  };

  const openFeatureEditor = (
    featureId: string,
    newFeature?: SurveyGeoJSON["features"][number],
  ) => {
    const feature =
      newFeature ??
      drawnData.features.find(
        (candidate) =>
          candidate.properties?.__surveyLayerId === featureId,
      );
    if (!feature) return;

    const properties = feature.properties;
    const project = projects.find((item) => item.id === activeProjectId);
    setEditingFeatureId(featureId);
    setFeatureMetadata({
      title:
        readFeatureText(properties, "title") ||
        getDefaultFeatureTitle(feature.geometry?.type),
      category:
        readFeatureText(properties, "featureCategory") ||
        (feature.geometry?.type?.includes("Line")
          ? "Saluran Irigasi Tersier"
          : feature.geometry?.type?.includes("Point")
            ? "Titik Kerusakan"
            : "Area Rehab Sawah"),
      photoUrls: readFeatureText(properties, "photoUrls"),
      projectTitle:
        readFeatureText(properties, "projectTitle") || project?.title || "",
      desa: readFeatureText(properties, "desa"),
      kecamatan: readFeatureText(properties, "kecamatan"),
      kabupaten: readFeatureText(properties, "kabupaten"),
      vendor:
        readFeatureText(properties, "vendor") || project?.vendor || "",
      surveyorName,
      description: readFeatureText(properties, "description"),
    });
    setFeatureFormError("");
    setFeatureEditorOpen(true);
  };

  const saveFeatureMetadata = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !featureMetadata.title.trim() ||
      !featureMetadata.projectTitle.trim() ||
      !featureMetadata.desa.trim() ||
      !featureMetadata.kecamatan.trim() ||
      !featureMetadata.kabupaten.trim()
    ) {
      setFeatureFormError(
        "Judul fitur, judul proyek, desa, kecamatan, dan kabupaten wajib diisi.",
      );
      return;
    }

    if (!editingFeatureId) return;
    setDrawnData((currentData) => ({
      ...currentData,
      features: currentData.features.map((feature) => {
        if (feature.properties?.__surveyLayerId !== editingFeatureId) {
          return feature;
        }
        return {
          ...feature,
          properties: {
            ...(feature.properties ?? {}),
            ...featureMetadata,
            title: featureMetadata.title.trim(),
            featureCategory: featureMetadata.category.trim(),
            photoUrls: featureMetadata.photoUrls.trim(),
            projectTitle: featureMetadata.projectTitle.trim(),
            desa: featureMetadata.desa.trim(),
            kecamatan: featureMetadata.kecamatan.trim(),
            kabupaten: featureMetadata.kabupaten.trim(),
            vendor: featureMetadata.vendor.trim(),
            surveyorName,
            description: featureMetadata.description.trim(),
          },
        };
      }),
    }));
    setFeatureEditorOpen(false);
    setEditingFeatureId(null);
  };

  const confirmStartNewSurvey = () => {
    updateImportedData(null);
    setDrawnData(emptyCollection());
    setDrawRequest((request) => ({
      tool: "clear",
      requestId: (request?.requestId ?? 0) + 1,
    }));
    setNewSurveyRequest((request) => request + 1);
    changeProject(projects[0]?.id ?? "");
    setImportMessage("");
    setConfirmNewSurvey(false);
  };

  const importSpatialFile = async (file: File | undefined) => {
    if (!file) return;
    setImportMessage("");
    try {
      const data = await readSpatialUpload(file);
      updateImportedData(data);
      setDrawnData(emptyCollection());
      setImportMessage(
        `${formatNumber(data.features.length)} fitur berhasil diimpor.`,
      );
    } catch (error) {
      console.error("Importing survey geometry failed:", error);
      setImportMessage(
        error instanceof Error
          ? error.message
          : "Berkas spasial gagal dimuat.",
      );
    }
  };

  const loadSavedSurvey = async (survey: FieldSurveySummary) => {
    const result = await loadFieldSurveyGeoJSON(survey.id);
    if (!result.success || !result.data) {
      throw new Error(result.message);
    }
    changeProject(survey.projectId ?? "");
    setDrawnData(emptyCollection());
    updateImportedData(result.data);
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
      <Card className="flex flex-col gap-3 border-border bg-gradient-to-r from-card via-card to-muted p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-background text-primary shadow-sm">
            <MapPinned className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 border-l border-secondary pl-2.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-secondary">
              Skala Prioritas Engineering
            </p>
            <h1 className="mt-0.5 text-lg font-bold leading-tight tracking-tight text-primary sm:text-xl">
              {activeView === "map"
                ? "Lokasi & Survei Project"
                : "Detail & Input Keterangan Survei Lapangan"}
            </h1>
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {activeView === "map"
                ? "Analisis GIS, pemetaan area, dan data survei lapangan."
                : "Lengkapi atribut, kondisi lapangan, dan dokumentasi survei."}
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1 border-r border-border pr-2">
              <Shapes className="size-3.5 text-orange-500" aria-hidden="true" />
              <span className="text-xs font-bold text-foreground">{measurements.polygonCount}</span>
              <span className="hidden text-[9px] text-muted-foreground sm:inline">Area Polygon</span>
            </div>
            <div className="flex items-center gap-1 border-r border-border pr-2">
              <Route className="size-3.5 text-sky-500" aria-hidden="true" />
              <span className="text-xs font-bold text-foreground">{measurements.lineCount}</span>
              <span className="hidden text-[9px] text-muted-foreground sm:inline">Jalur Line</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPinned className="size-3.5 text-secondary" aria-hidden="true" />
              <span className="text-xs font-bold text-foreground">{measurements.pointCount}</span>
              <span className="hidden text-[9px] text-muted-foreground sm:inline">Titik Point</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {reportSurveyId && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 px-2.5 text-[10px]"
                onClick={() => setReportPreviewOpen(true)}
              >
                <FileText className="size-4" />
                Tampilkan PDF
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="h-7 bg-orange-600 px-2.5 text-[10px] text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600"
              onClick={() => {
                if (activeView === "map") changeView("details");
                startNewSurvey();
              }}
            >
              <Plus className="mr-1.5 size-4" />
              Tambah Survei Baru
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 px-2.5 text-[10px]"
              asChild
            >
              <label className="cursor-pointer">
                <FileUp className="size-4" aria-hidden="true" />
                <span>Upload SHP/GeoJSON</span>
                <Input
                  type="file"
                  accept=".zip,.geojson,.json"
                  className="sr-only"
                  onChange={(event) => {
                    void importSpatialFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="hidden h-7 px-2.5 text-[10px] sm:inline-flex"
              onClick={downloadGeoJSON}
              disabled={featureCount === 0}
            >
              <Download className="mr-1.5 size-4" />
              Unduh GeoJSON
            </Button>
          </div>
        </div>
      </Card>

      <nav
        aria-label="Halaman survei proyek"
        className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-2"
      >
        <Button
          type="button"
          size="sm"
          variant={activeView === "map" ? "default" : "ghost"}
          onClick={() => changeView("map")}
          className="gap-2"
        >
          <MapPinned className="size-4" aria-hidden="true" />
          Lokasi & Survei Project
        </Button>
        <Button
          type="button"
          size="sm"
          variant={activeView === "details" ? "default" : "ghost"}
          onClick={() => changeView("details")}
          className="gap-2"
        >
          <Pencil className="size-4" aria-hidden="true" />
          Detail & Input Keterangan Survei Lapangan
        </Button>
      </nav>

      <section
        className={`grid min-h-[640px] flex-1 gap-4 xl:min-h-0 ${
          activeView === "map"
            ? "lg:grid-cols-[minmax(260px,0.72fr)_minmax(0,1.8fr)]"
            : "lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.55fr)]"
        }`}
      >
        {activeView === "map" && (
          <SurveyMapControls
            projects={projects}
            activeProjectId={activeProjectId}
            surveys={surveys}
            drawnData={drawnData}
            importedData={importedData}
            measurements={measurements}
            visibility={visibility}
            importMessage={importMessage}
            onProjectChange={changeProject}
            onDrawToolSelect={(tool) =>
              setDrawRequest((request) => ({
                tool,
                requestId: (request?.requestId ?? 0) + 1,
              }))
            }
            onVisibilityChange={setVisibility}
            onEditFeatureMetadata={openFeatureEditor}
            onEditFeaturePosition={(featureId) =>
              setDrawRequest((request) => ({
                tool: "edit",
                requestId: (request?.requestId ?? 0) + 1,
                featureId,
              }))
            }
            onImportFile={(file) => void importSpatialFile(file)}
            onDownloadGeoJSON={downloadGeoJSON}
            onShowDetails={() => changeView("details")}
          />
        )}
        <div
          className={`flex min-h-0 flex-col gap-3 ${
            activeView === "map" ? "lg:col-start-2" : ""
          }`}
        >
          <Card className="min-h-[420px] flex-1 overflow-hidden p-1.5 shadow-sm xl:min-h-[470px]">
            <ProjectMapLoader
              importedData={importedData}
              importedDataVersion={importedDataVersion}
              drawnData={drawnData}
              visibility={visibility}
              drawRequest={drawRequest}
              onVisibilityChange={setVisibility}
              onDrawnDataChange={setDrawnData}
              onDrawToolSelect={(tool, featureId) =>
                setDrawRequest((request) => ({
                  tool,
                  requestId: (request?.requestId ?? 0) + 1,
                  ...(featureId ? { featureId } : {}),
                }))
              }
              onFeatureCreated={(feature) => {
                changeView("details");
              }}
              onFeatureSelected={() => {
                changeView("details");
              }}
            />
          </Card>
          <Card className="border-slate-800 bg-slate-900/50 p-4 text-slate-300">
            <div className="grid gap-2 sm:grid-cols-2">
              <p className="text-xs text-slate-400">
                Tipe Geometri{" "}
                <span className="block font-medium text-slate-100">
                  {geometryLabel}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Koordinat Pusat{" "}
                <span className="block font-medium text-slate-100">
                  {coordinateLabel}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Jarak Keliling{" "}
                <span className="block font-medium text-slate-100">
                  {measurements.perimeterM > 0
                    ? `${formatNumber(measurements.perimeterM)} meter`
                    : "—"}
                </span>
              </p>
              <p className="text-xs text-slate-400">
                Waktu Pengambilan{" "}
                <span className="block font-medium text-slate-100">
                  {captureTime}
                </span>
              </p>
            </div>
            {importMessage && (
              <p
                role="status"
                className="mt-3 rounded-md border border-slate-700 bg-slate-950/50 p-2 text-xs text-slate-300"
              >
                {importMessage}
              </p>
            )}
            {drawnData.features.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
                <h2 className="text-xs font-semibold text-slate-200">
                  Fitur pada peta
                </h2>
                <ul className="space-y-1.5">
                  {drawnData.features.map((feature, index) => {
                    const featureId = feature.properties?.__surveyLayerId;
                    if (typeof featureId !== "string") return null;
                    const title =
                      readFeatureText(feature.properties, "title") ||
                      `Fitur ${index + 1}`;
                    return (
                      <li
                        key={featureId}
                        className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-950/30 px-2 py-1.5"
                      >
                        <MapPin className="size-3.5 shrink-0 text-orange-400" />
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-300">
                          {title}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-slate-300 hover:bg-slate-800"
                          aria-label={`Edit detail ${title}`}
                          onClick={() => openFeatureEditor(featureId)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-slate-300 hover:bg-slate-800"
                          aria-label={`Edit posisi ${title}`}
                          onClick={() =>
                            setDrawRequest((request) => ({
                              tool: "edit",
                              requestId: (request?.requestId ?? 0) + 1,
                              featureId,
                            }))
                          }
                        >
                          <MapPinned className="size-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        </div>
        <div className={activeView === "details" ? "min-h-0" : "hidden"}>
          <SurveyForm
            key={newSurveyRequest}
            projects={projects}
            surveys={surveys}
            surveyorName={surveyorName}
            initialProjectId={activeProjectId}
            geoJsonData={combinedData}
            geometryType={geometryKinds.join(", ")}
            centerCoordinate={
              centerCoordinate
                ? `${centerCoordinate.latitude.toFixed(6)}, ${centerCoordinate.longitude.toFixed(6)}`
                : ""
            }
            perimeterM={measurements.perimeterM}
            captureTime={captureTime}
            cloudinaryCloudName={cloudinaryCloudName}
            cloudinaryApiKey={cloudinaryApiKey}
            onProjectChange={changeProject}
            onCancel={startNewSurvey}
            onLoadSurvey={loadSavedSurvey}
            onSavedSurvey={setReportSurveyId}
          />
        </div>
      </section>

      <p className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
        <span>Skala Prioritas · Dashboard GIS & Survei Lapangan</span>
        <span className="inline-flex items-center gap-1">
          {surveys.length} survei terbaru · {formatNumber(featureCount)} fitur aktif
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </span>
      </p>
      <GlobalModal
        isOpen={reportPreviewOpen && reportSurveyId !== null}
        onClose={() => setReportPreviewOpen(false)}
        title="Pratinjau PDF: Rekap Hasil Survei Lapangan"
        description="Laporan mengikuti template A4. Gunakan cetak untuk menyimpan sebagai PDF."
        className="z-[2100] max-w-[calc(210mm+3rem)]"
        overlayClassName="z-[2099]"
        bodyClassName="bg-slate-950/30 p-0"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => reportFrameRef.current?.contentWindow?.print()}
            >
              <Printer className="mr-2 size-4" />
              Cetak / Simpan PDF
            </Button>
            <Button type="button" onClick={() => setReportPreviewOpen(false)}>
              Tutup
            </Button>
          </>
        }
      >
        <iframe
          ref={reportFrameRef}
          title="Laporan survei"
          src={
            reportSurveyId
              ? `/report/${encodeURIComponent(reportSurveyId)}`
              : undefined
          }
          className="h-[70vh] w-full rounded-lg bg-white"
        />
      </GlobalModal>
      <GlobalModal
        isOpen={featureEditorOpen}
        onClose={() => {
          setFeatureEditorOpen(false);
          setEditingFeatureId(null);
        }}
        title="Detail fitur survei"
        description="Lengkapi informasi lokasi dan keterangan untuk fitur yang baru digambar. Nama surveyor diambil dari akun yang sedang digunakan."
        className="z-[2001] max-h-[calc(100vh-2rem)] sm:max-w-2xl"
        overlayClassName="z-[2000]"
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setFeatureEditorOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="feature-metadata-form"
              className="bg-orange-600 text-white hover:bg-orange-700"
            >
              Simpan detail fitur
            </Button>
          </>
        }
      >
          <form
            id="feature-metadata-form"
            onSubmit={saveFeatureMetadata}
            className="space-y-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="feature-title">Judul fitur</Label>
                <Input
                  id="feature-title"
                  value={featureMetadata.title}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  maxLength={160}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feature-category">Kategori fitur rehab sawah</Label>
                <select
                  id="feature-category"
                  value={featureMetadata.category}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option>Saluran Irigasi Primer</option>
                  <option>Saluran Irigasi Sekunder</option>
                  <option>Saluran Irigasi Tersier</option>
                  <option>Area Rehab Sawah</option>
                  <option>Tanggul Rusak</option>
                  <option>Titik Kerusakan</option>
                  <option>Lainnya</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feature-project-title">Judul proyek</Label>
                <Input
                  id="feature-project-title"
                  value={featureMetadata.projectTitle}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      projectTitle: event.target.value,
                    }))
                  }
                  maxLength={160}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feature-desa">Desa</Label>
                <Input
                  id="feature-desa"
                  value={featureMetadata.desa}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      desa: event.target.value,
                    }))
                  }
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feature-kecamatan">Kecamatan</Label>
                <Input
                  id="feature-kecamatan"
                  value={featureMetadata.kecamatan}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      kecamatan: event.target.value,
                    }))
                  }
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feature-kabupaten">Kabupaten</Label>
                <Input
                  id="feature-kabupaten"
                  value={featureMetadata.kabupaten}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      kabupaten: event.target.value,
                    }))
                  }
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="feature-vendor">Vendor</Label>
                <Input
                  id="feature-vendor"
                  value={featureMetadata.vendor}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      vendor: event.target.value,
                    }))
                  }
                  placeholder="Nama vendor (opsional)"
                  maxLength={180}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="feature-surveyor">Surveyor (akun aktif)</Label>
                <Input
                  id="feature-surveyor"
                  value={surveyorName}
                  readOnly
                  aria-readonly="true"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="feature-description">Keterangan fitur</Label>
                <Textarea
                  id="feature-description"
                  value={featureMetadata.description}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Catatan untuk titik, jalur, atau area ini..."
                  maxLength={2000}
                  rows={3}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="feature-photo-urls">Foto fitur (URL Cloudinary, pisahkan dengan koma)</Label>
                {cloudinaryCloudName && cloudinaryApiKey && (
                  <CldUploadWidget
                    config={{ cloud: { cloudName: cloudinaryCloudName, apiKey: cloudinaryApiKey } }}
                    signatureEndpoint="/api/cloudinary/field-survey-signature"
                    options={{
                      folder: FIELD_SURVEY_PHOTO_CLOUDINARY_FOLDER,
                      resourceType: "image",
                      sources: ["local", "camera"],
                      multiple: true,
                      maxFiles: 10,
                      maxFileSize: 8 * 1024 * 1024,
                      clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
                      showPoweredBy: false,
                    }}
                    onSuccess={(result) => {
                      const info = result.info;
                      if (
                        result.event === "success" &&
                        typeof info === "object" &&
                        info !== null &&
                        "secure_url" in info &&
                        typeof info.secure_url === "string"
                      ) {
                        setFeatureMetadata((current) => ({
                          ...current,
                          photoUrls: [...current.photoUrls.split(",").map((url) => url.trim()).filter(Boolean), info.secure_url].slice(0, 10).join(", "),
                        }));
                      }
                    }}
                  >
                    {({ open }) => (
                      <Button type="button" variant="outline" onClick={() => open()}>
                        Unggah foto fitur
                      </Button>
                    )}
                  </CldUploadWidget>
                )}
                <Input
                  id="feature-photo-urls"
                  value={featureMetadata.photoUrls}
                  onChange={(event) =>
                    setFeatureMetadata((current) => ({
                      ...current,
                      photoUrls: event.target.value,
                    }))
                  }
                  placeholder="https://res.cloudinary.com/.../foto.jpg"
                />
              </div>
            </div>
            {featureFormError && (
              <p role="alert" className="text-sm text-destructive">
                {featureFormError}
              </p>
            )}
          </form>
      </GlobalModal>
      <AlertDialog open={confirmNewSurvey} onOpenChange={setConfirmNewSurvey}>
        <AlertDialogContent
          className="z-[2001]"
          overlayClassName="z-[2000]"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Mulai survei baru?</AlertDialogTitle>
            <AlertDialogDescription>
              Data gambar, hasil impor, dan metadata yang belum disimpan pada
              survei saat ini akan dihapus.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 hover:bg-orange-700"
              onClick={confirmStartNewSurvey}
            >
              Mulai Survei Baru
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
