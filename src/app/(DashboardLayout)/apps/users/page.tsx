import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { canManageUsers } from "@/lib/user-access";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import UserManagementDashboard from "@/app/components/apps/users/UserManagementDashboard";

export const metadata: Metadata = {
  title: "Manajemen Pengguna",
};

export default async function UserManagementPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  if (!canManageUsers(session.user.role)) {
    redirect("/");
  }

  let users;
  try {
    users = await prisma.user.findMany({
      orderBy: [{ createdAt: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        profilePhotoUrl: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  } catch (error) {
    console.error("User management data load failed:", error);
    return (
      <>
        <BreadcrumbComp
          title="Manajemen Pengguna"
          items={[{ to: "/", title: "Beranda" }, { title: "Manajemen Pengguna" }]}
        />
        <section
          role="alert"
          className="my-6 rounded-md border border-destructive/30 bg-destructive/10 p-5 text-destructive"
        >
          <h2 className="font-semibold">Data pengguna tidak dapat dimuat</h2>
          <p className="mt-1 text-sm">
            Periksa koneksi database aplikasi di environment server. Detail
            kesalahan tersedia di log server.
          </p>
          <a
            href="/apps/users"
            className="mt-4 inline-flex font-medium underline underline-offset-4"
          >
            Coba muat ulang
          </a>
        </section>
      </>
    );
  }

  return (
    <>
      <BreadcrumbComp
        title="Manajemen Pengguna"
        items={[{ to: "/", title: "Beranda" }, { title: "Manajemen Pengguna" }]}
      />
      <UserManagementDashboard
        currentUserId={session.user.id}
        cloudinaryCloudName={process.env.CLOUDINARY_CLOUD_NAME ?? ""}
        cloudinaryApiKey={process.env.CLOUDINARY_API_KEY ?? ""}
        users={users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
