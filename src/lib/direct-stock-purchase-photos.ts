import { join, resolve } from "node:path";
import {
  removeCloudinaryPhoto,
  getCloudinaryPublicId,
} from "@/lib/cloudinary-photos";
import { DIRECT_STOCK_PURCHASE_PHOTO_CLOUDINARY_FOLDER } from "@/lib/direct-stock-purchase-photo-config";
import {
  PrivatePhotoValidationError,
  readPrivatePhoto,
  removePrivatePhoto,
  savePrivatePhoto,
  type PrivatePhotoMimeType,
} from "@/lib/private-photos";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const photoDirectory = process.env.DIRECT_STOCK_PURCHASE_PHOTO_UPLOAD_DIR
  ? resolve(process.env.DIRECT_STOCK_PURCHASE_PHOTO_UPLOAD_DIR)
  : join(process.cwd(), ".private-data", "direct-stock-purchase-photos");

type PhotoMimeType = PrivatePhotoMimeType;

export class DirectStockPurchasePhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectStockPurchasePhotoValidationError";
  }
}

export async function saveDirectStockPurchasePhoto(file: File): Promise<string> {
  try {
    const photo = await savePrivatePhoto(
      file,
      photoDirectory,
      "/api/logistics/direct-stock-purchase-photo",
      MAX_PHOTO_BYTES,
    );
    return photo.url;
  } catch (error) {
    if (error instanceof PrivatePhotoValidationError) {
      throw new DirectStockPurchasePhotoValidationError(error.message);
    }
    throw error;
  }
}

export async function removeDirectStockPurchasePhoto(url: string): Promise<void> {
  if (await removeCloudinaryPhoto(url)) return;
  await removePrivatePhoto(
    url,
    photoDirectory,
    "/api/logistics/direct-stock-purchase-photo",
  );
}

export function isDirectStockPurchaseCloudinaryPhotoUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const publicId = getCloudinaryPublicId(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      Boolean(
        publicId?.startsWith(
          `${DIRECT_STOCK_PURCHASE_PHOTO_CLOUDINARY_FOLDER}/`,
        ),
      )
    );
  } catch {
    return false;
  }
}

export async function readDirectStockPurchasePhoto(
  fileName: string,
): Promise<{ bytes: Uint8Array; contentType: PhotoMimeType } | null> {
  return readPrivatePhoto(fileName, photoDirectory);
}
