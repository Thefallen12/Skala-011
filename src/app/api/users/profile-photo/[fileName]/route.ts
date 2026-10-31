import { auth } from "@/../auth";
import { prisma } from "@/lib/prisma";
import { readUserProfilePhoto } from "@/lib/user-profile-photos";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { fileName } = await params;
  const photoUrl = `/api/users/profile-photo/${fileName}`;
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { profilePhotoUrl: true },
  });
  if (user?.profilePhotoUrl !== photoUrl) {
    return new Response("Not found", { status: 404 });
  }

  const photo = await readUserProfilePhoto(fileName);
  if (!photo) return new Response("Not found", { status: 404 });

  return new Response(Uint8Array.from(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
