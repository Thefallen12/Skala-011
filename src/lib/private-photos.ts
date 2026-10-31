import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const photoExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type PrivatePhotoMimeType = keyof typeof photoExtensions;

export class PrivatePhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrivatePhotoValidationError";
  }
}

function isPrivatePhotoMimeType(value: string): value is PrivatePhotoMimeType {
  return Object.hasOwn(photoExtensions, value);
}

function hasValidSignature(
  bytes: Uint8Array,
  mimeType: PrivatePhotoMimeType,
): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return (
    new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP"
  );
}

function photoPath(fileName: string, directory: string): string | null {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(fileName)) return null;
  return join(directory, fileName);
}

export async function savePrivatePhoto(
  file: File,
  directory: string,
  urlPrefix: string,
  maxBytes: number,
): Promise<{ url: string; fileName: string; mimeType: PrivatePhotoMimeType }> {
  if (!(file instanceof File) || file.size < 1 || file.size > maxBytes) {
    throw new PrivatePhotoValidationError(
      `Ukuran foto harus lebih dari 0 dan maksimal ${Math.floor(maxBytes / (1024 * 1024))} MB.`,
    );
  }
  if (!isPrivatePhotoMimeType(file.type)) {
    throw new PrivatePhotoValidationError("Format foto harus JPG, PNG, atau WEBP.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, file.type)) {
    throw new PrivatePhotoValidationError(
      "Isi file tidak sesuai dengan format foto yang dipilih.",
    );
  }

  const fileName = `${randomUUID()}.${photoExtensions[file.type]}`;
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(join(/* turbopackIgnore: true */ directory, fileName), bytes, {
    flag: "wx",
    mode: 0o600,
  });

  return {
    url: `${urlPrefix}/${fileName}`,
    fileName,
    mimeType: file.type,
  };
}

export async function removePrivatePhoto(
  url: string,
  directory: string,
  urlPrefix: string,
): Promise<boolean> {
  let pathname: string;
  try {
    pathname = new URL(url, "http://localhost").pathname;
  } catch {
    return false;
  }

  const prefix = `${urlPrefix}/`;
  if (!pathname.startsWith(prefix)) return false;
  const path = photoPath(pathname.slice(prefix.length), directory);
  if (!path) return false;
  await rm(path, { force: true });
  return true;
}

export async function readPrivatePhoto(
  fileName: string,
  directory: string,
): Promise<{ bytes: Uint8Array; contentType: PrivatePhotoMimeType } | null> {
  const path = photoPath(fileName, directory);
  if (!path) return null;

  const extension = fileName.split(".").at(-1);
  const contentType =
    extension === "jpg"
      ? "image/jpeg"
      : extension === "png"
        ? "image/png"
        : "image/webp";

  try {
    return {
      bytes: new Uint8Array(await readFile(/* turbopackIgnore: true */ path)),
      contentType,
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
