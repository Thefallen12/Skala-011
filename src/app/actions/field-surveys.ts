"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
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
  projectId: z.string().trim().min(1).max(100),
  locationName: z.string().trim().min(2, "Nama lokasi minimal 2 karakter.").max(160),
  responsibleName: z
    .string()
    .trim()
    .min(2, "Nama penanggung jawab minimal 2 karakter.")
    .max(120),
  notes: z.string().trim().max(5000, "Catatan maksimal 5.000 karakter."),
  geoJsonData: z.unknown(),
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
  projectId: string;
  locationName: string;
  responsibleName: string;
  notes: string;
  geoJsonData: SurveyGeoJSON;
};

export async function saveFieldSurvey(input: SaveFieldSurveyInput): Promise<{
  success: boolean;
  message: string;
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

  const { projectId, locationName, responsibleName, notes, geoJsonData } =
    parsed.data;
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

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      isDeleted: false,
      ...(restrictedProjectRoles.includes(surveyor.role)
        ? { fieldPicId: surveyor.id }
        : {}),
    },
    select: { id: true, title: true, name: true },
  });
  if (!project) {
    return {
      success: false,
      message: "Proyek tidak ditemukan atau Anda tidak ditugaskan pada proyek ini.",
    };
  }

  const measurements = measureSurveyGeoJSON(geoJsonData);
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
    await prisma.fieldSurvey.create({
      data: {
        projectId: project.id,
        projectName: project.title || project.name,
        locationName,
        responsibleName,
        surveyorId: surveyor.id,
        geoJsonData: geoJsonData as object,
        areaSqm: measurements.areaSqm,
        lengthM: measurements.lengthM,
        perimeterM: measurements.perimeterM,
        notes: notes || null,
      },
    });

    revalidatePath("/apps/projects/map");
    return { success: true, message: "Data survei berhasil disimpan." };
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
        project: {
          isDeleted: false,
          ...(restrictedProjectRoles.includes(surveyor.role)
            ? { fieldPicId: surveyor.id }
            : {}),
        },
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
