import { join, resolve } from "node:path";
import {
  PrivatePhotoValidationError,
  readPrivatePhoto,
  savePrivatePhoto,
} from "@/lib/private-photos";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const imageDirectory = process.env.DOCUMENT_TEMPLATE_IMAGE_UPLOAD_DIR
  ? resolve(process.env.DOCUMENT_TEMPLATE_IMAGE_UPLOAD_DIR)
  : join(process.cwd(), ".private-data", "document-template-images");

export async function saveDocumentTemplateImage(file: File): Promise<string> {
  const image = await savePrivatePhoto(
    file,
    imageDirectory,
    "/api/documents/template-images",
    MAX_IMAGE_BYTES,
  );
  return image.url;
}

export async function readDocumentTemplateImage(fileName: string) {
  return readPrivatePhoto(fileName, imageDirectory);
}

export { PrivatePhotoValidationError };
