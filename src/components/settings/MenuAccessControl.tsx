"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  toggleMenuAccess,
  type MenuAccessMatrixRow,
} from "@/app/actions/settings";
import {
  APP_ROLES,
  isMenuAccessRequired,
  SETTINGS_MENU_ROLES,
} from "@/lib/config/menus";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const roleLabels: Record<string, string> = {
  DIRECTOR: "Direktur",
  DEPUTY_DIRECTOR: "Wakil Direktur",
  DRAFTER: "Drafter",
  FINANCE: "Keuangan",
  LOGISTICS: "Logistik",
  KOORDINATOR: "Koordinator Lapangan",
  FIELD_TEAM: "Tim Lapangan",
  MOVER: "Pengangkut",
  ADMINISTRATIONS: "Administrasi",
};

const MENU_ACCESS_PAGE_SIZE = 5;

export default function MenuAccessControl({
  initialAccessMatrix,
  canManage,
}: {
  initialAccessMatrix: MenuAccessMatrixRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [accessMatrix, setAccessMatrix] = useState(initialAccessMatrix);
  const [page, setPage] = useState(1);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [, startTransition] = useTransition();
  const pageCount = Math.max(
    1,
    Math.ceil(accessMatrix.length / MENU_ACCESS_PAGE_SIZE),
  );
  const currentPage = Math.min(page, pageCount);
  const visibleAccessRows = accessMatrix.slice(
    (currentPage - 1) * MENU_ACCESS_PAGE_SIZE,
    currentPage * MENU_ACCESS_PAGE_SIZE,
  );

  const toggleAccess = (role: string, menuKey: string, isAllowed: boolean) => {
    const previousMatrix = accessMatrix;
    setAccessMatrix((current) =>
      current.map((row) =>
        row.key === menuKey
          ? {
              ...row,
              allowedByRole: { ...row.allowedByRole, [role]: isAllowed },
            }
          : row,
      ),
    );
    setPendingKey(`${role}:${menuKey}`);
    setMessage(null);

    startTransition(async () => {
      try {
        const result = await toggleMenuAccess(role, menuKey, isAllowed);
        if (!result.success) {
          setAccessMatrix(previousMatrix);
          setMessage({ type: "error", text: result.message });
          return;
        }

        setMessage({ type: "success", text: result.message });
        router.refresh();
      } catch (error) {
        console.error("Updating menu access failed:", error);
        setAccessMatrix(previousMatrix);
        setMessage({
          type: "error",
          text: "Gagal menyimpan pengaturan hak akses.",
        });
      } finally {
        setPendingKey(null);
      }
    });
  };

  return (
    <div className="space-y-4">
      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={[
            "rounded-lg border px-4 py-3 text-sm font-medium",
            message.type === "error"
              ? "border-error/30 bg-lighterror text-error"
              : "border-success/30 bg-lightsuccess text-success",
          ].join(" ")}
        >
          {message.text}
        </p>
      )}
      {!canManage && (
        <p className="rounded-lg border border-warning/30 bg-lightwarning px-4 py-3 text-sm text-warning">
          Anda dapat melihat status, tetapi hanya Direktur, Wakil Direktur,
          atau Administrasi yang dapat mengubah pengaturan.
        </p>
      )}
      <div className="overflow-hidden rounded-xl bg-card shadow-sm">
        <div className="border-b border-border bg-muted px-5 py-3 text-[15px] font-black uppercase tracking-[0.12em] text-card-foreground">
          Matriks Hak Akses Menu
        </div>
        <Table className="min-w-[1088px] table-fixed border-separate border-spacing-0">
          <colgroup>
            <col className="w-56" />
            {APP_ROLES.map((role) => (
              <col key={role} className="w-24" />
            ))}
          </colgroup>
          <TableHeader>
            <TableRow className="bg-muted/70 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground hover:bg-muted/70">
              <TableHead className="sticky left-0 z-20 w-56 bg-muted">
                Menu
              </TableHead>
              {APP_ROLES.map((role) => (
                <TableHead
                  key={role}
                  className="min-w-24 whitespace-normal px-2 text-center"
                >
                  {roleLabels[role] ?? role}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAccessRows.map((row) => (
              <TableRow key={row.key} className="group">
                <TableHead
                  scope="row"
                  className="sticky left-0 z-10 w-56 whitespace-normal bg-card text-sm font-semibold text-card-foreground group-hover:bg-muted/40"
                >
                  <span>{row.name}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    {row.path}
                  </span>
                </TableHead>
                {APP_ROLES.map((role) => (
                  <TableCell
                    key={`${row.key}:${role}`}
                    className="px-2 text-center"
                  >
                    <Switch
                      checked={
                        isMenuAccessRequired(role, row.key)
                          ? true
                          : row.allowedByRole[role] ?? false
                      }
                      disabled={
                        !canManage ||
                        pendingKey !== null ||
                        isMenuAccessRequired(role, row.key) ||
                        (row.key === "settings" &&
                          !SETTINGS_MENU_ROLES.includes(role))
                      }
                      title={
                        isMenuAccessRequired(role, row.key)
                          ? "Menu ini wajib tersedia untuk role tersebut."
                          : undefined
                      }
                      aria-label={`${roleLabels[role] ?? role} · ${row.name}`}
                      onCheckedChange={(checked) =>
                        toggleAccess(role, row.key, checked)
                      }
                      className="data-[state=checked]:bg-secondary"
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p aria-live="polite">
            Menampilkan{" "}
            {accessMatrix.length === 0
              ? 0
              : (currentPage - 1) * MENU_ACCESS_PAGE_SIZE + 1}
            {"-"}
            {Math.min(
              currentPage * MENU_ACCESS_PAGE_SIZE,
              accessMatrix.length,
            )}{" "}
            dari {accessMatrix.length} menu
          </p>
          <nav aria-label="Navigasi halaman menu" className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Halaman menu sebelumnya"
              className="size-9 border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Halaman menu berikutnya"
              className="size-9 border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground"
              disabled={currentPage >= pageCount}
              onClick={() =>
                setPage((value) => Math.min(pageCount, value + 1))
              }
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
}
