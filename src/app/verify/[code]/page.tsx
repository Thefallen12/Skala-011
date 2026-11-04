import { redirect } from "next/navigation";
import { documentVerificationPath } from "@/lib/documents/verification-url";

export default async function VerifyDocumentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(documentVerificationPath("issued", code));
}
