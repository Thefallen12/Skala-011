"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { area, center, length } from "@turf/turf";
import {
  isSurveyGeoJSON,
  isSurveyGeoJSONWithinLimit,
  measureSurveyGeoJSON,
  type SurveyGeoJSON,
} from "@/lib/field-survey-geojson";
import { auth } from "../../../auth";
import { z } from "zod";

const surveyRoles: UserRole[] = [
  UserRole.ADMINISTRATIONS,
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.KOORDINATOR,
  UserRole.FIELD_TEAM,
  UserRole.DRAFTER,
];

const restrictedProjectRoles: UserRole[] = [
  UserRole.KOORDINATOR,
  UserRole.FIELD_TEAM,
];

const saveSurveySchema = z.object({
  projectId: z.string().trim().max(100).nullable().optional(),
  locationName: z.string().trim().min(2, "Nama lokasi minimal 2 karakter.").max(160),
  responsibleName: z
    .string()
    .trim()
    .min(2, "Nama penanggung jawab minimal 2 karakter.")
    .max(120),
  notes: z.string().trim().max(5000, "Catatan maksimal 5.000 karakter."),
  surveyName: z.string().trim().min(2).max(160).optional(),
  objectCategory: z
    .enum([
      "Batas Area Proyek (Polygon)",
      "Jalur Logistik (Line)",
      "Titik Hambatan/Temuan (Point)",
    ])
    .optional(),
  vegetationType: z.string().trim().max(120).optional(),
  topography: z.string().trim().max(120).optional(),
  landOwnership: z.string().trim().max(120).optional(),
  documentationUrls: z
    .array(
      z
        .string()
        .url()
        .refine((value) => {
          return value.startsWith("https://res.cloudinary.com/");
        }, "URL dokumentasi harus berasal dari Cloudinary."),
    )
    .max(10)
    .optional(),
  documentationPhotos: z.array(z.object({
    url: z.string().url(),
    caption: z.string().trim().min(2).max(500),
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
    capturedAt: z.string().datetime().optional(),
  })).max(10).optional(),
  geoJsonData: z.unknown(),
  features: z.array(z.object({
    featureCategory: z.string().trim().min(2).max(120),
    name: z.string().trim().min(2).max(160),
    description: z.string().trim().max(5000).optional(),
    geometryType: z.string().trim().min(2).max(80),
    geoJsonData: z.unknown(),
    photoUrls: z.array(z.string().url()).max(10).optional(),
  })).max(200).optional(),
});

async function getActiveSurveyor() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, role: true, isActive: true },
  });

  return user?.isActive && surveyRoles.includes(user.role) ? user : null;
}

export type SaveFieldSurveyInput = {
  projectId: string | null;
  locationName: string;
  responsibleName: string;
  notes: string;
  surveyName?: string;
  objectCategory?: string;
  vegetationType?: string;
  topography?: string;
  landOwnership?: string;
  documentationUrls?: string[];
  documentationPhotos?: Array<{
    url: string;
    caption: string;
    latitude: number;
    longitude: number;
    capturedAt?: string;
  }>;
  geoJsonData: SurveyGeoJSON;
  surveyType?: string;
  features?: Array<{
    featureCategory: string;
    name: string;
    description?: string;
    geometryType: string;
    geoJsonData: SurveyGeoJSON["features"][number];
    photoUrls?: string[];
  }>;
};

export async function saveFieldSurvey(input: SaveFieldSurveyInput): Promise<{
  success: boolean;
  message: string;
  surveyId?: string;
}> {
  const surveyor = await getActiveSurveyor();
  if (!surveyor) {
    return { success: false, message: "Sesi atau akses pengguna tidak valid." };
  }

  const parsed = saveSurveySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Data survei tidak valid.",
    };
  }

  const {
    projectId,
    locationName,
    notes,
    geoJsonData,
    surveyName,
    objectCategory,
    vegetationType,
    topography,
    landOwnership,
    documentationUrls,
    documentationPhotos,
    features,
  } = parsed.data;
  if (!isSurveyGeoJSON(geoJsonData)) {
    return {
      success: false,
      message: "GeoJSON tidak valid atau jumlah fiturnya di luar batas.",
    };
  }
  if (!isSurveyGeoJSONWithinLimit(geoJsonData)) {
    return {
      success: false,
      message: "Ukuran GeoJSON melebihi batas 20 MB.",
    };
  }

  const project = projectId
    ? await prisma.project.findFirst({
        where: {
          id: projectId,
          isDeleted: false,
          ...(restrictedProjectRoles.includes(surveyor.role)
            ? { fieldPicId: surveyor.id }
            : {}),
        },
        select: { id: true, title: true, name: true, code: true },
      })
    : null;
  if (projectId && !project) {
    return {
      success: false,
      message: "Proyek tidak ditemukan atau Anda tidak ditugaskan pada proyek ini.",
    };
  }

  const measurements = measureSurveyGeoJSON(geoJsonData);
  const featuresWithGeometry = geoJsonData.features.filter(
    (feature) => feature.geometry,
  );
  if (featuresWithGeometry.length === 0) {
    return {
      success: false,
      message: "GeoJSON harus berisi minimal satu geometri yang valid.",
    };
  }
  const geometryTypes = [
    ...new Set(
      featuresWithGeometry.flatMap((feature) =>
        feature.geometry ? [feature.geometry.type] : [],
      ),
    ),
  ];
  const [longitude, latitude] = center({
    type: "FeatureCollection",
    features: featuresWithGeometry,
  }).geometry.coordinates;
  if (
    !Number.isFinite(measurements.areaSqm) ||
    !Number.isFinite(measurements.lengthM) ||
    !Number.isFinite(measurements.perimeterM)
  ) {
    return {
      success: false,
      message: "Koordinat tidak dapat dihitung. Pastikan data menggunakan WGS84.",
    };
  }

  try {
    const survey = await prisma.fieldSurvey.create({
      data: {
        projectId: project?.id ?? null,
        projectName: project
          ? project.title || project.name
          : "Survei Pra-Proyek",
        locationName,
        responsibleName: surveyor.name,
        surveyorId: surveyor.id,
        surveyName: surveyName || locationName,
        projectCode: project?.code ?? null,
        objectCategory:
          objectCategory ?? "Batas Area Proyek (Polygon)",
        vegetationType: vegetationType || null,
        topography: topography || null,
        landOwnership: landOwnership || null,
        documentationUrls: documentationUrls ?? [],
        geometryType: geometryTypes.join(", "),
        centerCoordinate: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        geoJsonData: geoJsonData as object,
        areaSqm: measurements.areaSqm,
        lengthM: measurements.lengthM,
        perimeterM: measurements.perimeterM,
        notes: notes || null,
        surveyType: "REHAB_SAWAH",
        features: features?.length
          ? {
              create: features.map((feature) => {
                const geoJsonFeature = feature.geoJsonData as SurveyGeoJSON["features"][number];
                const geometry = geoJsonFeature.geometry;
                const featureMeasurement = geometry
                  ? {
                      areaSqm:
                        geometry.type === "Polygon" ||
                        geometry.type === "MultiPolygon"
                          ? area(geoJsonFeature as never)
                          : null,
                      lengthM:
                        geometry.type === "LineString" ||
                        geometry.type === "MultiLineString" ||
                        geometry.type === "Polygon" ||
                        geometry.type === "MultiPolygon"
                          ? length(geoJsonFeature as never, { units: "meters" })
                          : null,
                    }
                  : { areaSqm: null, lengthM: null };
                return {
                  featureCategory: feature.featureCategory,
                  name: feature.name,
                  description: feature.description || null,
                  geometryType: feature.geometryType,
                  geoJsonData: geoJsonFeature as object,
                  areaSqm: featureMeasurement.areaSqm,
                  lengthM: featureMeasurement.lengthM,
                  photoUrls: feature.photoUrls ?? [],
                };
              }),
            }
          : undefined,
        photos: documentationPhotos?.length
          ? {
              create: documentationPhotos.map((photo) => ({
                url: photo.url,
                caption: photo.caption,
                latitude: photo.latitude,
                longitude: photo.longitude,
                capturedAt: photo.capturedAt ? new Date(photo.capturedAt) : undefined,
              })),
            }
          : undefined,
      },
    });

    revalidatePath("/apps/projects");
    return {
      success: true,
      message: "Data survei berhasil disimpan.",
      surveyId: survey.id,
    };
  } catch (error) {
    console.error("Saving field survey failed:", error);
    return {
      success: false,
      message: "Data survei gagal disimpan. Silakan coba kembali.",
    };
  }
}

export async function loadFieldSurveyGeoJSON(
  surveyId: string,
): Promise<{ success: boolean; message: string; data?: SurveyGeoJSON }> {
  const surveyor = await getActiveSurveyor();
  if (!surveyor) {
    return { success: false, message: "Sesi atau akses pengguna tidak valid." };
  }
  if (typeof surveyId !== "string" || surveyId.length > 100) {
    return { success: false, message: "Data survei yang dipilih tidak valid." };
  }

  try {
    const survey = await prisma.fieldSurvey.findFirst({
      where: {
        id: surveyId,
        OR: restrictedProjectRoles.includes(surveyor.role)
          ? [
              {
                project: {
                  isDeleted: false,
                  fieldPicId: surveyor.id,
                },
              },
              { projectId: null, surveyorId: surveyor.id },
            ]
          : [{ project: { isDeleted: false } }, { projectId: null }],
      },
      select: { geoJsonData: true },
    });
    if (
      !survey ||
      !isSurveyGeoJSON(survey.geoJsonData) ||
      !isSurveyGeoJSONWithinLimit(survey.geoJsonData)
    ) {
      return {
        success: false,
        message: "Survei tidak ditemukan atau data spasialnya tidak valid.",
      };
    }

    return { success: true, message: "Data survei berhasil dimuat.", data: survey.geoJsonData };
  } catch (error) {
    console.error("Loading field survey GeoJSON failed:", error);
    return {
      success: false,
      message: "Data survei gagal dimuat. Silakan coba kembali.",
    };
  }
}
