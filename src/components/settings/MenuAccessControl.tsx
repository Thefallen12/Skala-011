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

export default function MenuAccessControl({
  initialAccessMatrix,
  canManage,
}: {
  initialAccessMatrix: MenuAccessMatrixRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [accessMatrix, setAccessMatrix] = useState(initialAccessMatrix);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [, startTransition] = useTransition();

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
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-muted px-5 py-3 text-[15px] font-black uppercase tracking-[0.12em] text-card-foreground">
          Matriks Hak Akses Menu
        </div>
        <table className="w-full min-w-[780px] border-collapse text-left">
          <thead>
            <tr className="bg-muted/70 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              <th scope="col" className="sticky left-0 bg-muted px-4 py-3">
                Menu
              </th>
              {APP_ROLES.map((role) => (
                <th key={role} scope="col" className="px-3 py-3 text-center">
                  {roleLabels[role] ?? role}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accessMatrix.map((row) => (
              <tr key={row.key} className="hover:bg-muted/50">
                <th
                  scope="row"
                  className="sticky left-0 bg-card px-4 py-3 text-sm font-semibold text-card-foreground"
                >
                  <span>{row.name}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                    {row.path}
                  </span>
                </th>
                {APP_ROLES.map((role) => (
                  <td
                    key={`${row.key}:${role}`}
                    className="px-3 py-3 text-center"
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
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
