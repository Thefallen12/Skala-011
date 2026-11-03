import { getCloudinaryPublicId } from "@/lib/cloudinary-photos";
import { REQUEST_DOCUMENT_CLOUDINARY_FOLDER } from "@/lib/request-document-config";

export function isTicketRequestReceiptUrl(url: string): boolean {
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
      Boolean(
        publicId?.startsWith(`${REQUEST_DOCUMENT_CLOUDINARY_FOLDER}/`),
      )
    );
  } catch {
    return false;
  }
}
