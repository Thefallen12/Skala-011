import { auth } from "@/../auth";
import { readDocumentTemplateImage } from "@/lib/document-template-images";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { fileName } = await params;
  const image = await readDocumentTemplateImage(fileName);
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(Uint8Array.from(image.bytes), {
    headers: {
      "Content-Type": image.contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
