import { join, resolve } from "node:path";
import {
  deleteCloudinaryPhoto,
  removeCloudinaryPhoto,
} from "@/lib/cloudinary-photos";
import {
  readPrivatePhoto,
  removePrivatePhoto,
  savePrivatePhoto,
  type PrivatePhotoMimeType,
} from "@/lib/private-photos";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const photoDirectory = process.env.PROJECT_PROGRESS_UPLOAD_DIR
  ? resolve(process.env.PROJECT_PROGRESS_UPLOAD_DIR)
  : join(process.cwd(), ".private-data", "project-progress-photos");

type ProgressPhotoMimeType = PrivatePhotoMimeType;

export type StoredProjectProgressPhoto = {
  url: string;
  fileUrl: string;
  publicId: string | null;
};

async function saveProjectProgressPhotoToDisk(
  file: File,
  urlPrefix: string,
): Promise<StoredProjectProgressPhoto> {
  const photo = await savePrivatePhoto(
    file,
    photoDirectory,
    urlPrefix,
    MAX_PHOTO_BYTES,
  );
  return {
    url: photo.url,
    fileUrl: photo.url,
    publicId: null,
  };
}

export async function saveProjectProgressPhoto(
  file: File,
): Promise<StoredProjectProgressPhoto> {
  return saveProjectProgressPhotoToDisk(
    file,
    "/api/projects/progress-photos",
  );
}

export async function saveProjectWorkPointPhoto(
  file: File,
): Promise<StoredProjectProgressPhoto> {
  return saveProjectProgressPhotoToDisk(
    file,
    "/api/projects/work-point-photos",
  );
}

export async function removeProjectProgressPhoto(
  photo: string | { url: string; publicId?: string | null },
): Promise<void> {
  const url = typeof photo === "string" ? photo : photo.url;
  const publicId = typeof photo === "string" ? null : photo.publicId;
  if (publicId) {
    await deleteCloudinaryPhoto(publicId);
    return;
  }

  if (await removeCloudinaryPhoto(url)) return;
  if (
    await removePrivatePhoto(
      url,
      photoDirectory,
      "/api/projects/progress-photos",
    )
  ) {
    return;
  }
  await removePrivatePhoto(
    url,
    photoDirectory,
    "/api/projects/work-point-photos",
  );
}

export async function readProjectProgressPhoto(
  fileName: string,
): Promise<{ bytes: Uint8Array; contentType: ProgressPhotoMimeType } | null> {
  return readPrivatePhoto(fileName, photoDirectory);
}
