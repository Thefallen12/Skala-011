import type { Metadata } from "next";
import { redirect } from "next/navigation";
import ExecutiveApprovalHub from "@/app/components/apps/approvals/ExecutiveApprovalHub";
import {
  DirectStockPurchaseStatus,
  POStatus,
  ProjectAddendumStatus,
  SPKStatus,
  SubkonTermynStatus,
  TicketStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Executive Approval Hub",
};

const executiveRoles: UserRole[] = [
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
];

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; openSheet?: string }>;
}) {
  const { tab, openSheet } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!executiveRoles.includes(session.user.role)) redirect("/");

  const [
    orders,
    tickets,
    directPurchases,
    workPoints,
    termyns,
    contracts,
    addendums,
    bastDocuments,
    vendors,
  ] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: {
        status: POStatus.PENDING_APPROVAL,
        reviewedById: { not: null },
        reviewedAt: { not: null },
      },
      orderBy: { createdAt: "asc" },
      select: {
        publicCode: true,
        poNumber: true,
        vendorName: true,
        vendor: {
          select: {
            name: true,
            address: true,
            phone: true,
            email: true,
            bankName: true,
            bankAccount: true,
            bankHolder: true,
          },
        },
        paymentMethod: true,
        paymentBankName: true,
        paymentAccountNumber: true,
        paymentAccountName: true,
        paymentTerms: true,
        includeTax: true,
        createdAt: true,
        reviewedAt: true,
        reviewedBy: { select: { name: true } },
        ticket: {
          select: {
            ticketNumber: true,
            project: { select: { kelompokTani: true, location: true } },
          },
        },
        items: {
          select: {
            itemName: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
      },
    }),
    (session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.DEPUTY_DIRECTOR)
      ? prisma.ticket.findMany({
          where: { status: TicketStatus.PENDING_DIRECTOR },
          orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            type: true,
            totalAmount: true,
            requestedAmount: true,
            recipientName: true,
            bankName: true,
            accountNumber: true,
            createdAt: true,
            requester: {
              select: {
                name: true,
                bankName: true,
                bankAccountName: true,
                bankAccountNumber: true,
              },
            },
            project: { select: { title: true, kelompokTani: true } },
            items: { select: { itemName: true, quantity: true, unit: true } },
          },
        })
      : Promise.resolve([]),
    (session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.DEPUTY_DIRECTOR)
      ? prisma.directStockPurchase.findMany({
          where: {
            isApprovedByDirector: false,
            status: DirectStockPurchaseStatus.PENDING_RECEIPT,
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            purchaseNumber: true,
            vendorName: true,
            totalAmount: true,
            createdAt: true,
            createdBy: { select: { name: true } },
            items: {
              select: { itemName: true, quantity: true, unit: true },
            },
          },
        })
      : Promise.resolve([]),
    (session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.DEPUTY_DIRECTOR)
      ? prisma.projectWorkPoint.findMany({
          where: {
            approvedTotalWage: null,
            project: { isDeleted: false },
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            title: true,
            location: true,
            proposedVolume: true,
            proposedUnit: true,
            proposedUnitPrice: true,
            proposedTotalWage: true,
            approvedTotalWage: true,
            proposedBy: { select: { name: true } },
            project: { select: { title: true, kelompokTani: true } },
          },
        })
      : Promise.resolve([]),
    (session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.DEPUTY_DIRECTOR)
      ? prisma.subkonTermyn.findMany({
          where: { status: SubkonTermynStatus.FINANCE_CHECKED },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            termynNumber: true,
            claimedPercent: true,
            grossAmount: true,
            retentionAmount: true,
            netAmount: true,
            createdAt: true,
            createdBy: { select: { name: true } },
            subkonContract: {
              select: {
                contractNumber: true,
                subkonName: true,
                project: { select: { title: true, kelompokTani: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.subkonContract.findMany({
      where: { status: SPKStatus.PENDING_APPROVAL },
      orderBy: { createdAt: "asc" },
      select: {
        publicCode: true,
        contractNumber: true,
        subkonName: true,
        workScope: true,
        contractValue: true,
        createdById: true,
        project: { select: { title: true, kelompokTani: true } },
      },
    }),
    prisma.projectAddendum.findMany({
      where: { status: ProjectAddendumStatus.PENDING_APPROVAL },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        addendumNumber: true,
        budgetChange: true,
        timeExtension: true,
        reason: true,
        project: { select: { title: true, kelompokTani: true } },
      },
    }),
    prisma.bASTDocument.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        bastNumber: true,
        type: true,
        date: true,
        maintenanceEndsAt: true,
        notes: true,
        project: { select: { title: true, kelompokTani: true } },
      },
    }),
    prisma.vendor.findMany({
      where: { isApproved: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        category: true,
        address: true,
        email: true,
        bankName: true,
        bankAccount: true,
        bankHolder: true,
        phone: true,
        rating: true,
      },
    }),
  ]);

  return (
    <>
      <ExecutiveApprovalHub
        role={session.user.role}
        currentUserId={session.user.id}
        purchaseOrders={orders.map((order) => ({
          publicCode: order.publicCode,
          poNumber: order.poNumber,
          vendorName: order.vendorName,
          vendorAddress:
            order.vendor?.address ??
            vendors.find(
              (vendor) =>
                vendor.name.trim().toLocaleLowerCase("id-ID") ===
                order.vendorName.trim().toLocaleLowerCase("id-ID"),
            )?.address ??
            null,
          vendorContact:
            order.vendor?.email ??
            vendors.find(
              (vendor) =>
                vendor.name.trim().toLocaleLowerCase("id-ID") ===
                order.vendorName.trim().toLocaleLowerCase("id-ID"),
            )?.email ??
            null,
          vendorPhone:
            order.vendor?.phone ??
            vendors.find(
              (vendor) =>
                vendor.name.trim().toLocaleLowerCase("id-ID") ===
                order.vendorName.trim().toLocaleLowerCase("id-ID"),
            )?.phone ??
            null,
          createdAt: order.createdAt.toISOString(),
          paymentMethod: order.paymentMethod,
          paymentBankName:
            order.paymentBankName ??
            order.vendor?.bankName ??
            vendors.find(
              (vendor) =>
                vendor.name.trim().toLocaleLowerCase("id-ID") ===
                order.vendorName.trim().toLocaleLowerCase("id-ID"),
            )?.bankName ??
            null,
          paymentAccountNumber:
            order.paymentAccountNumber ??
            order.vendor?.bankAccount ??
            vendors.find(
              (vendor) =>
                vendor.name.trim().toLocaleLowerCase("id-ID") ===
                order.vendorName.trim().toLocaleLowerCase("id-ID"),
            )?.bankAccount ??
            null,
          paymentAccountName:
            order.paymentAccountName ??
            order.vendor?.bankHolder ??
            vendors.find(
              (vendor) =>
                vendor.name.trim().toLocaleLowerCase("id-ID") ===
                order.vendorName.trim().toLocaleLowerCase("id-ID"),
            )?.bankHolder ??
            null,
          paymentTerms: order.paymentTerms,
          includeTax: order.includeTax,
          financeReviewerName: order.reviewedBy?.name ?? null,
          financeReviewedAt: order.reviewedAt?.toLocaleString("id-ID") ?? null,
          projectSiteName: order.ticket?.project
            ? `${order.ticket.project.kelompokTani} · ${order.ticket.project.location ?? ""}`.trim()
            : "Gudang (tanpa proyek)",
          ticketNumber: order.ticket?.ticketNumber ?? null,
          items: order.items,
        }))}
        initialTab={tab}
        initialOpenSheet={openSheet}
        directPurchases={directPurchases.map((purchase) => ({
          id: purchase.id,
          purchaseNumber: purchase.purchaseNumber,
          vendorName: purchase.vendorName,
          totalAmount: purchase.totalAmount.toString(),
          createdAt: purchase.createdAt.toISOString(),
          createdByName: purchase.createdBy.name,
          items: purchase.items.map((item) => ({
            ...item,
            quantity: item.quantity.toString(),
          })),
        }))}
        tickets={tickets.map((ticket) => ({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          type: ticket.type,
          totalAmount:
            ticket.totalAmount?.toString() ??
            ticket.requestedAmount?.toString() ??
            null,
          recipientName:
            ticket.recipientName ?? ticket.requester.bankAccountName,
          bankName: ticket.bankName ?? ticket.requester.bankName,
          accountNumber:
            ticket.accountNumber ?? ticket.requester.bankAccountNumber,
          createdAt: ticket.createdAt.toISOString(),
          requesterName: ticket.requester.name,
          projectName: ticket.project
            ? `${ticket.project.kelompokTani} · ${ticket.project.title}`
            : null,
          items: ticket.items,
        }))}
        wages={workPoints.map((workPoint) => ({
          id: workPoint.id,
          title: workPoint.title,
          location: workPoint.location,
          proposedVolume: workPoint.proposedVolume?.toString() ?? null,
          proposedUnit: workPoint.proposedUnit,
          proposedUnitPrice: workPoint.proposedUnitPrice?.toString() ?? null,
          projectName: `${workPoint.project.kelompokTani} · ${workPoint.project.title}`,
          proposedTotalWage: workPoint.proposedTotalWage.toString(),
          approvedTotalWage: workPoint.approvedTotalWage?.toString() ?? null,
          proposedByName: workPoint.proposedBy.name,
        }))}
        termyns={termyns.map((termyn) => ({
          id: termyn.id,
          termynNumber: termyn.termynNumber,
          claimedPercent: termyn.claimedPercent.toString(),
          grossAmount: termyn.grossAmount.toString(),
          retentionAmount: termyn.retentionAmount.toString(),
          netAmount: termyn.netAmount.toString(),
          createdAt: termyn.createdAt.toISOString(),
          createdByName: termyn.createdBy.name,
          contractNumber: termyn.subkonContract.contractNumber,
          subkonName: termyn.subkonContract.subkonName,
          projectName: `${termyn.subkonContract.project.kelompokTani} · ${termyn.subkonContract.project.title}`,
        }))}
        contracts={contracts.map((contract) => ({
          publicCode: contract.publicCode,
          contractNumber: contract.contractNumber,
          subkonName: contract.subkonName,
          workScope: contract.workScope,
          contractValue: contract.contractValue.toString(),
          createdById: contract.createdById,
          projectName: `${contract.project.kelompokTani} · ${contract.project.title}`,
        }))}
        addendums={addendums.map((addendum) => ({
          id: addendum.id,
          addendumNumber: addendum.addendumNumber,
          budgetChange: addendum.budgetChange.toString(),
          timeExtension: addendum.timeExtension,
          reason: addendum.reason,
          projectName: `${addendum.project.kelompokTani} · ${addendum.project.title}`,
        }))}
        bastDocuments={bastDocuments.map((bast) => ({
          id: bast.id,
          bastNumber: bast.bastNumber,
          type: bast.type,
          date: bast.date.toISOString().slice(0, 10),
          maintenanceEndsAt:
            bast.maintenanceEndsAt?.toISOString().slice(0, 10) ?? null,
          notes: bast.notes,
          projectName: `${bast.project.kelompokTani} · ${bast.project.title}`,
        }))}
      />
    </>
  );
}
