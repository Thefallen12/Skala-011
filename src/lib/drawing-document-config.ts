export const DRAWING_DOCUMENT_CLOUDINARY_FOLDER =
  "skala-prioritas/drawings";

export const DRAWING_CATEGORIES = [
  "Arsitektur",
  "Struktur",
  "MEP",
] as const;

export const DRAWING_STATUSES = [
  "DRAFT",
  "REVIEW",
  "REVISION_NEEDED",
  "APPROVED",
] as const;

export const DRAWING_FILE_EXTENSIONS = [
  "pdf",
  "dwg",
  "dxf",
  "rvt",
  "ifc",
  "jpg",
  "jpeg",
  "png",
  "webp",
] as const;
