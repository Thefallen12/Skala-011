"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  ArrowDownToLine,
  CheckCircle2,
  FileDown,
  FileUp,
  Eye,
  MoreHorizontal,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { format, formatDistanceToNowStrict, isAfter, subDays } from "date-fns";
import { id } from "date-fns/locale";
import { UserRole } from "@/generated/prisma/enums";
import type { UserChartRecord } from "./UserManagementCharts";
import CardBox from "@/app/components/shared/CardBox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deleteUser,
  importUsersCsv,
  updateUserDetails,
  type AccountActionResult,
} from "@/app/actions/users";
import { createAccount, type RegisterState } from "@/app/auth/register/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const UserManagementCharts = dynamic(() => import("./UserManagementCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="h-[360px] animate-pulse rounded-md border border-border bg-card lg:col-span-2" />
      <div className="h-[360px] animate-pulse rounded-md border border-border bg-card" />
    </div>
  ),
});

export type ManagedUser = UserChartRecord & {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
};

const roleOptions: { value: UserRole; label: string }[] = [
  { value: UserRole.DIRECTOR, label: "Direktur" },
  { value: UserRole.DEPUTY_DIRECTOR, label: "Wakil Direktur" },
  { value: UserRole.DRAFTER, label: "Drafter" },
  { value: UserRole.FINANCE, label: "Keuangan" },
  { value: UserRole.LOGISTICS, label: "Koordinator Logistik" },
  { value: UserRole.KOORDINATOR, label: "Koordinator Lapangan" },
  { value: UserRole.FIELD_TEAM, label: "Tim Lapangan" },
  { value: UserRole.MOVER, label: "Mover" },
  { value: UserRole.ADMINISTRATIONS, label: "Administrasi" },
];

const initialRegisterState: RegisterState = { status: "idle", message: "" };

function csvEscape(value: string): string {
  return `"${(/^[\s]*[=+\-@]/.test(value) ? `'${value}` : value).replace(
    /"/g,
    '""',
  )}"`;
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = ["\uFEFF", rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")];
  const url = URL.createObjectURL(
    new Blob(content, { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toReportRows(users: ManagedUser[]): string[][] {
  return [
    [
      "Nama",
      "Email",
      "Telepon",
      "Role",
      "Status akun",
      "Dibuat pada",
      "Login terakhir",
    ],
    ...users.map((user) => [
      user.name,
      user.email,
      user.phone ?? "",
      roleOptions.find((role) => role.value === user.role)?.label ?? user.role,
      user.isActive ? "Aktif" : "Nonaktif",
      format(new Date(user.createdAt), "yyyy-MM-dd HH:mm"),
      user.lastLoginAt
        ? format(new Date(user.lastLoginAt), "yyyy-MM-dd HH:mm")
        : "Belum pernah login",
    ]),
  ];
}

function isRecentLogin(lastLoginAt: string | null): boolean {
  return Boolean(
    lastLoginAt && isAfter(new Date(lastLoginAt), subDays(new Date(), 30)),
  );
}

export default function UserManagementDashboard({
  currentUserId,
  users,
}: {
  currentUserId: string;
  users: ManagedUser[];
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [profileUser, setProfileUser] = useState<ManagedUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [message, setMessage] = useState<AccountActionResult | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleSaveAccount = async (formData: FormData) => {
    setIsSavingAccount(true);
    setMessage(null);
    try {
      const firstName = String(formData.get("firstName") ?? "").trim();
      const lastName = String(formData.get("lastName") ?? "").trim();
      formData.set("name", [firstName, lastName].filter(Boolean).join(" "));
      const result = editingUser
        ? await updateUserDetails(editingUser.id, {
            name: String(formData.get("name")),
            email: String(formData.get("email")),
            phone: String(formData.get("phone") ?? ""),
            role: String(formData.get("role")),
            isActive: formData.get("isActive") === "true",
          })
        : await createAccount(initialRegisterState, formData).then((created) => ({
            success: created.status === "success",
            message: created.message,
          }));
      setMessage(result);
      if (result.success) {
        setAccountDialogOpen(false);
        setEditingUser(null);
      }
    } catch (error) {
      console.error("User account save request failed:", error);
      setMessage({
        success: false,
        message: "Akun gagal disimpan. Silakan coba kembali.",
      });
    } finally {
      setIsSavingAccount(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesQuery =
        !normalizedQuery ||
        `${user.name} ${user.email}`.toLowerCase().includes(normalizedQuery);
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE"
          ? user.isActive
          : statusFilter === "INACTIVE"
            ? !user.isActive
            : !user.isActive || !user.lastLoginAt);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [query, roleFilter, statusFilter, users]);

  const activeCount = users.filter((user) => user.isActive).length;
  const newThisMonth = users.filter((user) => {
    const createdAt = new Date(user.createdAt);
    const now = new Date();
    return (
      createdAt.getMonth() === now.getMonth() &&
      createdAt.getFullYear() === now.getFullYear()
    );
  }).length;
  const recentLoginCount = users.filter(
    (user) => user.isActive && isRecentLogin(user.lastLoginAt),
  ).length;
  const activeRate = users.length
    ? Math.round((recentLoginCount / users.length) * 100)
    : 0;
  const recentActivity = users
    .filter((user) => user.lastLoginAt)
    .sort(
      (left, right) =>
        new Date(right.lastLoginAt!).getTime() -
        new Date(left.lastLoginAt!).getTime(),
    )
    .slice(0, 5);
  const alerts = users
    .filter((user) => !user.isActive || !user.lastLoginAt)
    .slice(0, 4);

  const runAccountAction = async (
    action: () => Promise<AccountActionResult>,
  ) => {
    setIsPending(true);
    setMessage(null);
    try {
      const result = await action();
      setMessage(result);
    } catch (error) {
      console.error("User management action failed:", error);
      setMessage({
        success: false,
        message: "Tindakan gagal dijalankan. Silakan coba kembali.",
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    setIsPending(true);
    try {
      const result = await importUsersCsv(await file.text());
      setMessage(result);
    } catch (error) {
      console.error("User CSV import request failed:", error);
      setMessage({
        success: false,
        message: "File CSV gagal diproses. Silakan periksa file dan coba lagi.",
      });
    } finally {
      setIsPending(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const exportUsers = (source: ManagedUser[], filename: string) => {
    downloadCsv(filename, toReportRows(source));
    setMessage({
      success: true,
      message: `${source.length} akun diekspor ke ${filename}.`,
    });
  };

  const metricCards = [
    {
      label: "Total pengguna",
      value: users.length,
      detail: "Semua akun terdaftar",
      icon: Users,
      color: "text-primary",
      background: "bg-lightprimary",
    },
    {
      label: "Akun aktif",
      value: activeCount,
      detail: `${users.length - activeCount} akun nonaktif`,
      icon: ShieldCheck,
      color: "text-success",
      background: "bg-lightsuccess",
    },
    {
      label: "Pengguna baru bulan ini",
      value: newThisMonth,
      detail: "Berdasarkan tanggal dibuat",
      icon: UserPlus,
      color: "text-info",
      background: "bg-lightinfo",
    },
    {
      label: "Aktif 30 hari",
      value: `${activeRate}%`,
      detail: `${recentLoginCount} pengguna login`,
      icon: Activity,
      color: "text-warning",
      background: "bg-lightwarning",
    },
  ];

  return (
    <div className="my-6 space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          aria-label="Pilih file CSV akun"
          onChange={(event) => void handleImport(event.target.files?.[0])}
        />
        <Button
          type="button"
          variant="outline"
          disabled={isPending}
          onClick={() => fileInput.current?.click()}
        >
          <FileUp className="mr-2 size-4" aria-hidden="true" />
          Import Users
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            exportUsers(users, `users-${new Date().toISOString().slice(0, 10)}.csv`)
          }
        >
          <ArrowDownToLine className="mr-2 size-4" aria-hidden="true" />
          Export
        </Button>
        <Button
          type="button"
          onClick={() => {
            setEditingUser(null);
            setAccountDialogOpen(true);
          }}
        >
          <UserPlus className="mr-2 size-4" aria-hidden="true" />
          Add User
        </Button>
      </div>
      <p className="text-right text-xs text-muted-foreground">
        Format impor CSV: kolom <code>name,email,role,password</code>; password
        minimal 12 karakter. Hapus file CSV setelah impor.
      </p>

      {message && (
        <p
          role={message.success ? "status" : "alert"}
          className={`rounded-md border px-4 py-3 text-sm ${
            message.success
              ? "border-success/30 bg-lightsuccess text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {message.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {metricCards.map(({ label, value, detail, icon: Icon, color, background }) => (
          <CardBox
            key={label}
            className="flex min-h-36 flex-col items-center justify-center gap-3 p-3 text-center sm:min-h-32 sm:p-4 md:min-h-24 md:flex-row md:justify-start md:gap-3 md:text-left"
          >
            <span
              className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${background} ${color}`}
            >
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </p>
              <p className="mt-1 text-xl font-semibold leading-none sm:text-2xl">
                {value}
              </p>
              <p className="mt-1.5 truncate text-[11px] text-muted-foreground">
                {detail}
              </p>
            </div>
          </CardBox>
        ))}
      </div>

      <UserManagementCharts users={users} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CardBox className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h2 className="font-semibold">Aktivitas Terbaru</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Login pengguna yang tercatat terakhir
              </p>
            </div>
            <Activity className="size-5 text-muted-foreground" aria-hidden="true" />
          </div>
          <div className="divide-y divide-border">
            {recentActivity.length ? (
              recentActivity.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.name} login</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={user.lastLoginAt ?? undefined}
                    title={
                      user.lastLoginAt
                        ? format(new Date(user.lastLoginAt), "d MMM yyyy, HH:mm", {
                            locale: id,
                          })
                        : undefined
                    }
                  >
                    {user.lastLoginAt
                      ? formatDistanceToNowStrict(new Date(user.lastLoginAt), {
                          addSuffix: true,
                          locale: id,
                        })
                      : ""}
                  </time>
                </div>
              ))
            ) : (
              <p className="p-5 text-sm text-muted-foreground">
                Belum ada aktivitas login yang tercatat.
              </p>
            )}
          </div>
        </CardBox>

        <div className="grid gap-6">
          <CardBox className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-semibold">System Alerts</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Akun nonaktif atau belum pernah login
                </p>
              </div>
              <Badge variant={alerts.length ? "lightWarning" : "lightSuccess"}>
                {alerts.length}
              </Badge>
            </div>
            <div className="divide-y divide-border">
              {alerts.length ? (
                alerts.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-3 bg-warning/10 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {!user.isActive
                          ? "Akun dinonaktifkan"
                          : "Belum pernah login"}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(user.createdAt), {
                        addSuffix: true,
                        locale: id,
                      })}
                    </span>
                  </div>
                ))
              ) : (
                <p className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
                  <CheckCircle2
                    className="size-4 text-success"
                    aria-hidden="true"
                  />
                  Tidak ada peringatan akun saat ini.
                </p>
              )}
              {users.filter((user) => !user.isActive || !user.lastLoginAt).length >
                alerts.length && (
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full rounded-none"
                  onClick={() => setStatusFilter("ATTENTION")}
                >
                  Lihat semua akun yang memerlukan perhatian
                </Button>
              )}
            </div>
          </CardBox>

          <CardBox className="overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <h2 className="font-semibold">Quick Actions</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Kelola akun dan buat laporan pengguna
              </p>
            </div>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full min-w-0 justify-start whitespace-normal py-2 text-left leading-snug"
                onClick={() => {
                  setEditingUser(null);
                  setAccountDialogOpen(true);
                }}
              >
                <UserPlus className="size-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0 whitespace-normal text-left">Add User</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full min-w-0 justify-start whitespace-normal py-2 text-left leading-snug"
                onClick={() => fileInput.current?.click()}
              >
                <FileUp className="size-4 shrink-0 text-info" aria-hidden="true" />
                <span className="min-w-0 whitespace-normal text-left">
                  Import Users
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full min-w-0 justify-start whitespace-normal py-2 text-left leading-snug"
                onClick={() => exportUsers(users, "users.csv")}
              >
                <ArrowDownToLine
                  className="size-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                <span className="min-w-0 whitespace-normal text-left">Export</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full min-w-0 justify-start whitespace-normal py-2 text-left leading-snug"
                onClick={() => {
                  setStatusFilter("ACTIVE");
                  setRoleFilter("ALL");
                }}
              >
                <ShieldCheck
                  className="size-4 shrink-0 text-success"
                  aria-hidden="true"
                />
                <span className="min-w-0 whitespace-normal text-left">
                  Akun aktif
                </span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-auto min-h-10 w-full min-w-0 justify-start whitespace-normal py-2 text-left leading-snug sm:col-span-2"
                onClick={() =>
                  exportUsers(
                    filteredUsers,
                    `user-management-report-${new Date().toISOString().slice(0, 10)}.csv`,
                  )
                }
              >
                <FileDown
                  className="size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span className="min-w-0 whitespace-normal text-left">
                  Generate Report ({filteredUsers.length} pengguna)
                </span>
              </Button>
            </div>
          </CardBox>
        </div>
      </div>

      <CardBox className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <h2 className="font-semibold">Users Directory</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Cari pengguna, perbarui role, dan kelola status akun
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            Menampilkan {filteredUsers.length} dari {users.length} pengguna
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border p-4">
          <div className="relative min-w-52 flex-1">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Cari nama atau email pengguna"
              placeholder="Cari pengguna..."
              className="pl-9"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Filter status akun" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Status</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="INACTIVE">Nonaktif</SelectItem>
              <SelectItem value="ATTENTION">Perlu perhatian</SelectItem>
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger aria-label="Filter role pengguna" className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua Role</SelectItem>
              {roleOptions.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Login terakhir</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="min-w-48">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-lightprimary text-sm font-semibold text-primary">
                        {user.name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((part) => part[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {user.name}
                        </span>
                        {user.id === currentUserId && (
                          <span className="text-xs text-muted-foreground">
                            Akun Anda
                          </span>
                        )}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                  <TableCell className="min-w-48">
                    {roleOptions.find((role) => role.value === user.role)?.label ??
                      user.role}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? "lightSuccess" : "lightError"}>
                      {user.isActive ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-40 text-sm text-muted-foreground">
                    {user.lastLoginAt
                      ? formatDistanceToNowStrict(new Date(user.lastLoginAt), {
                          addSuffix: true,
                          locale: id,
                        })
                      : "Belum pernah"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {format(new Date(user.createdAt), "d MMM yyyy", {
                      locale: id,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          aria-label={`Actions ${user.name}`}
                          disabled={isPending}
                          className="h-8 min-w-12"
                        >
                          <MoreHorizontal className="size-4" aria-hidden="true" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onSelect={() => {
                            setEditingUser(user);
                            setAccountDialogOpen(true);
                          }}
                        >
                          <Pencil className="text-primary" aria-hidden="true" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setProfileUser(user)}>
                          <Eye className="text-info" aria-hidden="true" />
                          View Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={user.id === currentUserId}
                          className="text-destructive focus:text-destructive"
                          onSelect={() => setDeleteTarget(user)}
                        >
                          <Trash2 aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredUsers.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Tidak ada pengguna yang cocok dengan filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardBox>

      <Dialog
        open={accountDialogOpen}
        onOpenChange={(open) => {
          setAccountDialogOpen(open);
          if (!open) setEditingUser(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Add New User"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Perbarui informasi, role, dan status akun."
                : "Tambahkan pengguna baru dan tentukan akses akunnya."}
            </DialogDescription>
          </DialogHeader>
          <form
            key={editingUser?.id ?? "new-user"}
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void handleSaveAccount(new FormData(event.currentTarget));
            }}
          >
            {editingUser?.id === currentUserId && (
              <>
                <input type="hidden" name="role" value={editingUser.role} />
                <input
                  type="hidden"
                  name="isActive"
                  value={String(editingUser.isActive)}
                />
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-first-name">First Name</Label>
                <Input
                  id="user-first-name"
                  name="firstName"
                  autoComplete="given-name"
                  defaultValue={editingUser?.name.trim().split(/\s+/)[0] ?? ""}
                  maxLength={120}
                  required
                  className="h-8"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-last-name">Last Name</Label>
                <Input
                  id="user-last-name"
                  name="lastName"
                  autoComplete="family-name"
                  defaultValue={
                    editingUser?.name.trim().split(/\s+/).slice(1).join(" ") ??
                    ""
                  }
                  maxLength={120}
                  className="h-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                name="email"
                type="email"
                autoComplete="email"
                defaultValue={editingUser?.email ?? ""}
                maxLength={254}
                required
                className="h-8"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="user-role">Role</Label>
                <Select
                  name="role"
                  defaultValue={editingUser?.role ?? UserRole.FIELD_TEAM}
                  disabled={editingUser?.id === currentUserId}
                >
                  <SelectTrigger id="user-role" className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-status">Status</Label>
                <Select
                  name="isActive"
                  defaultValue={editingUser?.isActive === false ? "false" : "true"}
                  disabled={editingUser?.id === currentUserId}
                >
                  <SelectTrigger id="user-status" className="h-8 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-phone">Phone</Label>
              <Input
                id="user-phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                defaultValue={editingUser?.phone ?? ""}
                maxLength={32}
                pattern="[+()0-9 .-]*"
                className="h-8"
              />
            </div>
            {!editingUser && (
              <div className="space-y-1.5">
                <Label htmlFor="user-password">Password sementara</Label>
                <Input
                  id="user-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={128}
                  required
                  className="h-8"
                />
                <p className="text-xs text-muted-foreground">
                  Minimal 12 karakter. Bagikan melalui saluran aman.
                </p>
              </div>
            )}
            <DialogFooter className="pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAccountDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSavingAccount}>
                {isSavingAccount
                  ? "Saving..."
                  : "Save User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(profileUser)}
        onOpenChange={(open) => {
          if (!open) setProfileUser(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
            <DialogDescription>Informasi akun pengguna.</DialogDescription>
          </DialogHeader>
          {profileUser && (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-muted-foreground">Name</dt>
                <dd className="font-medium">{profileUser.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="break-all font-medium">{profileUser.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Role</dt>
                <dd className="font-medium">
                  {roleOptions.find((role) => role.value === profileUser.role)
                    ?.label ?? profileUser.role}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Status</dt>
                <dd>
                  <Badge
                    variant={profileUser.isActive ? "lightSuccess" : "lightError"}
                  >
                    {profileUser.isActive ? "Active" : "Inactive"}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd className="font-medium">{profileUser.phone || "—"}</dd>
              </div>
            </dl>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Hapus akun {deleteTarget?.name}? Tindakan ini tidak dapat dibatalkan.
              Akun yang masih terkait dengan data operasional harus dinonaktifkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                const targetId = deleteTarget.id;
                void (async () => {
                  setIsPending(true);
                  setMessage(null);
                  try {
                    const result = await deleteUser(targetId);
                    setMessage(result);
                    if (result.success) setDeleteTarget(null);
                  } catch (error) {
                    console.error("User deletion request failed:", error);
                    setMessage({
                      success: false,
                      message: "Akun gagal dihapus. Silakan coba kembali.",
                    });
                  } finally {
                    setIsPending(false);
                  }
                })();
              }}
            >
              {isPending ? "Deleting..." : "Delete User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="sr-only" aria-live="polite">
        {message?.message}
      </div>
    </div>
  );
}
