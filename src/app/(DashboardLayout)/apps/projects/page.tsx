import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ProjectWorkstationMaster, {
  type ProjectWorkstationMasterData,
} from "@/app/components/apps/projects/ProjectWorkstationMaster";
import {
  TicketFieldCategory,
  TicketRequestCategory,
  UserRole,
} from "@/generated/prisma/enums";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { getPaidProjectTicketRealization } from "@/lib/project-realization";

export const metadata: Metadata = {
  title: "Project Workstation",
};

const projectRoles: UserRole[] = [
  UserRole.ADMINISTRATIONS,
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.KOORDINATOR,
  UserRole.FIELD_TEAM,
  UserRole.DRAFTER,
];

export default async function ProjectsWorkstationPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!projectRoles.includes(session.user.role)) redirect("/");

  const isFieldRole =
    session.user.role === UserRole.FIELD_TEAM ||
    session.user.role === UserRole.KOORDINATOR;
  const isDirector = session.user.role === UserRole.DIRECTOR;
  const projectWhere =
    isFieldRole
      ? { fieldPicId: session.user.id, isDeleted: false }
      : { isDeleted: false };
  const projects = await prisma.project.findMany({
    where: projectWhere,
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      address: true,
      title: true,
      name: true,
      kelompokTani: true,
      jenisPekerjaan: true,
      location: true,
      status: true,
      progress: true,
      pagu: isDirector,
      landArea: true,
      priority: true,
      vendor: true,
      clientName: true,
      budget: isDirector,
      startDate: true,
      endDate: true,
      fieldPicId: true,
      fieldPic: { select: { name: true, profilePhotoUrl: true } },
      dailyReports: {
        orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
        take: 100,
        select: {
          id: true,
          reportDate: true,
          weather: true,
          workersCount: true,
          progress: true,
          workSummary: true,
          notes: true,
          progressPhotos: {
            orderBy: { createdAt: "asc" },
            select: { url: true, fileUrl: true },
          },
        },
      },
      workPoints: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          title: true,
          location: true,
          plannedStartDate: true,
          targetDate: true,
          progress: true,
          proposedTotalWage: true,
          approvedTotalWage: true,
          wageAuditLogs: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              oldWage: true,
              newWage: true,
              reason: true,
              createdAt: true,
              changedBy: { select: { name: true } },
            },
          },
          progressReports: {
            orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
            take: 50,
            select: {
              id: true,
              reportDate: true,
              progress: true,
              workSummary: true,
              photos: {
                orderBy: { createdAt: "asc" },
                select: { url: true, fileUrl: true },
              },
            },
          },
        },
      },
      blueprints: {
        orderBy: [{ drawingNumber: "asc" }, { revision: "desc" }],
        select: {
          id: true,
          publicCode: true,
          drawingNumber: true,
          title: true,
          category: true,
          revision: true,
          fileUrl: true,
          status: true,
          drafter: { select: { name: true } },
        },
      },
      subkonContracts: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          publicCode: true,
          contractNumber: true,
          subkonName: true,
          contractValue: true,
          status: true,
          termyns: {
            orderBy: { termynNumber: "asc" },
            select: {
              id: true,
              termynNumber: true,
              claimedPercent: true,
              grossAmount: true,
              retentionAmount: true,
              netAmount: true,
              status: true,
            },
          },
        },
      },
      bastDocuments: {
        orderBy: { date: "desc" },
        select: {
          publicCode: true,
          bastNumber: true,
          type: true,
          date: true,
          isApproved: true,
        },
      },
      tickets: {
        where: {
          requestCategory: TicketRequestCategory.FIELD,
          fieldCategory: TicketFieldCategory.LABOR,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          ticketNumber: true,
          title: true,
          status: true,
          totalAmount: true,
          transferReceiptUrl: true,
          requester: { select: { name: true } },
          auditLogs: {
            where: { action: "FINANCE_PAYMENT_COMPLETED" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { createdAt: true },
          },
        },
      },
    },
  });
  const fieldTeamUsers =
    isDirector || session.user.role === UserRole.ADMINISTRATIONS
      ? await prisma.user.findMany({
          where: {
            role: { in: [UserRole.FIELD_TEAM, UserRole.KOORDINATOR] },
            isActive: true,
          },
          orderBy: { name: "asc" },
          select: { id: true, name: true, email: true, profilePhotoUrl: true },
        })
    : [];
  const projectIds = projects.map((project) => project.id);
  const realizedMap = isDirector
    ? await getPaidProjectTicketRealization(projectIds)
    : null;

  const projectRows: ProjectWorkstationMasterData[] = projects.map((project) => ({
    id: project.id,
    code: project.code,
    address: project.address,
    title: project.title,
    name: project.name,
    kelompokTani: project.kelompokTani,
    jenisPekerjaan: project.jenisPekerjaan,
    location: project.location,
    fieldPicId: project.fieldPicId,
    fieldPicName: project.fieldPic?.name ?? null,
    fieldPicPhotoUrl: project.fieldPic?.profilePhotoUrl ?? null,
    status: project.status,
    progress: project.progress,
    pagu: isDirector ? project.pagu?.toString() ?? "0" : "0",
    landArea: project.landArea?.toString() ?? null,
    priority: project.priority,
    vendor: project.vendor,
    clientName: project.clientName,
    budget: isDirector ? project.budget?.toString() ?? null : null,
    startDate: project.startDate?.toISOString().slice(0, 10) ?? null,
    endDate: project.endDate?.toISOString().slice(0, 10) ?? null,
    realized: realizedMap?.get(project.id)?.total.toString() ?? "0",
    reports: project.dailyReports.map((report) => ({
      id: report.id,
      reportDate: report.reportDate.toISOString().slice(0, 10),
      weather: report.weather,
      workersCount: report.workersCount,
      progress: report.progress,
      workSummary: report.workSummary,
      notes: report.notes,
      photoUrls: report.progressPhotos.map((photo) => photo.fileUrl ?? photo.url),
    })),
    workPoints: project.workPoints.map((point) => ({
      id: point.id,
      title: point.title,
      location: point.location,
      plannedStartDate: point.plannedStartDate?.toISOString().slice(0, 10) ?? null,
      targetDate: point.targetDate?.toISOString().slice(0, 10) ?? null,
      progress: point.progress,
      proposedTotalWage: point.proposedTotalWage.toString(),
      approvedTotalWage: point.approvedTotalWage?.toString() ?? null,
      wageAuditLogs: point.wageAuditLogs.map((log) => ({
        id: log.id,
        oldWage: log.oldWage.toString(),
        newWage: log.newWage.toString(),
        reason: log.reason,
        createdAt: log.createdAt.toISOString(),
        changedByName: log.changedBy.name,
      })),
      progressReports: point.progressReports.map((report) => ({
        id: report.id,
        reportDate: report.reportDate.toISOString().slice(0, 10),
        progress: report.progress,
        workSummary: report.workSummary,
        photoUrls: report.photos.map((photo) => photo.fileUrl ?? photo.url),
      })),
    })),
    blueprints: isFieldRole ? [] : project.blueprints.map((blueprint) => ({
      id: blueprint.id,
      publicCode: blueprint.publicCode,
      drawingNumber: blueprint.drawingNumber,
      title: blueprint.title,
      category: blueprint.category,
      revision: blueprint.revision,
      fileUrl: blueprint.fileUrl,
      status: blueprint.status,
      drafterName: blueprint.drafter.name,
    })),
    subkonContracts: isFieldRole ? [] : project.subkonContracts.map((contract) => ({
      id: contract.id,
      publicCode: contract.publicCode,
      contractNumber: contract.contractNumber,
      subkonName: contract.subkonName,
      contractValue: contract.contractValue.toString(),
      status: contract.status,
      termyns: contract.termyns.map((termyn) => ({
        id: termyn.id,
        termynNumber: termyn.termynNumber,
        claimedPercent: termyn.claimedPercent.toString(),
        grossAmount: termyn.grossAmount.toString(),
        retentionAmount: termyn.retentionAmount.toString(),
        netAmount: termyn.netAmount.toString(),
        status: termyn.status,
      })),
    })),
    bastDocuments: isFieldRole ? [] : project.bastDocuments.map((bast) => ({
      publicCode: bast.publicCode,
      bastNumber: bast.bastNumber,
      type: bast.type,
      date: bast.date.toISOString().slice(0, 10),
      isApproved: bast.isApproved,
    })),
    wageTicketPayments: project.tickets.map((ticket) => ({
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      title: ticket.title,
      status: ticket.status,
      amount: ticket.totalAmount?.toString() ?? null,
      paid: ticket.transferReceiptUrl !== null,
      paidAt:
        ticket.auditLogs[0]?.createdAt.toISOString().slice(0, 10) ?? null,
      requesterName: ticket.requester.name,
    })),
  }));

  return (
    <ProjectWorkstationMaster
      projects={projectRows}
      fieldTeamUsers={fieldTeamUsers}
      currentUserId={session.user.id}
      currentUserRole={session.user.role}
    />
  );
}
