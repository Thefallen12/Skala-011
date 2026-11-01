import { getCloudinaryPublicId } from "@/lib/cloudinary-photos";
import { FINANCE_CASHFLOW_CLOUDINARY_FOLDER } from "@/lib/finance-cashflow-config";

export type CashflowPaymentMethod = "TRANSFER" | "CASH" | "DEPOSIT";

export function isFinanceCashflowProofUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const pathSegments = parsed.pathname.split("/").filter(Boolean);
    const uploadIndex = pathSegments.indexOf("upload");
    const publicId = getCloudinaryPublicId(url);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === "res.cloudinary.com" &&
      Boolean(cloudName) &&
      pathSegments[0] === cloudName &&
      uploadIndex > 0 &&
      (pathSegments[uploadIndex - 1] === "image" ||
        pathSegments[uploadIndex - 1] === "raw") &&
      Boolean(
        publicId?.startsWith(`${FINANCE_CASHFLOW_CLOUDINARY_FOLDER}/`),
      )
    );
  } catch {
    return false;
  }
}

export function isCashflowPaymentMethod(
  value: string,
): value is CashflowPaymentMethod {
  return value === "TRANSFER" || value === "CASH" || value === "DEPOSIT";
}
