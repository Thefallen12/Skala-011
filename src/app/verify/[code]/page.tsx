import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DocType } from "@/generated/prisma/enums";
import DocumentVerificationViewer from "./DocumentVerificationViewer";

export const metadata: Metadata = {
  title: "Verifikasi Dokumen",
  robots: { index: false, follow: false },
};

const documentTypeLabels: Record<DocType, string> = {
  [DocType.INVOICE]: "Invoice",
  [DocType.PURCHASE_ORDER]: "Purchase Order (PO)",
  [DocType.DO]: "Delivery Order (DO)",
  [DocType.SPK]: "SPK",
  [DocType.SURAT_JALAN]: "Surat Jalan",
  [DocType.BAST]: "BAST",
};

export default async function VerifyDocumentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const issuedDocument = await prisma.issuedDocument.findUnique({
    where: { id: code },
    select: {
      documentNumber: true,
      status: true,
      createdAt: true,
      template: { select: { type: true } },
      issuer: { select: { name: true } },
    },
  });
  const isValid = issuedDocument?.status === "VALID";

  return (
    <DocumentVerificationViewer
      code={code}
      document={
        issuedDocument
          ? {
              documentNumber: issuedDocument.documentNumber,
              status: issuedDocument.status,
              createdAt: issuedDocument.createdAt.toISOString(),
              type: documentTypeLabels[issuedDocument.template.type],
              issuerName: issuedDocument.issuer.name,
            }
          : null
      }
    />
  );
}
