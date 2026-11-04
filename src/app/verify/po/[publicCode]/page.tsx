import { redirect } from "next/navigation";
import { documentVerificationPath } from "@/lib/documents/verification-url";

export default async function VerifyPurchaseOrderPage({
  params,
}: {
  params: Promise<{ publicCode: string }>;
}) {
  const { publicCode } = await params;
  redirect(documentVerificationPath("po", publicCode));
}
