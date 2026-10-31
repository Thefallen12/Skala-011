import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  removeCloudinaryPhoto,
} from "@/lib/cloudinary-photos";
import {
  PrivatePhotoValidationError,
  readPrivatePhoto,
  removePrivatePhoto,
  savePrivatePhoto,
} from "@/lib/private-photos";

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const receiptDirectory = process.env.TICKET_UPLOAD_DIR
  ? resolve(process.env.TICKET_UPLOAD_DIR)
  : join(process.cwd(), ".private-data", "ticket-receipts");

const mimeExtensions = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type ReceiptMimeType = keyof typeof mimeExtensions;

function isReceiptMimeType(value: string): value is ReceiptMimeType {
  return Object.hasOwn(mimeExtensions, value);
}

function hasValidSignature(bytes: Uint8Array, mimeType: ReceiptMimeType): boolean {
  if (mimeType === "application/pdf") {
    return new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
  }
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  return (
    new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP"
  );
}

function receiptPath(fileName: string): string | null {
  if (!/^[0-9a-f-]{36}\.(pdf|jpg|png|webp)$/i.test(fileName)) {
    return null;
  }
  return join(receiptDirectory, fileName);
}

export async function saveTicketReceipt(file: File): Promise<string> {
  if (!(file instanceof File) || file.size < 1 || file.size > MAX_RECEIPT_BYTES) {
    throw new Error("Ukuran file bukti harus lebih dari 0 dan maksimal 5 MB.");
  }
  if (!isReceiptMimeType(file.type)) {
    throw new Error("Format file bukti harus PDF, JPG, PNG, atau WEBP.");
  }

  if (file.type !== "application/pdf") {
    try {
      const photo = await savePrivatePhoto(
        file,
        receiptDirectory,
        "/api/tickets/receipts",
        MAX_RECEIPT_BYTES,
      );
      return photo.url;
    } catch (error) {
      if (error instanceof PrivatePhotoValidationError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidSignature(bytes, file.type)) {
    throw new Error("Isi file tidak sesuai dengan format file yang dipilih.");
  }

  const fileName = `${randomUUID()}.${mimeExtensions[file.type]}`;
  await mkdir(receiptDirectory, { recursive: true, mode: 0o700 });
  await writeFile(
    join(/* turbopackIgnore: true */ receiptDirectory, fileName),
    bytes,
    { flag: "wx", mode: 0o600 },
  );

  return `/api/tickets/receipts/${fileName}`;
}

export async function removeTicketReceipt(url: string): Promise<void> {
  if (await removeCloudinaryPhoto(url)) return;
  if (
    await removePrivatePhoto(
      url,
      receiptDirectory,
      "/api/tickets/receipts",
    )
  ) {
    return;
  }
  const fileName = url.split("/").at(-1) ?? "";
  const path = receiptPath(fileName);
  if (!path) return;
  await rm(path, { force: true });
}

export async function readTicketReceipt(fileName: string): Promise<{
  bytes: Uint8Array;
  contentType: ReceiptMimeType;
} | null> {
  const extension = fileName.split(".").at(-1);
  if (extension !== "pdf") {
    return readPrivatePhoto(fileName, receiptDirectory);
  }
  const path = receiptPath(fileName);
  if (!path) return null;
  const contentType = "application/pdf";

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
