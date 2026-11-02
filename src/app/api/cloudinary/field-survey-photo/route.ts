import { NextResponse } from "next/server";
import { auth } from "../../../../../auth";
import { UserRole } from "@/generated/prisma/enums";
import { uploadCloudinaryPhoto } from "@/lib/cloudinary-photos";
import { FIELD_SURVEY_PHOTO_CLOUDINARY_FOLDER } from "@/lib/field-survey-photo-config";

const surveyRoles: UserRole[] = [
  UserRole.ADMINISTRATIONS,
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.KOORDINATOR,
  UserRole.FIELD_TEAM,
  UserRole.DRAFTER,
];

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !surveyRoles.includes(session.user.role)) {
    return NextResponse.json({ error: "Akses ditolak." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const surveyId = formData.get("surveyId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "File foto tidak ditemukan." },
        { status: 400 },
      );
    }

    if (typeof surveyId !== "string" || surveyId.trim().length === 0) {
      return NextResponse.json(
        { error: "Identitas survei tidak valid." },
        { status: 400 },
      );
    }

    const uploaded = await uploadCloudinaryPhoto(
      file,
      FIELD_SURVEY_PHOTO_CLOUDINARY_FOLDER,
      8 * 1024 * 1024,
    );

    return NextResponse.json({
      success: true,
      surveyId,
      secureUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
    });
  } catch (error) {
    console.error("Cloudinary field survey photo upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Upload foto survei gagal.",
      },
      { status: 500 },
    );
  }
}
