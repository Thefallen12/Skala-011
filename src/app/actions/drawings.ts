"use server";

import { revalidatePath } from "next/cache";
import { UserRole } from "@/generated/prisma/enums";
import { auth } from "../../../auth";
import { prisma } from "@/lib/prisma";
import {
  DRAWING_CATEGORIES,
  DRAWING_DOCUMENT_CLOUDINARY_FOLDER,
  DRAWING_FILE_EXTENSIONS,
} from "@/lib/drawing-document-config";
import {
  drawingReviewRoles,
  drawingUploadRoles,
} from "@/lib/user-access";

export type DrawingActionResult = {
  success: boolean;
  message: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDrawingFileUrl(value: string): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloudName) return false;

  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const [urlCloudName, resourceType] = segments;
    const uploadIndex = segments.indexOf("upload");
    const assetPath = segments
      .slice(uploadIndex + 1)
      .filter((segment) => !/^v\d+$/.test(segment));
    const fileName = assetPath.at(-1) ?? "";
    const extension = fileName.split(".").at(-1)?.toLowerCase();
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      urlCloudName === cloudName &&
      (resourceType === "image" || resourceType === "raw") &&
      uploadIndex > 0 &&
      assetPath.join("/").startsWith(`${DRAWING_DOCUMENT_CLOUDINARY_FOLDER}/`) &&
      DRAWING_FILE_EXTENSIONS.some((allowedExtension) => allowedExtension === extension)
    );
  } catch {
    return false;
  }
}

function isDrawingImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments[0] === process.env.CLOUDINARY_CLOUD_NAME && segments[1] === "image";
  } catch {
    return false;
  }
}

async function getActiveActor(roles: readonly UserRole[]) {
  const session = await auth();
  if (!session?.user?.id || !roles.includes(session.user.role)) return null;

  const actor = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  });
  if (!actor?.isActive || !roles.includes(actor.role)) return null;
  return actor;
}

export async function createDrawingDocument(input: unknown): Promise<DrawingActionResult> {
  const actor = await getActiveActor(drawingUploadRoles);
  if (!actor) {
    return { success: false, message: "Akses upload gambar kerja tidak diizinkan." };
  }
  if (!isRecord(input)) {
    return { success: false, message: "Data gambar kerja tidak valid." };
  }

  const drawingCode =
    typeof input.drawingCode === "string"
      ? input.drawingCode.trim().toUpperCase()
      : "";
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const category = typeof input.category === "string" ? input.category : "";
  const projectId =
    typeof input.projectId === "string" && input.projectId
      ? input.projectId
      : null;
  const fileUrl = typeof input.fileUrl === "string" ? input.fileUrl.trim() : "";
  const thumbnailUrl =
    typeof input.thumbnailUrl === "string" ? input.thumbnailUrl.trim() : "";

  if (
    !/^[A-Z0-9][A-Z0-9._-]{3,49}$/.test(drawingCode) ||
    title.length < 3 ||
    title.length > 180 ||
    !DRAWING_CATEGORIES.some((item) => item === category) ||
    !isDrawingFileUrl(fileUrl) ||
    (thumbnailUrl && !isDrawingFileUrl(thumbnailUrl))
  ) {
    return { success: false, message: "Periksa kode, judul, kategori, dan file gambar." };
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, isDeleted: false },
      select: { id: true },
    });
    if (!project) {
      return { success: false, message: "Proyek tidak ditemukan atau tidak aktif." };
    }
  }

  try {
    await prisma.drawingDocument.create({
      data: {
        drawingCode,
        projectId,
        title,
        category,
        status: "REVIEW",
        version: 0,
        fileUrl,
        thumbnailUrl: thumbnailUrl || null,
        uploadedById: actor.id,
        logs: {
          create: {
            action: "UPLOADED",
            notes: "Dokumen gambar kerja pertama diunggah untuk ditinjau.",
            version: 0,
            fileUrl,
            createdById: actor.id,
          },
        },
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return { success: false, message: "ID gambar sudah digunakan." };
    }
    console.error("Creating drawing document failed:", error);
    return { success: false, message: "Gambar kerja gagal disimpan." };
  }

  revalidatePath("/apps/drafter");
  return { success: true, message: "Gambar kerja berhasil diunggah untuk ditinjau." };
}

export async function uploadDrawingRevision(
  drawingId: string,
  fileUrl: string,
  notes: string,
): Promise<DrawingActionResult> {
  const actor = await getActiveActor(drawingUploadRoles);
  if (!actor) {
    return { success: false, message: "Akses upload revisi tidak diizinkan." };
  }
  if (
    typeof drawingId !== "string" ||
    !drawingId ||
    typeof fileUrl !== "string" ||
    !isDrawingFileUrl(fileUrl) ||
    typeof notes !== "string" ||
    notes.trim().length > 2000
  ) {
    return { success: false, message: "Data revisi tidak valid." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.drawingDocument.findUnique({
        where: { id: drawingId },
        select: { id: true, version: true },
      });
      if (!current) throw new Error("DRAWING_NOT_FOUND");

      const updated = await transaction.drawingDocument.update({
        where: { id: current.id },
        data: {
          version: { increment: 1 },
          fileUrl,
          thumbnailUrl: isDrawingImageUrl(fileUrl) ? fileUrl : undefined,
          status: "REVIEW",
        },
        select: { version: true },
      });
      await transaction.drawingLog.create({
        data: {
          drawingId: current.id,
          action: "REVISED",
          notes: notes.trim() || null,
          version: updated.version,
          fileUrl,
          createdById: actor.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DRAWING_NOT_FOUND") {
      return { success: false, message: "Gambar kerja tidak ditemukan." };
    }
    console.error("Uploading drawing revision failed:", error);
    return { success: false, message: "Revisi gagal disimpan." };
  }

  revalidatePath("/apps/drafter");
  return { success: true, message: "Revisi berhasil diunggah dan masuk antrean review." };
}

export async function reviewDrawingDocument(
  drawingId: string,
  status: "REVISION_NEEDED" | "APPROVED",
  notes: string,
): Promise<DrawingActionResult> {
  const actor = await getActiveActor(drawingReviewRoles);
  if (!actor) {
    return { success: false, message: "Akses review gambar kerja tidak diizinkan." };
  }
  if (
    typeof drawingId !== "string" ||
    !drawingId ||
    (status !== "REVISION_NEEDED" && status !== "APPROVED") ||
    typeof notes !== "string" ||
    notes.trim().length > 2000 ||
    (status === "REVISION_NEEDED" && notes.trim().length < 3)
  ) {
    return { success: false, message: "Status atau catatan review tidak valid." };
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const current = await transaction.drawingDocument.findUnique({
        where: { id: drawingId },
        select: { id: true, version: true, status: true },
      });
      if (!current) throw new Error("DRAWING_NOT_FOUND");
      if (current.status !== "REVIEW") throw new Error("DRAWING_NOT_IN_REVIEW");

      await transaction.drawingDocument.update({
        where: { id: current.id },
        data: { status },
      });
      await transaction.drawingLog.create({
        data: {
          drawingId: current.id,
          action: status === "APPROVED" ? "APPROVED" : "REVIEWED",
          notes: notes.trim() || null,
          version: current.version,
          createdById: actor.id,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DRAWING_NOT_FOUND") {
      return { success: false, message: "Gambar kerja tidak ditemukan." };
    }
    if (error instanceof Error && error.message === "DRAWING_NOT_IN_REVIEW") {
      return { success: false, message: "Hanya gambar dalam antrean review yang dapat diproses." };
    }
    console.error("Reviewing drawing document failed:", error);
    return { success: false, message: "Review gambar kerja gagal disimpan." };
  }

  revalidatePath("/apps/drafter");
  return {
    success: true,
    message:
      status === "APPROVED"
        ? "Gambar kerja disetujui."
        : "Permintaan revisi berhasil dikirim.",
  };
}
