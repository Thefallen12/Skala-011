import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserRole } from "@/generated/prisma/enums";
import { canManageUsers } from "@/lib/user-access";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import UserManagementDashboard from "@/app/components/apps/users/UserManagementDashboard";

export const metadata: Metadata = {
  title: "User Management",
};

export default async function UserManagementPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  if (!canManageUsers(session.user.role)) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  return (
    <>
      <BreadcrumbComp
        title="User Management"
        items={[{ to: "/", title: "Home" }, { title: "User Management" }]}
      />
      <UserManagementDashboard
        currentUserId={session.user.id}
        users={users.map((user) => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
          lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
