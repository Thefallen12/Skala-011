import { join, resolve } from "node:path";
import {
  CloudinaryPhotoValidationError,
  getCloudinaryPublicId,
  uploadCloudinaryPhoto,
} from "@/lib/cloudinary-photos";
import {
  PrivatePhotoValidationError,
  readPrivatePhoto,
} from "@/lib/private-photos";
import { DOCUMENT_TEMPLATE_IMAGE_CLOUDINARY_FOLDER } from "@/lib/document-template-image-config";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const imageDirectory = process.env.DOCUMENT_TEMPLATE_IMAGE_UPLOAD_DIR
  ? resolve(process.env.DOCUMENT_TEMPLATE_IMAGE_UPLOAD_DIR)
  : join(process.cwd(), ".private-data", "document-template-images");

export async function saveDocumentTemplateImage(file: File): Promise<string> {
  try {
    const image = await uploadCloudinaryPhoto(
      file,
      DOCUMENT_TEMPLATE_IMAGE_CLOUDINARY_FOLDER,
      MAX_IMAGE_BYTES,
    );
    return image.secureUrl;
  } catch (error) {
    if (error instanceof CloudinaryPhotoValidationError) {
      throw new PrivatePhotoValidationError(error.message);
    }
    throw error;
  }
}

export async function readDocumentTemplateImage(fileName: string) {
  return readPrivatePhoto(fileName, imageDirectory);
}

export function isDocumentTemplateCloudinaryImageUrl(value: string): boolean {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const publicId = getCloudinaryPublicId(value);
  if (!cloudName || !publicId) return false;

  try {
    const parsed = new URL(value);
    const [urlCloudName, resourceType, deliveryType] = parsed.pathname
      .split("/")
      .filter(Boolean);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      urlCloudName === cloudName &&
      resourceType === "image" &&
      deliveryType === "upload" &&
      publicId.startsWith(`${DOCUMENT_TEMPLATE_IMAGE_CLOUDINARY_FOLDER}/`)
    );
  } catch {
    return false;
  }
}

export { PrivatePhotoValidationError };
