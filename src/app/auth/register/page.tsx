import { Register } from "@/app/components/auth/Register";
import { canManageUsers } from "@/lib/user-access";
import { auth } from "../../../../auth";
import { redirect } from "next/navigation";

export default async function RegisterPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  if (!canManageUsers(session.user.role)) {
    redirect("/");
  }

  return <Register />;
}