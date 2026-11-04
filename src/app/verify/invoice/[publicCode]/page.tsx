import { redirect } from "next/navigation";
import { documentVerificationPath } from "@/lib/documents/verification-url";

export default async function VerifyInvoicePage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = await params;
  redirect(documentVerificationPath("invoice", publicCode));
}
