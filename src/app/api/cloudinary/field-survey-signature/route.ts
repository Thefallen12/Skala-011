import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "../../../../../auth";
import { UserRole } from "@/generated/prisma/enums";
import { FIELD_SURVEY_PHOTO_CLOUDINARY_FOLDER } from "@/lib/field-survey-photo-config";

type SignatureParams = Record<string, string | number>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.error("Cloudinary field survey signing is unavailable: configuration is incomplete.");
    return NextResponse.json(
      { error: "Konfigurasi upload foto survei belum lengkap." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  if (!isRecord(body) || !isRecord(body.paramsToSign)) {
    return NextResponse.json(
      { error: "Parameter tanda tangan tidak valid." },
      { status: 400 },
    );
  }

  const rawParams = body.paramsToSign;
  const allowedParams = new Set(["folder", "timestamp"]);
  if (
    Object.keys(rawParams).some((key) => !allowedParams.has(key)) ||
    rawParams.folder !== FIELD_SURVEY_PHOTO_CLOUDINARY_FOLDER ||
    (typeof rawParams.timestamp !== "number" &&
      typeof rawParams.timestamp !== "string")
  ) {
    return NextResponse.json(
      { error: "Parameter upload tidak diizinkan." },
      { status: 400 },
    );
  }

  const timestamp = Number(rawParams.timestamp);
  const now = Math.floor(Date.now() / 1000);
  if (
    !Number.isInteger(timestamp) ||
    timestamp < now - 600 ||
    timestamp > now + 60
  ) {
    return NextResponse.json(
      { error: "Waktu tanda tangan tidak valid." },
      { status: 400 },
    );
  }

  const paramsToSign: SignatureParams = {
    folder: FIELD_SURVEY_PHOTO_CLOUDINARY_FOLDER,
    timestamp,
  };
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  return NextResponse.json({
    signature: cloudinary.utils.api_sign_request(
      paramsToSign,
      CLOUDINARY_API_SECRET,
    ),
  });
}
