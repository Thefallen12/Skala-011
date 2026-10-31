import { checkTemplate, type Template } from "@pdfme/common";

export function parsePdfmeTemplate(value: unknown): Template | null {
  if (value === null || value === undefined) return null;
  checkTemplate(value);
  return value as Template;
}

export function createBlankPdfmeTemplate(): Template {
  return {
    basePdf: {
      width: 210,
      height: 297,
      padding: [10, 10, 10, 10],
    },
    schemas: [],
  };
}
