import TicketsApp from "@/app/components/apps/tickets";
import CreateTicketModal from "@/app/components/apps/tickets/CreateTicketModal";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import {
  PaymentStatus,
  TicketStatus,
  TicketType,
  UserRole,
} from "@/generated/prisma/enums";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import type { TicketRow } from "../../types/ticket";
import { redirect } from "next/navigation";
export const metadata: Metadata = {
  title: "Ticket App",
};

const BCrumb = [
  {
    to: "/",
    title: "Home",
  },
  {
    title: "Tickets",
  },
];
const Tickets = async ({
  searchParams,
}: {
  searchParams: Promise<{ openSheet?: string }>;
}) => {
  const { openSheet } = await searchParams;
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/login");
  }
  if (session.user.role === UserRole.MOVER) {
    redirect("/apps/logistics");
  }

  let where: Prisma.TicketWhereInput;
  const requesterDraft: Prisma.TicketWhereInput = {
    status: TicketStatus.DRAFT,
    requesterId: session.user.id,
  };
  switch (session.user.role) {
    case UserRole.DIRECTOR:
      where = {
        OR: [
          { status: TicketStatus.PENDING_DIRECTOR },
          { status: TicketStatus.COMPLETED },
          requesterDraft,
        ],
      };
      break;
    case UserRole.DEPUTY_DIRECTOR:
      where = {
        OR: [
          {
            status: TicketStatus.COMPLETED,
            auditLogs: {
              some: { action: "FINANCE_PAYMENT_COMPLETED" },
            },
          },
          requesterDraft,
        ],
      };
      break;
    case UserRole.KOORDINATOR:
      where = {
        OR: [
          { status: TicketStatus.PENDING_DIRECTOR },
          requesterDraft,
        ],
      };
      break;
    case UserRole.FINANCE:
      where = {
        OR: [
          { status: TicketStatus.WAITING_FINANCE_PAYMENT },
          { status: TicketStatus.PROCESSED_FINANCE },
          {
            status: TicketStatus.COMPLETED,
            OR: [
              { type: { in: [TicketType.COST, TicketType.OPERATIONAL] } },
              { type: TicketType.MATERIAL, transferReceiptUrl: { not: null } },
            ],
          },
          requesterDraft,
        ],
      };
      break;
    case UserRole.LOGISTICS:
      where = {
        OR: [
          { status: TicketStatus.PROCESSED_LOGISTIC },
          { status: TicketStatus.ASSIGNED_TO_MOVER },
          { status: TicketStatus.IN_TRANSIT },
          {
            status: TicketStatus.WAITING_FINANCE_PAYMENT,
            type: TicketType.MATERIAL,
            purchaseReceiptUrl: { not: null },
          },
          { status: TicketStatus.COMPLETED, type: TicketType.MATERIAL },
          requesterDraft,
        ],
      };
      break;
    case UserRole.ADMINISTRATIONS:
      where = {};
      break;
    default:
      where = { requesterId: session.user.id };
  }

  const [tickets, projects, stockItems, movers] = await Promise.all([
    prisma.ticket.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      include: {
        requester: { select: { name: true } },
        project: { select: { title: true, kelompokTani: true } },
        items: {
          select: {
            id: true,
            itemName: true,
            quantity: true,
            unit: true,
            estimatedCost: true,
            categoryHint: true,
            expectedDeliveryDate: true,
            status: true,
            poItemId: true,
            doItemId: true,
          },
          orderBy: { id: "asc" },
        },
        auditLogs: {
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        },
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          select: {
            publicCode: true,
            poNumber: true,
            vendorName: true,
            paymentBankName: true,
            paymentAccountNumber: true,
            paymentAccountName: true,
            status: true,
            createdAt: true,
            paidAt: true,
            items: { select: { totalPrice: true } },
            paymentTransactions: {
              where: { status: PaymentStatus.PAID },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                paymentType: true,
                amount: true,
                transferDestination: true,
                proofOfTransferUrl: true,
                paidAt: true,
              },
            },
          },
        },
        paymentTransactions: {
          where: { status: PaymentStatus.PAID },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            paymentType: true,
            amount: true,
            transferDestination: true,
            proofOfTransferUrl: true,
            paidAt: true,
          },
        },
        deliveryOrders: {
          orderBy: { createdAt: "desc" },
          select: {
            publicCode: true,
            doNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    }),
    prisma.project.findMany({
      where: {
        isDeleted: false,
        ...(session.user.role === UserRole.FIELD_TEAM ||
        session.user.role === UserRole.KOORDINATOR
          ? { fieldPicId: session.user.id }
          : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, title: true, kelompokTani: true },
    }),
    prisma.stockItem.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, unit: true, stockQuantity: true },
    }),
    session.user.role === UserRole.FIELD_TEAM
      ? prisma.user.findMany({
          where: { role: UserRole.MOVER, isActive: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const ticketRows: TicketRow[] = tickets.map((ticket) => ({
    id: ticket.id,
    ticketNumber: ticket.ticketNumber,
    title: ticket.title,
    description: ticket.description,
    type: ticket.type,
    requestCategory: ticket.requestCategory,
    fieldCategory: ticket.fieldCategory,
    priority: ticket.priority,
    status: ticket.status,
    fulfillmentStatus: ticket.fulfillmentStatus,
    canSubmit: ticket.requesterId === session.user.id,
    totalAmount:
      ticket.purchaseOrders[0]?.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0,
      ).toString() ??
      ticket.totalAmount?.toString() ??
      null,
    attachmentUrl: ticket.attachmentUrl,
    purchaseReceiptUrl: ticket.purchaseReceiptUrl,
    transferReceiptUrl: ticket.transferReceiptUrl,
    deliveryReceiptUrl: ticket.deliveryReceiptUrl,
    recipientName:
      session.user.role === UserRole.FINANCE ||
      session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.ADMINISTRATIONS ||
      ticket.requesterId === session.user.id
        ? ticket.recipientName
        : null,
    bankName:
      session.user.role === UserRole.FINANCE ||
      session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.ADMINISTRATIONS ||
      ticket.requesterId === session.user.id
        ? ticket.bankName
        : null,
    accountNumber:
      session.user.role === UserRole.FINANCE ||
      session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.ADMINISTRATIONS ||
      ticket.requesterId === session.user.id
        ? ticket.accountNumber
        : null,
    createdAt: ticket.createdAt.toISOString(),
    requester: ticket.requester,
    project: ticket.project,
    items: ticket.items.map((item) => ({
      ...item,
      estimatedCost: item.estimatedCost?.toString() ?? null,
      expectedDeliveryDate:
        item.expectedDeliveryDate?.toISOString().slice(0, 10) ?? null,
    })),
    auditLogs: ticket.auditLogs.map((audit) => ({
      ...audit,
      createdAt: audit.createdAt.toISOString(),
    })),
    purchaseOrders: ticket.purchaseOrders.map((purchaseOrder) => ({
      ...purchaseOrder,
      createdAt: purchaseOrder.createdAt.toISOString(),
      paidAt: purchaseOrder.paidAt?.toISOString() ?? null,
    })),
    paymentTransactions:
      session.user.role === UserRole.FINANCE ||
      session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.ADMINISTRATIONS ||
      ticket.requesterId === session.user.id
        ? [
            ...ticket.paymentTransactions,
            ...ticket.purchaseOrders.flatMap(
              (purchaseOrder) => purchaseOrder.paymentTransactions,
            ),
          ]
            .sort(
              (a, b) =>
                (b.paidAt?.getTime() ?? 0) - (a.paidAt?.getTime() ?? 0),
            )
            .map((payment) => ({
              ...payment,
              paidAt: payment.paidAt?.toISOString() ?? null,
            }))
        : [],
    deliveryOrders: ticket.deliveryOrders.map((deliveryOrder) => ({
      ...deliveryOrder,
      createdAt: deliveryOrder.createdAt.toISOString(),
    })),
  }));

  return (
    <>
      <BreadcrumbComp
        title="Tickets App"
        items={BCrumb}
        action={
          <CreateTicketModal
            projects={projects}
            requesterRole={session.user.role}
            movers={movers}
            stockItems={stockItems.map((item) => ({
              ...item,
              stockQuantity: item.stockQuantity.toString(),
            }))}
          />
        }
      />
      <TicketsApp
        tickets={ticketRows}
        projects={projects}
        role={session.user.role}
        initialOpenSheet={openSheet}
      />
    </>
  );
};

export default Tickets;
