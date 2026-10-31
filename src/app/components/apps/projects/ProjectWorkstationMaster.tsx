"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  addProjectProgress,
  assignProjectFieldPic,
  approveProjectWorkPointWage,
  createProjectWorkPoint,
  deleteProject,
  editApprovedProjectWorkPointWage,
} from "@/app/actions/project";
import {
  createBlueprint,
  reviewBlueprint,
  submitSubkonTermyn,
  verifySubkonTermynField,
} from "@/app/actions/construction";
import ErpHubBrand from "@/app/components/apps/erp/ErpHubBrand";
import ProjectFormModal from "@/app/components/project/ProjectFormModal";
import ImportProjectModal from "./ImportProjectModal";
import CreateTicketModal from "@/app/components/apps/tickets/CreateTicketModal";
import type { TicketProjectOption } from "@/app/(DashboardLayout)/types/ticket";
import type { FieldTeamOption } from "@/app/(DashboardLayout)/types/project";
import type { ProjectDashboardRow } from "@/app/(DashboardLayout)/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ProjectPriority, ProjectStatus, UserRole } from "@/generated/prisma/enums";
import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import {
  Archive,
  Camera,
  ClipboardList,
  Download,
  HardHat,
  ImageIcon,
  Plus,
  CalendarDays,
  ChartSpline,
  Upload,
  Pencil,
} from "lucide-react";

const Chart = dynamic(() => import("react-apexcharts"), { ssr: false });

export type ProjectWorkstationMasterData = {
  id: string;
  code: string;
  address: string;
  title: string;
  name: string;
  kelompokTani: string;
  jenisPekerjaan: string | null;
  location: string | null;
  fieldPicId: string | null;
  fieldPicName: string | null;
  status: ProjectStatus;
  progress: number;
  pagu: string;
  landArea: string | null;
  priority: ProjectPriority;
  vendor: string | null;
  clientName: string | null;
  budget: string | null;
  realized: string;
  startDate: string | null;
  endDate: string | null;
  reports: {
    id: string;
    reportDate: string;
    weather: string | null;
    workersCount: number;
    progress: number | null;
    workSummary: string | null;
    notes: string | null;
    photoUrls: string[];
  }[];
  workPoints: {
    id: string;
    title: string;
    location: string | null;
    plannedStartDate: string | null;
    targetDate: string | null;
    progress: number;
    proposedTotalWage: string;
    approvedTotalWage: string | null;
    wageAuditLogs: {
      id: string;
      oldWage: string;
      newWage: string;
      reason: string | null;
      createdAt: string;
      changedByName: string;
    }[];
    progressReports: {
      id: string;
      reportDate: string;
      progress: number;
      workSummary: string | null;
      photoUrls: string[];
    }[];
  }[];
  wageTicketPayments: {
    id: string;
    ticketNumber: string;
    title: string;
    status: string;
    amount: string | null;
    paid: boolean;
    paidAt: string | null;
    requesterName: string;
  }[];
  blueprints: {
    id: string;
    publicCode: string;
    drawingNumber: string;
    title: string;
    category: string;
    revision: string;
    fileUrl: string;
    status: string;
    drafterName: string;
  }[];
  subkonContracts: {
    id: string;
    publicCode: string;
    contractNumber: string;
    subkonName: string;
    contractValue: string;
    status: string;
    termyns: {
      id: string;
      termynNumber: number;
      claimedPercent: string;
      grossAmount: string;
      retentionAmount: string;
      netAmount: string;
      status: string;
    }[];
  }[];
  bastDocuments: {
    publicCode: string;
    bastNumber: string;
    type: string;
    date: string;
    isApproved: boolean;
  }[];
};

const currency = (amount: number | string) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(amount));

const formatProjectDate = (date: string | null) =>
  date
    ? new Date(`${date}T00:00:00.000Z`).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      })
    : "Belum ditentukan";

const statusLabels: Record<string, string> = {
  PENDING_SETUP: "PENDING SETUP",
  RUNNING: "RUNNING",
  PENDING: "PENDING SETUP",
  PLANNED: "PENDING SETUP",
  ON_PROGRESS: "RUNNING",
  ACTIVE: "RUNNING",
  TERHAMBAT: "Terhambat",
  ON_HOLD: "Ditunda",
  DONE: "Selesai",
  COMPLETED: "Selesai",
};

const sCurveOptions: ApexOptions = {
  chart: {
    type: "line",
    toolbar: { show: false },
    zoom: { enabled: false },
  },
  colors: ["#102A4D", "#E67E22"],
  dataLabels: { enabled: false },
  stroke: { curve: "smooth", width: 3 },
  legend: { position: "top" },
  xaxis: {
    type: "datetime",
    labels: { datetimeUTC: false, format: "dd MMM yy" },
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 5,
    labels: {
      formatter: (value) =>
        typeof value === "number" && Number.isFinite(value) ? `${value}%` : "—",
    },
  },
  tooltip: {
    x: { format: "dd MMM yyyy" },
    y: {
      formatter: (value) =>
        typeof value === "number" && Number.isFinite(value)
          ? `${value.toFixed(1)}%`
          : "Belum ada data",
    },
  },
};

function getStatusBadgeClass(status: string) {
  if (status === "PENDING_SETUP") {
    return "border-amber-300 bg-amber-50 text-amber-800";
  }
  if (status === "RUNNING" || status === "ON_PROGRESS" || status === "ACTIVE") {
    return "border-emerald-300 bg-emerald-50 text-emerald-800";
  }
  return "";
}

function getSCurveSeries(project: ProjectWorkstationMasterData) {
  const reportDates = project.reports.map((report) => report.reportDate).sort();
  const plannedStartDates = project.workPoints
    .map((point) => point.plannedStartDate)
    .filter((date): date is string => date !== null)
    .sort();
  const targetDates = project.workPoints
    .map((point) => point.targetDate)
    .filter((date): date is string => date !== null)
    .sort();
  const startDate =
    project.startDate ??
    plannedStartDates[0] ??
    reportDates[0] ??
    new Date().toISOString().slice(0, 10);
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const fallbackEnd = new Date(start.getTime() + 84 * 86400000)
    .toISOString()
    .slice(0, 10);
  const end = new Date(
    `${project.endDate ?? targetDates.at(-1) ?? fallbackEnd}T00:00:00.000Z`,
  );
  const range = Math.max(end.getTime() - start.getTime(), 7 * 86400000);
  const target = Array.from({ length: 13 }, (_, index) => {
    const progress = index / 12;
    const easedProgress = 3 * progress ** 2 - 2 * progress ** 3;
    return {
      x: start.getTime() + range * progress,
      y: Math.round(easedProgress * 100),
    };
  });
  const progressByDate = new Map<string, Map<string, number>>();
  for (const point of project.workPoints) {
    for (const report of point.progressReports) {
      const progressAtDate = progressByDate.get(report.reportDate) ?? new Map();
      progressAtDate.set(point.id, report.progress);
      progressByDate.set(report.reportDate, progressAtDate);
    }
  }
  const latestPointProgress = new Map<string, number>();
  for (const point of project.workPoints) latestPointProgress.set(point.id, 0);
  const actual = [...progressByDate.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, progressAtDate]) => {
      for (const [pointId, progress] of progressAtDate) {
        latestPointProgress.set(pointId, progress);
      }
      return {
        x: new Date(`${date}T00:00:00.000Z`).getTime(),
        y: latestPointProgress.size > 0
          ? [...latestPointProgress.values()].reduce(
              (sum, progress) => sum + progress,
              0,
            ) / latestPointProgress.size
          : 0,
      };
    });
  if (actual.length === 0) {
    actual.push(
      ...project.reports
        .filter(
          (report): report is typeof report & { progress: number } =>
            report.progress !== null,
        )
        .slice()
        .sort((left, right) => left.reportDate.localeCompare(right.reportDate))
        .map((report) => ({
          x: new Date(`${report.reportDate}T00:00:00.000Z`).getTime(),
          y: report.progress,
        })),
    );
  }
  if (actual.length === 0 && project.progress > 0) {
    actual.push({
      x: Math.max(Date.now(), start.getTime()),
      y: project.progress,
    });
  }
  return [
    { name: "Target Rencana", data: target },
    { name: "Realisasi Aktual", data: actual },
  ];
}

export default function ProjectWorkstationMaster({
  projects,
  fieldTeamUsers,
  currentUserId,
  currentUserRole,
}: {
  projects: ProjectWorkstationMasterData[];
  fieldTeamUsers: FieldTeamOption[];
  currentUserId: string;
  currentUserRole: UserRole;
}) {
  const router = useRouter();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [editingProject, setEditingProject] =
    useState<ProjectDashboardRow | null>(null);
  const [pendingDeleteProjectId, setPendingDeleteProjectId] = useState<
    string | null
  >(null);
  const [search, setSearch] = useState("");
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [blueprintCategory, setBlueprintCategory] = useState("ALL");
  const [blueprintStatus, setBlueprintStatus] = useState("ALL");
  const [notice, setNotice] = useState("");
  const [isPending, startTransition] = useTransition();
  const isProjectManager =
    currentUserRole === "ADMINISTRATIONS" || currentUserRole === "DIRECTOR";
  const canViewFinancials = currentUserRole === UserRole.DIRECTOR;
  const isFieldTeam =
    currentUserRole === UserRole.FIELD_TEAM ||
    currentUserRole === UserRole.KOORDINATOR;
  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null;
  const pendingDeleteProject =
    projects.find((project) => project.id === pendingDeleteProjectId) ?? null;
  const filteredBlueprints = activeProject?.blueprints.filter(
    (blueprint) =>
      (blueprintCategory === "ALL" ||
        blueprint.category === blueprintCategory) &&
      (blueprintStatus === "ALL" || blueprint.status === blueprintStatus),
  ) ?? [];
  const filteredProjects = projects.filter((project) => {
    const query = search.trim().toLocaleLowerCase("id-ID");
    return (
      !query ||
      [
        project.title,
        project.code,
        project.address,
        project.location ?? "",
        project.fieldPicName ?? "",
      ].some((value) => value.toLocaleLowerCase("id-ID").includes(query))
    );
  });
  const ticketProjectOptions: TicketProjectOption[] = projects.map(
    ({ id, title, kelompokTani }) => ({ id, title, kelompokTani }),
  );

  const getExportHref = (format: "csv" | "xlsx") => {
    const params = new URLSearchParams({ format });
    if (search.trim()) params.set("search", search.trim());
    return `/api/projects/export?${params.toString()}`;
  };

  const permanentlyDeleteProject = () => {
    if (!pendingDeleteProjectId) return;
    const projectId = pendingDeleteProjectId;
    setNotice("");
    startTransition(async () => {
      try {
        const result = await deleteProject(projectId);
        setNotice(result.message);
        if (result.success) {
          setConfirmArchiveOpen(false);
          setPendingDeleteProjectId(null);
          if (activeProjectId === projectId) setActiveProjectId(null);
          router.refresh();
        }
      } catch (error) {
        console.error("Permanently deleting project from workstation failed:", error);
        setNotice("Proyek gagal dihapus permanen. Silakan coba kembali.");
      }
    });
  };

  const assignFieldPic = (projectId: string, fieldPicId: string) => {
    setNotice("");
    startTransition(async () => {
      try {
        const result = await assignProjectFieldPic(projectId, fieldPicId);
        setNotice(result.message);
        if (result.success) router.refresh();
      } catch (error) {
        console.error("Assigning project PIC from workstation failed:", error);
        setNotice("Penunjukan PIC gagal disimpan. Silakan coba kembali.");
      }
    });
  };

  const editProject = (project: ProjectWorkstationMasterData) => {
    setEditingProject({
      id: project.id,
      code: project.code,
      name: project.name,
      title: project.title,
      kelompokTani: project.kelompokTani,
      address: project.address,
      jenisPekerjaan: project.jenisPekerjaan,
      pagu: project.pagu,
      landArea: project.landArea,
      progress: project.progress,
      status: project.status,
      vendor: project.vendor,
      priority: project.priority,
      clientName: project.clientName,
      location: project.location,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget,
      fieldPicId: project.fieldPicId,
      fieldPicName: project.fieldPicName,
      proposedWorkPointWages: "0",
      approvedWorkPointWages: "0",
      progressReports: [],
      workPoints: [],
    });
  };

  const saveReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProject) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const photos = data.getAll("photos").filter((value) => value instanceof File);
    if (photos.length > 5 || photos.some((photo) => photo.size > 5 * 1024 * 1024)) {
      setNotice("Maksimal 5 foto laporan dengan ukuran maksimal 5 MB per foto.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await addProjectProgress(activeProject.id, data);
        setNotice(result.message);
        if (result.success) {
          form.reset();
          router.refresh();
        }
      } catch (error) {
        console.error("Saving project daily report failed:", error);
        setNotice("Laporan gagal disimpan. Periksa data dan coba kembali.");
      }
    });
  };

  const submitWorkPoint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProject) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      try {
        const result = await createProjectWorkPoint(activeProject.id, {
          title: String(data.get("title") ?? ""),
          location: String(data.get("location") ?? ""),
          proposedVolume: String(data.get("proposedVolume") ?? ""),
          proposedUnit: String(data.get("proposedUnit") ?? ""),
          proposedUnitPrice: String(data.get("proposedUnitPrice") ?? ""),
          proposedTotalWage: String(data.get("proposedTotalWage") ?? ""),
          plannedStartDate: String(data.get("plannedStartDate") ?? ""),
          targetDate: String(data.get("targetDate") ?? ""),
        });
        setNotice(result.message);
        if (result.success) {
          form.reset();
          router.refresh();
        }
      } catch (error) {
        console.error("Submitting project wage proposal failed:", error);
        setNotice("Usulan titik dan upah gagal dikirim.");
      }
    });
  };

  const submitBlueprint = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeProject) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      try {
        const result = await createBlueprint(activeProject.id, data);
        setNotice(result.message);
        if (result.success) {
          form.reset();
          router.refresh();
        }
      } catch (error) {
        console.error("Uploading project blueprint failed:", error);
        setNotice("Gambar kerja gagal diunggah. Silakan coba kembali.");
      }
    });
  };

  const runProjectAction = (
    action: () => Promise<{ success: boolean; message: string }>,
  ) => {
    setNotice("");
    startTransition(async () => {
      try {
        const result = await action();
        setNotice(result.message);
        if (result.success) router.refresh();
      } catch (error) {
        console.error("Project workstation action failed:", error);
        setNotice("Aksi proyek gagal diproses. Silakan coba kembali.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <ErpHubBrand
        title="Project Workstation"
        description="Satu pusat kendali untuk data proyek, anggaran, pelaksanaan, dan dokumen."
      />

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-primary">Daftar Proyek</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {filteredProjects.length} dari {projects.length} proyek
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isProjectManager && (
              <>
                <Button onClick={() => setNewProjectOpen(true)}>
                  <Plus className="mr-2 size-4" />
                  Tambah Proyek Baru
                </Button>
                <Button variant="outline" onClick={() => setImportOpen(true)}>
                  <Upload className="mr-2 size-4" />
                  Import CSV
                </Button>
              </>
            )}
            <Button asChild variant="outline">
              <a href={getExportHref("csv")}>
                <Download className="mr-2 size-4" />
                Export (CSV)
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href={getExportHref("xlsx")}>
                Export Excel
                <Download className="ml-2 size-4" />
              </a>
            </Button>
            {isProjectManager && (
              <Button asChild variant="outline">
                <a href="/api/projects/template-csv" download>
                  Download Template CSV
                </a>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            aria-label="Cari proyek"
            placeholder="Cari nama, kode, lokasi, atau PIC..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {notice && (
            <p role="status" className="text-sm text-muted-foreground">
              {notice}
            </p>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kode</TableHead>
                  <TableHead>Nama Proyek</TableHead>
                  <TableHead>Lokasi</TableHead>
                  {canViewFinancials && (
                    <>
                      <TableHead className="text-right">Pagu Budget</TableHead>
                      <TableHead className="text-right">Realisasi</TableHead>
                    </>
                  )}
                  <TableHead>Penunjukan PIC</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => (
                  <TableRow
                    key={project.id}
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => {
                      setNotice("");
                      setActiveProjectId(project.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveProjectId(project.id);
                      }
                    }}
                  >
                    <TableCell>{project.code}</TableCell>
                    <TableCell className="min-w-48 font-medium">
                      {project.title}
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {project.kelompokTani}
                      </span>
                    </TableCell>
                    <TableCell className="min-w-40">
                      {project.location || project.address}
                    </TableCell>
                    {canViewFinancials && (
                      <>
                        <TableCell className="whitespace-nowrap text-right">
                          {currency(project.pagu)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">
                          {currency(project.realized)}
                        </TableCell>
                      </>
                    )}
                    <TableCell
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      {isProjectManager ? (
                        <Select
                          value={project.fieldPicId ?? "unassigned"}
                          disabled={isPending}
                          onValueChange={(value) =>
                            assignFieldPic(
                              project.id,
                              value === "unassigned" ? "" : value,
                            )
                          }
                        >
                          <SelectTrigger
                            aria-label={`PIC proyek ${project.title}`}
                            className="min-w-44"
                          >
                            <SelectValue placeholder="Pilih PIC" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">
                              Belum ditentukan
                            </SelectItem>
                            {fieldTeamUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        project.fieldPicName ?? "Belum ditentukan"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusBadgeClass(project.status)}
                      >
                        {statusLabels[project.status] ?? project.status}
                      </Badge>
                    </TableCell>
                    <TableCell
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                    >
                      <div className="flex items-center gap-1">
                        {isProjectManager && (
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${project.title}`}
                            onClick={() => editProject(project)}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        {currentUserRole === UserRole.DIRECTOR && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setPendingDeleteProjectId(project.id);
                              setConfirmArchiveOpen(true);
                            }}
                          >
                            Hapus
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredProjects.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {projects.length
                        ? "Tidak ada proyek yang cocok dengan pencarian."
                        : "Belum ada proyek yang dapat ditampilkan."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ProjectFormModal
        key={editingProject?.id ?? (newProjectOpen ? "new-project" : "closed")}
        project={editingProject}
        fieldTeamUsers={fieldTeamUsers}
        canViewBudget={canViewFinancials || editingProject === null}
        canManageUsers={
          currentUserRole === UserRole.DIRECTOR ||
          currentUserRole === UserRole.ADMINISTRATIONS
        }
        open={newProjectOpen || editingProject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNewProjectOpen(false);
            setEditingProject(null);
          }
        }}
      />
      <ImportProjectModal open={importOpen} onOpenChange={setImportOpen} />

      <Dialog
        open={activeProject !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveProjectId(null);
            setNotice("");
          }
        }}
      >
        <DialogContent
          className="max-h-[90vh] w-[calc(100vw-2rem)] max-w-5xl overflow-y-auto p-5 sm:p-6"
        >
          <DialogHeader className="space-y-3 pr-8 text-left">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <DialogTitle className="text-xl text-primary">
                  {activeProject?.title ?? "Detail Proyek"}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {activeProject
                    ? `${activeProject.code} · ${activeProject.location || activeProject.address}`
                    : "Informasi dan aktivitas proyek."}
                </DialogDescription>
              </div>
              {activeProject && currentUserRole === UserRole.DIRECTOR && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setPendingDeleteProjectId(activeProject.id);
                    setConfirmArchiveOpen(true);
                  }}
                >
                  <Archive className="mr-2 size-4" />
                  Hapus Proyek
                </Button>
              )}
            </div>
          </DialogHeader>

          {activeProject && (
            <div className="mt-6 space-y-5">
              {notice && (
                <p role="status" className="rounded-md border p-3 text-sm">
                  {notice}
                </p>
              )}
              <Tabs
                key={activeProject.id}
                defaultValue={canViewFinancials ? "pagu" : "titik"}
                className="space-y-4"
              >
                <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg border bg-white p-2">
                  {canViewFinancials && (
                    <TabsTrigger value="pagu" className="gap-2">
                      <ClipboardList className="size-4" />
                      Pagu & Realisasi
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="titik" className="gap-2">
                    <HardHat className="size-4" />
                    Titik & Upah
                  </TabsTrigger>
                  <TabsTrigger value="harian" className="gap-2">
                    <Camera className="size-4" />
                    Laporan Harian
                  </TabsTrigger>
                  {!isFieldTeam && (
                    <>
                      <TabsTrigger value="gambar" className="gap-2">
                        <ImageIcon className="size-4" />
                        Gambar Kerja
                      </TabsTrigger>
                      <TabsTrigger value="kurva" className="gap-2">
                        <ChartSpline className="size-4" />
                        Kurva S
                      </TabsTrigger>
                      <TabsTrigger value="timeline" className="gap-2">
                        <CalendarDays className="size-4" />
                        Timeline Pekerjaan & Gaji
                      </TabsTrigger>
                    </>
                  )}
                </TabsList>

                {canViewFinancials && (
                  <TabsContent value="pagu" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Anggaran dan Realisasi Proyek</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {(() => {
                        const pagu = Number(activeProject.pagu);
                        const realized = Number(activeProject.realized);
                        const percent =
                          pagu > 0 ? Math.min((realized / pagu) * 100, 100) : 0;
                        return (
                          <>
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="rounded-md border p-3">
                                <p className="text-xs text-muted-foreground">Pagu</p>
                                <p className="mt-1 font-semibold">{currency(pagu)}</p>
                              </div>
                              <div className="rounded-md border p-3">
                                <p className="text-xs text-muted-foreground">Realisasi material, upah, dan biaya</p>
                                <p className="mt-1 font-semibold">{currency(realized)}</p>
                              </div>
                              <div className="rounded-md border p-3">
                                <p className="text-xs text-muted-foreground">Sisa pagu</p>
                                <p className="mt-1 font-semibold">
                                  {currency(Math.max(pagu - realized, 0))}
                                </p>
                              </div>
                            </div>
                            <Progress
                              value={percent}
                              aria-label={`Realisasi ${percent.toFixed(0)} persen`}
                            />
                            <p className="text-right text-sm text-muted-foreground">
                              {percent.toFixed(1)}% dari pagu
                            </p>
                          </>
                        );
                      })()}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Informasi Proyek</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
                      <p><span className="text-muted-foreground">Lokasi:</span> {activeProject.address}</p>
                      <p><span className="text-muted-foreground">Jenis pekerjaan:</span> {activeProject.jenisPekerjaan ?? "—"}</p>
                      <p><span className="text-muted-foreground">PIC:</span> {activeProject.fieldPicName ?? "Belum ditentukan"}</p>
                      <p><span className="text-muted-foreground">Progres:</span> {activeProject.progress}%</p>
                    </CardContent>
                  </Card>
                  {activeProject.subkonContracts.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle>Kontrak Subkon</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {activeProject.subkonContracts.map((contract) => (
                          <section key={contract.id} className="rounded-md border p-3">
                            <p className="font-medium">{contract.contractNumber} · {contract.subkonName}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {currency(contract.contractValue)} · {contract.status}
                            </p>
                            <Link
                              href={`/d/${encodeURIComponent(contract.publicCode)}`}
                              className="mt-2 inline-block text-sm underline underline-offset-4"
                            >
                              Buka dokumen SPK
                            </Link>
                            {contract.termyns.map((termyn) => (
                              <div key={termyn.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded bg-muted/30 p-2 text-sm">
                                <span>Termin {termyn.termynNumber} · {termyn.claimedPercent}% · {currency(termyn.netAmount)}</span>
                                <span className="flex items-center gap-2">
                                  <Badge variant="outline">{termyn.status}</Badge>
                                  {termyn.status === "SUBMITTED" &&
                                    (isFieldTeam || canViewFinancials) && (
                                      <Button size="sm" disabled={isPending} onClick={() =>
                                        runProjectAction(() => verifySubkonTermynField(termyn.id))
                                      }>
                                        Verifikasi Fisik
                                      </Button>
                                    )}
                                </span>
                              </div>
                            ))}
                            {isFieldTeam && contract.status === "ACTIVE" && (
                                <form
                                  className="mt-3 flex flex-wrap items-end gap-2"
                                  onSubmit={(event) => {
                                    event.preventDefault();
                                    const form = event.currentTarget;
                                    const value = Number(new FormData(form).get("claimedPercent"));
                                    runProjectAction(() => submitSubkonTermyn(contract.publicCode, value));
                                  }}
                                >
                                  <Label>Progres fisik (%)<Input name="claimedPercent" type="number" min="0.01" max="100" step="0.01" required /></Label>
                                  <Button disabled={isPending}>Ajukan Termyn</Button>
                                </form>
                              )}
                          </section>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  {activeProject.bastDocuments.map((document) => (
                    <Card key={document.publicCode}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-6">
                        <div>
                          <p className="font-medium">{document.bastNumber} · {document.type}</p>
                          <p className="text-sm text-muted-foreground">{document.date} · {document.isApproved ? "Disetujui" : "Menunggu persetujuan"}</p>
                        </div>
                        <Link className="text-sm underline" href={`/d/${encodeURIComponent(document.publicCode)}`}>Buka BAST</Link>
                      </CardContent>
                    </Card>
                  ))}
                  </TabsContent>
                )}

                <TabsContent value="titik" className="space-y-4">
                  {((currentUserRole === UserRole.FIELD_TEAM ||
                    currentUserRole === UserRole.KOORDINATOR) &&
                    activeProject.fieldPicId === currentUserId ||
                    currentUserRole === UserRole.DIRECTOR ||
                    currentUserRole === UserRole.ADMINISTRATIONS) && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Ajukan Titik dan Total Upah Tukang</CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {currentUserRole === UserRole.FIELD_TEAM ||
                            currentUserRole === UserRole.KOORDINATOR
                              ? "Upah perlu disetujui Direktur sebelum proyek dapat dimulai."
                              : "Direktur/Administrasi dapat menyiapkan titik dan usulan upah. PIC tetap dapat mengajukan setelah ditunjuk."}
                          </p>
                        </CardHeader>
                        <CardContent>
                          <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitWorkPoint}>
                            <Label>Nama titik / tugas<Input name="title" required maxLength={180} /></Label>
                            <Label>Lokasi titik<Input name="location" maxLength={240} /></Label>
                            <Label>Tanggal mulai rencana<Input name="plannedStartDate" type="date" /></Label>
                            <Label>Tanggal target selesai<Input name="targetDate" type="date" /></Label>
                            <Label>Volume pekerjaan<Input name="proposedVolume" type="number" min="0.001" step="0.001" required /></Label>
                            <Label>Satuan volume<Input name="proposedUnit" maxLength={40} placeholder="m, m², m³, unit" required /></Label>
                            <Label>Harga satuan (Rp)<Input name="proposedUnitPrice" type="number" min="0" step="0.01" required /></Label>
                            <Label>Total upah (Rp)<Input name="proposedTotalWage" type="number" min="0.01" step="0.01" required /></Label>
                            <p className="text-xs text-muted-foreground sm:col-span-2">
                              Total harus sama dengan volume × harga satuan.
                            </p>
                            <Button type="submit" disabled={isPending} className="sm:col-span-2">
                              {isPending ? "Mengirim..." : "Kirim usulan ke Direktur"}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    )}
                  <Card>
                    <CardHeader><CardTitle>Titik Pekerjaan & Usulan Upah</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {activeProject.workPoints.map((point) => (
                        <article key={point.id} className="rounded-lg border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <p className="font-semibold">{point.title}</p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {point.location ?? "Lokasi belum dicatat"} · Progres {point.progress}%
                              </p>
                            </div>
                            <Badge variant="outline">
                              {point.approvedTotalWage ? "Upah disetujui" : "Menunggu persetujuan"}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm">
                            Usulan {currency(point.proposedTotalWage)}
                            {point.approvedTotalWage && ` · Disetujui ${currency(point.approvedTotalWage)}`}
                          </p>
                          {point.approvedTotalWage &&
                            isFieldTeam &&
                            activeProject.fieldPicId === currentUserId && (
                              <div className="mt-3">
                                <CreateTicketModal
                                  key={`wage-ticket-${point.id}`}
                                  projects={ticketProjectOptions}
                                  requesterRole={currentUserRole}
                                  triggerLabel="Ajukan pembayaran lewat tiket"
                                  initialWageRequest={{
                                    projectId: activeProject.id,
                                    projectTitle: activeProject.title,
                                    workPointTitle: point.title,
                                  }}
                                />
                              </div>
                            )}
                          {currentUserRole === "DIRECTOR" && !point.approvedTotalWage && (
                            <form
                              className="mt-3 flex flex-wrap items-end gap-2"
                              onSubmit={(event) => {
                                event.preventDefault();
                                const form = event.currentTarget;
                                const amount = String(new FormData(form).get("amount") ?? "");
                                runProjectAction(() => approveProjectWorkPointWage(point.id, amount));
                              }}
                            >
                              <Label>Nilai disetujui (Rp)<Input name="amount" type="number" min="0.01" step="0.01" defaultValue={point.proposedTotalWage} required /></Label>
                              <Button type="submit" disabled={isPending}>Setujui Upah</Button>
                            </form>
                          )}
                          {isProjectManager && point.approvedTotalWage && (
                            <form
                            className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]"
                            onSubmit={(event) => {
                              event.preventDefault();
                              const form = event.currentTarget;
                              const data = new FormData(form);
                              runProjectAction(() =>
                                editApprovedProjectWorkPointWage(
                                  point.id,
                                  String(data.get("revisedWage") ?? ""),
                                  String(data.get("wageReason") ?? ""),
                                ),
                              );
                            }}
                            >
                            <Label>
                              Revisi upah disetujui (Rp)
                              <Input
                                name="revisedWage"
                                type="number"
                                min="0.01"
                                step="0.01"
                                defaultValue={point.approvedTotalWage}
                                required
                              />
                            </Label>
                            <Label>
                              Alasan revisi
                              <Input name="wageReason" minLength={5} maxLength={2000} required />
                            </Label>
                            <Button type="submit" disabled={isPending} className="self-end">
                              Simpan Revisi
                            </Button>
                            </form>
                          )}
                          {point.wageAuditLogs.length > 0 && (
                            <div className="mt-4 border-t pt-3">
                            <p className="text-sm font-medium">Audit revisi upah</p>
                            <ul className="mt-2 space-y-2">
                              {point.wageAuditLogs.map((audit) => (
                                <li
                                  key={audit.id}
                                  className="rounded-md bg-muted/30 p-3 text-sm"
                                >
                                  <p className="font-medium">
                                    {currency(audit.oldWage)} → {currency(audit.newWage)}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {formatProjectDate(audit.createdAt.slice(0, 10))} · {audit.changedByName}
                                  </p>
                                  {audit.reason && (
                                    <p className="mt-1 text-muted-foreground">{audit.reason}</p>
                                  )}
                                </li>
                              ))}
                            </ul>
                            </div>
                          )}
                        </article>
                      ))}
                      {activeProject.workPoints.length === 0 && (
                        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                          Belum ada titik pekerjaan untuk proyek ini.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="harian" className="space-y-4">
                  {["RUNNING", "ON_PROGRESS", "ACTIVE"].includes(activeProject.status) &&
                    ["ADMINISTRATIONS", "DIRECTOR", "DEPUTY_DIRECTOR", "KOORDINATOR", "FIELD_TEAM"].includes(currentUserRole) &&
                    (!(currentUserRole === UserRole.FIELD_TEAM ||
                      currentUserRole === UserRole.KOORDINATOR) ||
                      activeProject.fieldPicId === currentUserId) && (
                    <Card>
                      <CardHeader><CardTitle>Tambah Laporan Harian</CardTitle></CardHeader>
                      <CardContent>
                        <form className="grid gap-3 sm:grid-cols-2" onSubmit={saveReport}>
                          <Label>Tanggal<Input name="reportDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></Label>
                          <Label>
                            Cuaca
                            <Select name="weather" defaultValue="Cerah">
                              <SelectTrigger className="mt-2 w-full">
                                <SelectValue placeholder="Pilih cuaca" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Cerah">Cerah</SelectItem>
                                <SelectItem value="Hujan Gerimis">Hujan gerimis</SelectItem>
                                <SelectItem value="Hujan Lebat">Hujan lebat</SelectItem>
                                <SelectItem value="Mendung">Mendung</SelectItem>
                              </SelectContent>
                            </Select>
                          </Label>
                          <Label>Jumlah pekerja hadir<Input name="workersCount" type="number" min="0" max="100000" defaultValue="0" required /></Label>
                          <Label>
                            Progres kumulatif (%)
                            <Input
                              name="progress"
                              type="number"
                              min={activeProject.progress}
                              max="100"
                              step="0.1"
                              defaultValue={activeProject.progress}
                              required
                            />
                            <span className="mt-1 block text-xs font-normal text-muted-foreground">
                              Isi progres keseluruhan terbaru. Nilai tidak dapat lebih rendah dari progres proyek saat ini ({activeProject.progress}%).
                            </span>
                          </Label>
                          <Label className="sm:col-span-2">
                            Uraian pekerjaan harian
                            <Textarea name="workSummary" maxLength={2000} required />
                          </Label>
                          <Label className="sm:col-span-2">Foto progres (maks. 5 foto, 5 MB/foto)
                            <Input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple />
                          </Label>
                          <Button type="submit" disabled={isPending} className="sm:col-span-2">
                            {isPending ? "Menyimpan..." : "Simpan Laporan"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}
                  {!["RUNNING", "ON_PROGRESS", "ACTIVE"].includes(activeProject.status) && (
                    <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                    Form laporan harian akan tersedia setelah PIC ditunjuk dan minimal satu upah titik disetujui Direktur.
                    </p>
                  )}
                  <Card>
                    <CardHeader><CardTitle>Riwayat Laporan Harian</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {activeProject.reports.map((report) => (
                        <article key={report.id} className="rounded-lg border p-4">
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="font-medium">{report.reportDate} · {report.weather ?? "Cuaca tidak dicatat"}</p>
                            <Badge variant="outline">{report.progress === null ? "—" : `${report.progress}%`}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{report.workersCount} pekerja · {report.photoUrls.length} foto</p>
                          {report.workSummary && <p className="mt-2 text-sm">{report.workSummary}</p>}
                          {report.photoUrls.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {report.photoUrls.map((url, index) => (
                                <a key={`${url}-${index}`} href={url} target="_blank" rel="noreferrer" className="text-sm underline">
                                  Buka foto {index + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                      {activeProject.reports.length === 0 && (
                        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                          Belum ada laporan harian untuk proyek ini.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {!isFieldTeam && (
                <TabsContent value="gambar" className="space-y-4">
                  {currentUserRole === "DRAFTER" && (
                    <Card>
                      <CardHeader><CardTitle>Unggah Gambar Kerja</CardTitle></CardHeader>
                      <CardContent>
                        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submitBlueprint}>
                          <Label>Nomor gambar<Input name="drawingNumber" maxLength={80} required /></Label>
                          <Label>Judul gambar<Input name="title" maxLength={180} required /></Label>
                          <Label>Kategori
                            <select name="category" defaultValue="SHOP_DRAWING" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                              <option value="SHOP_DRAWING">Shop Drawing</option>
                              <option value="AS_BUILT">As-Built</option>
                              <option value="ARCHITECTURAL">Architectural</option>
                              <option value="STRUCTURAL">Structural</option>
                              <option value="MEP">MEP</option>
                            </select>
                          </Label>
                          <Label>Revisi<Input name="revision" defaultValue="REV-00" maxLength={30} required /></Label>
                          <Label className="sm:col-span-2">File PDF / DWG / DXF
                            <Input name="file" type="file" accept=".pdf,.dwg,.dxf,application/pdf,application/acad,application/x-acad,application/dxf" required />
                          </Label>
                          <Button type="submit" disabled={isPending} className="sm:col-span-2">
                            {isPending ? "Mengunggah..." : "Unggah & Ajukan Review"}
                          </Button>
                        </form>
                      </CardContent>
                    </Card>
                  )}
                  <Card>
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle>Gambar Kerja Proyek</CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Select
                          value={blueprintCategory}
                          onValueChange={setBlueprintCategory}
                        >
                          <SelectTrigger aria-label="Filter kategori gambar" className="w-44">
                            <SelectValue placeholder="Semua kategori" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Semua kategori</SelectItem>
                            <SelectItem value="SHOP_DRAWING">Shop Drawing</SelectItem>
                            <SelectItem value="ARCHITECTURAL">Architectural</SelectItem>
                            <SelectItem value="STRUCTURAL">Structural</SelectItem>
                            <SelectItem value="MEP">MEP</SelectItem>
                            <SelectItem value="AS_BUILT">As-Built</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select
                          value={blueprintStatus}
                          onValueChange={setBlueprintStatus}
                        >
                          <SelectTrigger aria-label="Filter status gambar" className="w-48">
                            <SelectValue placeholder="Semua status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">Semua status</SelectItem>
                            <SelectItem value="DRAFT">Draft</SelectItem>
                            <SelectItem value="FOR_APPROVAL">Menunggu review</SelectItem>
                            <SelectItem value="APPROVED_FOR_CONSTRUCTION">Approved IFC</SelectItem>
                            <SelectItem value="REVISED">Direvisi</SelectItem>
                            <SelectItem value="REJECTED">Ditolak</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {filteredBlueprints.map((blueprint) => (
                        <article key={blueprint.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                          <div>
                            <p className="font-medium">{blueprint.drawingNumber} · {blueprint.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {blueprint.category} · {blueprint.revision} · {blueprint.drafterName}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{blueprint.status}</Badge>
                            <a href={blueprint.fileUrl} target="_blank" rel="noreferrer" className="text-sm underline">
                              Buka file
                            </a>
                            {blueprint.status === "FOR_APPROVAL" &&
                              ["KOORDINATOR", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(currentUserRole) && (
                                <>
                                  <Button size="sm" disabled={isPending} onClick={() =>
                                    runProjectAction(() => reviewBlueprint(blueprint.publicCode, "APPROVED_FOR_CONSTRUCTION"))
                                  }>Approve IFC</Button>
                                  <Button variant="destructive" size="sm" disabled={isPending} onClick={() =>
                                    runProjectAction(() => reviewBlueprint(blueprint.publicCode, "REJECTED"))
                                  }>Tolak</Button>
                                </>
                              )}
                          </div>
                        </article>
                      ))}
                      {filteredBlueprints.length === 0 && (
                        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                          {activeProject.blueprints.length === 0
                            ? "Belum ada file gambar kerja untuk proyek ini."
                            : "Tidak ada gambar kerja yang cocok dengan filter."}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                )}

                {!isFieldTeam && (
                <TabsContent value="kurva" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Kurva S — Target dan Realisasi</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Target mengikuti jadwal proyek; realisasi diambil dari progres titik yang tercatat pada laporan harian.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2 text-sm sm:grid-cols-2">
                        <p><span className="font-medium text-primary">Target rencana:</span> {formatProjectDate(activeProject.startDate)} – {formatProjectDate(activeProject.endDate)}</p>
                        <p><span className="font-medium text-orange-600">Realisasi saat ini:</span> {activeProject.progress.toFixed(1)}%</p>
                      </div>
                      <div className="mt-4 min-h-[320px]">
                        <Chart
                          type="line"
                          options={sCurveOptions}
                          series={getSCurveSeries(activeProject)}
                          height={340}
                        />
                      </div>
                      {getSCurveSeries(activeProject)[1].data.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground">
                          Belum ada data progres aktual untuk ditampilkan.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
                )}

                {!isFieldTeam && (
                <TabsContent value="timeline" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Timeline Pekerjaan</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Jadwal dan progres setiap titik kerja proyek.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {activeProject.workPoints.map((point) => (
                        <article key={point.id} className="space-y-3 rounded-lg border p-4">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="font-semibold">{point.title}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {point.location || "Lokasi belum dicatat"}
                              </p>
                            </div>
                            <Badge variant="outline">{point.progress.toFixed(1)}%</Badge>
                          </div>
                          <Progress value={point.progress} aria-label={`Progres ${point.title}`} />
                          <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                            <span>Mulai: {formatProjectDate(point.plannedStartDate)}</span>
                            <span>Target: {formatProjectDate(point.targetDate)}</span>
                          </div>
                        </article>
                      ))}
                      {activeProject.workPoints.length === 0 && (
                        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                          Belum ada titik kerja untuk ditampilkan pada timeline.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  {(() => {
                    const approvedTotal = activeProject.workPoints.reduce(
                      (sum, point) => sum + Number(point.approvedTotalWage ?? 0),
                      0,
                    );
                    const paidTotal = activeProject.wageTicketPayments.reduce(
                      (sum, payment) =>
                        sum + (payment.paid ? Number(payment.amount ?? 0) : 0),
                      0,
                    );
                    const remaining = Math.max(approvedTotal - paidTotal, 0);

                    return (
                      <>
                        <Card>
                          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <CardTitle>Ringkasan Upah Tukang</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                Pengajuan pembayaran bertahap diproses dan dicatat melalui tiket.
                              </p>
                            </div>
                          </CardHeader>
                          <CardContent className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-md border p-3">
                              <p className="text-xs text-muted-foreground">Total upah disetujui</p>
                              <p className="mt-1 font-semibold">{currency(approvedTotal)}</p>
                            </div>
                            <div className="rounded-md border p-3">
                              <p className="text-xs text-muted-foreground">Total sudah dibayar</p>
                              <p className="mt-1 font-semibold">{currency(paidTotal)}</p>
                            </div>
                            <div className="rounded-md border p-3">
                              <p className="text-xs text-muted-foreground">Sisa kewajiban upah</p>
                              <p className="mt-1 font-semibold">{currency(remaining)}</p>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader><CardTitle>Histori Pencairan</CardTitle></CardHeader>
                          <CardContent className="space-y-3">
                            {activeProject.wageTicketPayments.map((payment) => (
                              <article key={payment.id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
                                <div>
                                  <p className="font-medium">
                                    Tiket {payment.ticketNumber} · {payment.title}
                                  </p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {payment.paid
                                      ? `Dibayar ${formatProjectDate(payment.paidAt)}`
                                      : `Status ${statusLabels[payment.status] ?? payment.status}`}
                                    {" · "}Diajukan oleh {payment.requesterName}
                                  </p>
                                </div>
                                <p className="font-semibold">
                                  {payment.amount ? currency(payment.amount) : "Nominal belum ditetapkan"}
                                </p>
                              </article>
                            ))}
                            {activeProject.wageTicketPayments.length === 0 && (
                              <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                                Belum ada tiket pembayaran upah untuk proyek ini.
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmArchiveOpen}
        onOpenChange={(open) => {
          setConfirmArchiveOpen(open);
          if (!open && !isPending) setPendingDeleteProjectId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus {pendingDeleteProject?.title ?? "proyek"} secara permanen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Proyek, titik pekerjaan, laporan, blueprint, upah, dan data terkait
              yang menggunakan penghapusan berantai akan dihapus permanen dan
              tidak dapat dipulihkan. Tiket, pergerakan stok, dan agenda yang
              mempertahankan riwayatnya akan tetap ada tanpa tautan ke proyek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending}
              onClick={(event) => {
                event.preventDefault();
                permanentlyDeleteProject();
              }}
            >
              {isPending ? "Menghapus..." : "Ya, Hapus Permanen"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
