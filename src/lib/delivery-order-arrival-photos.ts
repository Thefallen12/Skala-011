import { join, resolve } from "node:path";
import {
  removeCloudinaryPhoto,
} from "@/lib/cloudinary-photos";
import {
  PrivatePhotoValidationError,
  readPrivatePhoto,
  removePrivatePhoto,
  savePrivatePhoto,
  type PrivatePhotoMimeType,
} from "@/lib/private-photos";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const photoDirectory = process.env.DO_ARRIVAL_PHOTO_UPLOAD_DIR
  ? resolve(process.env.DO_ARRIVAL_PHOTO_UPLOAD_DIR)
  : join(process.cwd(), ".private-data", "delivery-order-arrival-photos");

type ArrivalPhotoMimeType = PrivatePhotoMimeType;

export class DeliveryOrderArrivalPhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryOrderArrivalPhotoValidationError";
  }
}

export async function saveDeliveryOrderArrivalPhoto(
  file: File,
): Promise<string> {
  try {
    const photo = await savePrivatePhoto(
      file,
      photoDirectory,
      "/api/documents/do/arrival-photo",
      MAX_PHOTO_BYTES,
    );
    return photo.url;
  } catch (error) {
    if (error instanceof PrivatePhotoValidationError) {
      throw new DeliveryOrderArrivalPhotoValidationError(error.message);
    }
    throw error;
  }
}

export async function removeDeliveryOrderArrivalPhoto(url: string): Promise<void> {
  if (await removeCloudinaryPhoto(url)) return;
  await removePrivatePhoto(
    url,
    photoDirectory,
    "/api/documents/do/arrival-photo",
  );
}

export async function readDeliveryOrderArrivalPhoto(
  fileName: string,
): Promise<{ bytes: Uint8Array; contentType: ArrivalPhotoMimeType } | null> {
  return readPrivatePhoto(fileName, photoDirectory);
}
