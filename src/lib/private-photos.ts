import { readFile, rm } from "node:fs/promises";
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

function photoPath(fileName: string, directory: string): string | null {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(fileName)) return null;
  return join(directory, fileName);
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
