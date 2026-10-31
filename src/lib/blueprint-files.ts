import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const MAX_BLUEPRINT_BYTES = 25 * 1024 * 1024;
const blueprintDirectory = process.env.BLUEPRINT_UPLOAD_DIR
  ? resolve(process.env.BLUEPRINT_UPLOAD_DIR)
  : join(process.cwd(), ".private-data", "blueprints");

const mimeExtensions = {
  "application/pdf": "pdf",
  "application/acad": "dwg",
  "application/x-acad": "dwg",
  "application/autocad_dwg": "dwg",
  "image/vnd.dxf": "dxf",
  "application/dxf": "dxf",
  "application/x-dxf": "dxf",
  "application/octet-stream": "unknown",
} as const;

type BlueprintExtension = "pdf" | "dwg" | "dxf";

export class BlueprintFileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlueprintFileValidationError";
  }
}

function hasValidSignature(bytes: Uint8Array, extension: BlueprintExtension) {
  if (extension === "pdf") {
    return new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
  }
  if (extension === "dwg") {
    return /^AC10[0-9]{2}$/.test(new TextDecoder().decode(bytes.subarray(0, 6)));
  }
  const header = new TextDecoder().decode(bytes.subarray(0, 512)).trimStart();
  return /^0\s*\r?\nSECTION\b/i.test(header) || /^AutoCAD DXF/i.test(header);
}

function filePath(fileName: string) {
  return /^[0-9a-f-]{36}\.(pdf|dwg|dxf)$/i.test(fileName)
    ? join(blueprintDirectory, fileName)
    : null;
}

export async function saveBlueprintFile(file: File): Promise<string> {
  if (
    !(file instanceof File) ||
    file.size < 1 ||
    file.size > MAX_BLUEPRINT_BYTES
  ) {
    throw new BlueprintFileValidationError(
      "Ukuran gambar kerja harus lebih dari 0 dan maksimal 25 MB.",
    );
  }
  const extensionFromName = file.name.split(".").at(-1)?.toLowerCase();
  if (
    extensionFromName !== "pdf" &&
    extensionFromName !== "dwg" &&
    extensionFromName !== "dxf"
  ) {
    throw new BlueprintFileValidationError(
      "Format gambar kerja harus PDF, DWG, atau DXF.",
    );
  }
  const declaredExtension = mimeExtensions[file.type as keyof typeof mimeExtensions];
  if (
    declaredExtension &&
    declaredExtension !== "unknown" &&
    declaredExtension !== extensionFromName
  ) {
    throw new BlueprintFileValidationError(
      "Ekstensi file tidak sesuai dengan format yang dipilih.",
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, extensionFromName)) {
    throw new BlueprintFileValidationError(
      "Isi file tidak sesuai dengan format gambar kerja yang dipilih.",
    );
  }

  const fileName = `${randomUUID()}.${extensionFromName}`;
  await mkdir(blueprintDirectory, { recursive: true });
  await writeFile(
    join(/* turbopackIgnore: true */ blueprintDirectory, fileName),
    bytes,
    { flag: "wx" },
  );
  return `/api/projects/blueprints/${fileName}`;
}

export async function removeBlueprintFile(url: string): Promise<void> {
  const fileName = url.split("/").at(-1) ?? "";
  const path = filePath(fileName);
  if (!path) return;
  await rm(path, { force: true });
}

export async function readBlueprintFile(fileName: string) {
  const path = filePath(fileName);
  if (!path) return null;
  const extension = fileName.split(".").at(-1);
  const contentType =
    extension === "pdf"
      ? "application/pdf"
      : extension === "dwg"
        ? "application/acad"
        : "image/vnd.dxf";
  try {
    return {
      bytes: new Uint8Array(await readFile(/* turbopackIgnore: true */ path)),
      contentType,
      extension,
    };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}
