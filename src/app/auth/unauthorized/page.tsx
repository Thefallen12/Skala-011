import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { auth } from "../../../../auth";
import { getRoleHomePath } from "@/lib/role-home";

export default async function UnauthorizedPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 p-6">
      <section className="w-full max-w-lg space-y-4 rounded-xl border bg-background p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-secondary">
          Akses dibatasi
        </p>
        <h1 className="text-2xl font-bold text-primary dark:text-white">
          Anda tidak memiliki akses ke halaman tersebut
        </h1>
        <p className="text-sm text-muted-foreground">
          Akun Anda ({session.user.role}) tidak memiliki izin untuk membuka
          halaman ini. Jika akses diperlukan, hubungi administrator.
        </p>
        <Button asChild>
          <Link href={getRoleHomePath(session.user.role)}>
            Kembali ke halaman utama
          </Link>
        </Button>
      </section>
    </main>
  );
}
