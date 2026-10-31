import {
  generateDocument,
  type DocumentData,
  type GenerateDocumentOptions,
} from "@/lib/documents/generate-document";
import { prisma } from "@/lib/prisma";
import { getDocumentHeaderLogoDataUrl } from "@/lib/documents/qr-code";
import { renderPdf } from "@/lib/documents/render-pdf";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function generateDocumentPdf(
  templateId: string,
  data: DocumentData,
  options: GenerateDocumentOptions,
) {
  const generated = await generateDocument(templateId, data, options);
  try {
    const headerLogoDataUrl = await getDocumentHeaderLogoDataUrl();
    const html = `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(generated.documentNumber)}</title>
          <style>
            @page { size: A4; margin: ${generated.pageMargins.top}mm ${generated.pageMargins.right}mm ${generated.pageMargins.bottom}mm ${generated.pageMargins.left}mm; }
            body { position: relative; padding-top: 64px; color: #1f2937; font: 11pt Arial, sans-serif; line-height: 1.6; }
            h1, h2, h3 { line-height: 1.25; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #a3a3a3; padding: 7px; text-align: left; }
            th { background: #f1f1f1; letter-spacing: .04em; text-transform: uppercase; }
            img { max-width: 100%; }
            .document-header-logo { position: absolute; top: 0; left: 0; width: 270px; max-height: 64px; object-fit: contain; object-position: left top; }
          </style>
        </head>
        <body>
          <img class="document-header-logo" src="${headerLogoDataUrl}" alt="Logo SKALA PRIORITAS ENGINEERING">
          ${generated.html}
        </body>
      </html>`;
    const pdf = await renderPdf(html);
    return { ...generated, pdf };
  } catch (error) {
    try {
      await prisma.issuedDocument.updateMany({
        where: { id: generated.issuedDocumentId, status: "VALID" },
        data: { status: "REVOKED" },
      });
    } catch (revokeError) {
      console.error("Failed to revoke document after PDF generation failure:", revokeError);
    }
    throw error;
  }
}
