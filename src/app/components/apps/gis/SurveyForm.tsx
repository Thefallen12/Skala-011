"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CldUploadWidget } from "next-cloudinary";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import {
  AlertCircle,
  Camera,
  Check,
  Clock3,
  FileUp,
  ImagePlus,
  LoaderCircle,
  Trash2,
} from "lucide-react";
import { saveFieldSurvey } from "@/app/actions/field-surveys";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { SurveyGeoJSON } from "@/lib/field-survey-geojson";
import { FIELD_SURVEY_PHOTO_CLOUDINARY_FOLDER } from "@/lib/field-survey-photo-config";
import type { FieldSurveySummary, SurveyProjectOption } from "./SurveySidebar";

const formSchema = z.object({
  projectId: z.string().nullable(),
  surveyName: z
    .string()
    .trim()
    .min(2, "Nama lokasi/survei minimal 2 karakter.")
    .max(160),
  objectCategory: z.enum([
    "Batas Area Proyek (Polygon)",
    "Jalur Logistik (Line)",
    "Titik Hambatan/Temuan (Point)",
  ]),
  vegetationType: z.string(),
  topography: z.enum(["Datar", "Bergelombang", "Sangat Curam"]),
  landOwnership: z.string(),
  notes: z.string().max(5000, "Catatan maksimal 5.000 karakter."),
  documentationUrls: z.array(z.string().url()).max(10),
});

export type SurveyFormValues = z.infer<typeof formSchema>;

const categoryToObjectCategory: Record<string, SurveyFormValues["objectCategory"]> = {
  polygon: "Batas Area Proyek (Polygon)",
  line: "Jalur Logistik (Line)",
  point: "Titik Hambatan/Temuan (Point)",
};
const objectCategories: SurveyFormValues["objectCategory"][] = [
  "Batas Area Proyek (Polygon)",
  "Jalur Logistik (Line)",
  "Titik Hambatan/Temuan (Point)",
];
const topographies: SurveyFormValues["topography"][] = [
  "Datar",
  "Bergelombang",
  "Sangat Curam",
];

function getDefaultCategory(data: SurveyGeoJSON): SurveyFormValues["objectCategory"] {
  const firstGeometry = data.features.find((feature) => feature.geometry)?.geometry;
  if (
    firstGeometry?.type === "LineString" ||
    firstGeometry?.type === "MultiLineString"
  ) {
    return categoryToObjectCategory.line;
  }
  if (
    firstGeometry?.type === "Point" ||
    firstGeometry?.type === "MultiPoint"
  ) {
    return categoryToObjectCategory.point;
  }
  return categoryToObjectCategory.polygon;
}

export default function SurveyForm({
  projects,
  surveys,
  surveyorName,
  initialProjectId,
  geoJsonData,
  geometryType,
  centerCoordinate,
  perimeterM,
  captureTime,
  cloudinaryCloudName,
  cloudinaryApiKey,
  onProjectChange,
  onCancel,
  onLoadSurvey,
}: {
  projects: SurveyProjectOption[];
  surveys: FieldSurveySummary[];
  surveyorName: string;
  initialProjectId: string;
  geoJsonData: SurveyGeoJSON;
  geometryType: string;
  centerCoordinate: string;
  perimeterM: number;
  captureTime: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  onProjectChange: (projectId: string) => void;
  onCancel: () => void;
  onLoadSurvey: (survey: FieldSurveySummary) => Promise<void>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<{
    type: "error" | "success";
    message: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState("");
  const [loadingSurveyId, setLoadingSurveyId] = useState<string | null>(null);
  const initialValues = useMemo<SurveyFormValues>(
    () => ({
      projectId: initialProjectId || null,
      surveyName: "",
      objectCategory: getDefaultCategory(geoJsonData),
      vegetationType: "",
      topography: "Datar",
      landOwnership: "",
      notes: "",
      documentationUrls: [],
    }),
    [geoJsonData, initialProjectId],
  );
  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues,
  });
  const documentationUrls =
    useWatch({ control: form.control, name: "documentationUrls" }) ?? [];
  const selectedProjectId = useWatch({
    control: form.control,
    name: "projectId",
  });

  useEffect(() => {
    const projectId = initialProjectId || null;
    if (form.getValues("projectId") !== projectId) {
      form.setValue("projectId", projectId, { shouldValidate: true });
    }
  }, [form, initialProjectId]);

  useEffect(() => {
    if (
      geoJsonData.features.length > 0 &&
      !form.getFieldState("objectCategory").isDirty
    ) {
      form.setValue("objectCategory", getDefaultCategory(geoJsonData));
    }
  }, [form, geoJsonData]);

  const handleSubmit = form.handleSubmit((values) => {
    setStatus(null);
    startTransition(async () => {
      const selectedProject = values.projectId
        ? projects.find((project) => project.id === values.projectId)
        : null;
      if (values.projectId && !selectedProject) {
        setStatus({ type: "error", message: "Kode proyek tidak ditemukan." });
        return;
      }

      const result = await saveFieldSurvey({
        projectId: values.projectId,
        locationName: values.surveyName,
        surveyName: values.surveyName,
        responsibleName: surveyorName,
        objectCategory: values.objectCategory,
        vegetationType: values.vegetationType,
        topography: values.topography,
        landOwnership: values.landOwnership,
        notes: values.notes,
        documentationUrls: values.documentationUrls,
        geoJsonData,
      });
      setStatus({
        type: result.success ? "success" : "error",
        message: result.message,
      });
      if (result.success) router.refresh();
    });
  });

  const handleLoadSurvey = async (survey: FieldSurveySummary) => {
    setLoadingSurveyId(survey.id);
    setStatus(null);
    try {
      await onLoadSurvey(survey);
      form.reset({
        ...initialValues,
        projectId: survey.projectId,
        surveyName: survey.surveyName || survey.locationName,
        objectCategory:
          objectCategories.find(
            (category) => category === survey.objectCategory,
          ) ?? categoryToObjectCategory.polygon,
        vegetationType: survey.vegetationType ?? "",
        topography:
          topographies.find(
            (topography) => topography === survey.topography,
          ) ?? "Datar",
        landOwnership: survey.landOwnership ?? "",
        notes: survey.notes ?? "",
        documentationUrls: survey.documentationUrls ?? [],
      });
      setStatus({ type: "success", message: "Survei berhasil dimuat." });
    } catch (error) {
      console.error("Loading survey into the editor failed:", error);
      setStatus({
        type: "error",
        message: "Survei gagal dimuat. Silakan coba kembali.",
      });
    } finally {
      setLoadingSurveyId(null);
    }
  };

  return (
    <Card className="flex min-h-[620px] flex-col border-slate-800 bg-slate-900/50 p-0 text-slate-300 shadow-sm">
      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">
              Seksi 1: Informasi Dasar Proyek
            </h2>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="survey-name" className="text-xs text-slate-400">
                  Nama Lokasi / Survei
                </Label>
                <Input
                  id="survey-name"
                  {...form.register("surveyName")}
                  placeholder="Nama lokasi survei"
                  maxLength={160}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
                />
                {form.formState.errors.surveyName && (
                  <p className="text-xs text-rose-400">
                    {form.formState.errors.surveyName.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-code" className="text-xs text-slate-400">
                  Proyek Berkontrak Terkait (Opsional)
                </Label>
                <Controller
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <Select
                      value={field.value ?? "preproject"}
                      onValueChange={(value) => {
                        const projectId = value === "preproject" ? null : value;
                        field.onChange(projectId);
                        onProjectChange(projectId ?? "");
                      }}
                    >
                      <SelectTrigger
                        id="project-code"
                        className="border-slate-700 bg-slate-800 text-slate-100"
                      >
                        <SelectValue placeholder="Pilih hubungan proyek" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="preproject">
                          Survei Pra-Proyek · belum terikat kontrak
                        </SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.code} · {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {form.formState.errors.projectId && (
                  <p className="text-xs text-rose-400">
                    {form.formState.errors.projectId.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="object-category" className="text-xs text-slate-400">
                  Kategori Objek
                </Label>
                <Controller
                  control={form.control}
                  name="objectCategory"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        id="object-category"
                        className="border-slate-700 bg-slate-800 text-slate-100"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Batas Area Proyek (Polygon)">
                          Batas Area Proyek (Polygon)
                        </SelectItem>
                        <SelectItem value="Jalur Logistik (Line)">
                          Jalur Logistik (Line)
                        </SelectItem>
                        <SelectItem value="Titik Hambatan/Temuan (Point)">
                          Titik Hambatan/Temuan (Point)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
            {!selectedProjectId && (
              <p className="text-xs text-slate-400">
                Survei ini berstatus pra-proyek dan tidak terikat kontrak. Pilih kode proyek hanya jika survei terkait langsung dengan proyek yang berjalan.
              </p>
            )}
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Seksi 2: Detail Survei & Kondisi Lapangan
            </h2>
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="vegetation-type" className="text-xs text-slate-400">
                  Jenis Vegetasi / Tutupan Lahan
                </Label>
                <Controller
                  control={form.control}
                  name="vegetationType"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger
                        id="vegetation-type"
                        className="border-slate-700 bg-slate-800 text-slate-100"
                      >
                        <SelectValue placeholder="Pilih tutupan lahan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Pilih jenis</SelectItem>
                        <SelectItem value="Semak Belukar">Semak Belukar</SelectItem>
                        <SelectItem value="Hutan Sekunder">Hutan Sekunder</SelectItem>
                        <SelectItem value="Tanah Terbuka">Tanah Terbuka</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">Kondisi Topografi</Label>
                <Controller
                  control={form.control}
                  name="topography"
                  render={({ field }) => (
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex min-h-10 flex-wrap items-center gap-2"
                    >
                      {(["Datar", "Bergelombang", "Sangat Curam"] as const).map(
                        (value) => (
                          <Label
                            key={value}
                            htmlFor={`topography-${value}`}
                            className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-2 text-xs text-slate-300"
                          >
                            <RadioGroupItem
                              id={`topography-${value}`}
                              value={value}
                              className="border-slate-500"
                            />
                            {value}
                          </Label>
                        ),
                      )}
                    </RadioGroup>
                  )}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="land-ownership" className="text-xs text-slate-400">
                  Status Kepemilikan Lahan
                </Label>
                <Controller
                  control={form.control}
                  name="landOwnership"
                  render={({ field }) => (
                    <Select
                      value={field.value || "none"}
                      onValueChange={(value) =>
                        field.onChange(value === "none" ? "" : value)
                      }
                    >
                      <SelectTrigger
                        id="land-ownership"
                        className="border-slate-700 bg-slate-800 text-slate-100"
                      >
                        <SelectValue placeholder="Pilih status lahan" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Pilih status</SelectItem>
                        <SelectItem value="Lahan Negara">Lahan Negara</SelectItem>
                        <SelectItem value="Masyarakat">Masyarakat</SelectItem>
                        <SelectItem value="Dalam Sengketa">Dalam Sengketa</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </section>

          <section className="space-y-3 border-t border-slate-800 pt-4">
            <h2 className="text-sm font-semibold text-slate-100">
              Seksi 3: Dokumentasi & Catatan Lapangan
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="survey-notes" className="text-xs text-slate-400">
                  Catatan Lapangan & Rekomendasi
                </Label>
                <Textarea
                  id="survey-notes"
                  {...form.register("notes")}
                  placeholder="Catatan kondisi lapangan, akses, rekomendasi..."
                  maxLength={5000}
                  rows={5}
                  className="h-full min-h-28 resize-y border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500"
                />
                {form.formState.errors.notes && (
                  <p className="text-xs text-rose-400">
                    {form.formState.errors.notes.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">
                  Unggah Foto Dokumentasi & Lampiran
                </Label>
                <div className="flex min-h-32 flex-wrap items-center gap-2 rounded-lg border border-dashed border-slate-700 bg-slate-800/70 p-3">
                  {documentationUrls.map((url, index) => (
                    <div
                      key={url}
                      className="group relative size-16 overflow-hidden rounded-md border border-slate-600 bg-cover bg-center"
                      style={{ backgroundImage: `url("${url}")` }}
                    >
                      <button
                        type="button"
                        aria-label={`Hapus foto ${index + 1}`}
                        onClick={() =>
                          form.setValue(
                            "documentationUrls",
                            documentationUrls.filter((item) => item !== url),
                            { shouldDirty: true },
                          )
                        }
                        className="absolute right-1 top-1 rounded bg-slate-950/80 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                      >
                        <Trash2 className="size-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                  {cloudinaryCloudName && cloudinaryApiKey ? (
                    <CldUploadWidget
                      config={{
                        cloud: {
                          cloudName: cloudinaryCloudName,
                          apiKey: cloudinaryApiKey,
                        },
                      }}
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
                        if (
                          result.event === "success" &&
                          typeof result.info === "object" &&
                          result.info !== null &&
                          "secure_url" in result.info &&
                          typeof result.info.secure_url === "string"
                        ) {
                          const current =
                            form.getValues("documentationUrls");
                          if (current.length >= 10) {
                            setUploadError(
                              "Maksimal 10 foto dokumentasi per survei.",
                            );
                            return;
                          }
                          form.setValue(
                            "documentationUrls",
                            [...current, result.info.secure_url],
                            { shouldDirty: true, shouldValidate: true },
                          );
                          setUploadError("");
                        }
                      }}
                      onError={(error) => {
                        console.error("Field survey photo upload failed:", error);
                        setUploadError(
                          "Foto dokumentasi gagal diunggah. Silakan coba kembali.",
                        );
                      }}
                    >
                      {({ open }) => (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={documentationUrls.length >= 10}
                          onClick={() => open()}
                          className="size-16 border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
                          aria-label="Unggah foto dokumentasi"
                        >
                          <ImagePlus className="size-5" aria-hidden="true" />
                        </Button>
                      )}
                    </CldUploadWidget>
                  ) : (
                    <p role="alert" className="text-xs text-rose-300">
                      Upload tidak tersedia. Periksa konfigurasi Cloudinary.
                    </p>
                  )}
                  {documentationUrls.length === 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Camera className="size-4" aria-hidden="true" />
                      JPG, PNG, atau WEBP · maksimal 8 MB/foto
                    </div>
                  )}
                </div>
                {uploadError && (
                  <p role="alert" className="text-xs text-rose-400">
                    {uploadError}
                  </p>
                )}
                <p className="text-[11px] text-slate-500">
                  {documentationUrls.length}/10 foto terunggah.
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs sm:grid-cols-2">
            <p className="text-slate-400">
              Surveyor: <span className="text-slate-200">{surveyorName}</span>
            </p>
            <p className="text-slate-400">
              Geometri: <span className="text-slate-200">{geometryType || "—"}</span>
            </p>
            <p className="text-slate-400">
              Koordinat pusat:{" "}
              <span className="text-slate-200">{centerCoordinate || "—"}</span>
            </p>
            <p className="text-slate-400">
              Keliling:{" "}
              <span className="text-slate-200">
                {perimeterM > 0
                  ? `${new Intl.NumberFormat("id-ID", {
                      maximumFractionDigits: 1,
                    }).format(perimeterM)} meter`
                  : "—"}
              </span>
            </p>
            <p className="text-slate-400 sm:col-span-2">
              Waktu pengambilan:{" "}
              <span className="text-slate-200">{captureTime}</span>
            </p>
          </section>

          {surveys.length > 0 && (
            <details className="rounded-lg border border-slate-800 bg-slate-950/30 p-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-xs font-semibold text-slate-300">
                <Clock3 className="size-4" aria-hidden="true" />
                Survei tersimpan ({surveys.length})
              </summary>
              <ul className="mt-3 space-y-2">
                {surveys.map((survey) => (
                  <li key={survey.id}>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto w-full justify-start border-slate-700 bg-slate-900 p-2 text-left text-xs text-slate-300 hover:bg-slate-800"
                      disabled={loadingSurveyId !== null}
                      onClick={() => void handleLoadSurvey(survey)}
                    >
                      {loadingSurveyId === survey.id ? (
                        <LoaderCircle className="mr-2 size-4 animate-spin" />
                      ) : (
                        <FileUp className="mr-2 size-4" />
                      )}
                      {survey.surveyName || survey.locationName} ·{" "}
                      {survey.projectId
                        ? survey.projectName
                        : "Survei Pra-Proyek"}
                    </Button>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {status && (
            <p
              role={status.type === "error" ? "alert" : "status"}
              className={`flex items-start gap-2 rounded-md border p-2.5 text-xs ${
                status.type === "error"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              }`}
            >
              {status.type === "error" ? (
                <AlertCircle className="size-4 shrink-0" />
              ) : (
                <Check className="size-4 shrink-0" />
              )}
              {status.message}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-800 bg-slate-950/30 p-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800"
          >
            Batal
          </Button>
          <Button
            type="submit"
            disabled={isPending || geoJsonData.features.length === 0}
            className="bg-orange-500 text-white hover:bg-orange-600"
          >
            {isPending ? (
              <LoaderCircle className="mr-2 size-4 animate-spin" />
            ) : (
              <Check className="mr-2 size-4" aria-hidden="true" />
            )}
            {isPending ? "Menyimpan..." : "Simpan Data & Spasial"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
