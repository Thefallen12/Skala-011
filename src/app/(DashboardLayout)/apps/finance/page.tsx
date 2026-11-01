import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FinanceHub from "@/app/components/apps/finance/FinanceHub";
import type {
  FinanceDashboardMonth,
  FinanceDashboardTransaction,
  FinanceExpenseCategory,
} from "@/app/components/apps/finance/FinanceDashboard";
import { Prisma } from "@/generated/prisma/client";
import {
  BASTType,
  DocType,
  PaymentStatus,
  POStatus,
  SubkonTermynStatus,
  TicketType,
  TicketStatus,
  UserRole,
} from "@/generated/prisma/enums";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import type { VehicleFuelRequestView } from "@/lib/vehicle-fuel-types";

export const metadata: Metadata = {
  title: "Finance Hub",
};

const financeRoles: UserRole[] = [
  UserRole.FINANCE,
  UserRole.ADMINISTRATIONS,
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
];

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; openSheet?: string }>;
}) {
  const { tab, openSheet } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!financeRoles.includes(session.user.role)) redirect("/");
  const currentDate = new Date();
  const cashflowDashboardStart = new Date(
    Date.UTC(currentDate.getUTCFullYear(), currentDate.getUTCMonth() - 5, 1),
  );

  const [
    orders,
    standalonePayments,
    directPurchases,
    tickets,
    termyns,
    retentionContracts,
    vendors,
    documentTemplates,
    financeAccounts,
    cashflows,
    unmatchedHistoricalPayments,
    dashboardIncomingFunds,
    dashboardPaidExpenses,
    financeProjects,
    vehicleTripLogs,
    vehicleFuelRequests,
    documentSignoffInvoices,
    documentSignoffConfirmations,
    documentSignoffDeliveryOrders,
    cashflowMonthlyAggregates,
  ] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { status: POStatus.DRAFT },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        publicCode: true,
        poNumber: true,
        vendorName: true,
        vendor: {
          select: {
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
        paidAt: true,
        paymentReceiptUrl: true,
        vendorInvoiceUrl: true,
        items: {
          select: {
            itemName: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            totalPrice: true,
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
            status: true,
            proofOfTransferUrl: true,
            paidAt: true,
          },
        },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: {
        status: POStatus.APPROVED,
        ticketId: null,
        vendorInvoiceUrl: { not: null },
      },
      orderBy: { approvedAt: "asc" },
      select: {
        id: true,
        publicCode: true,
        poNumber: true,
        vendorName: true,
        vendor: {
          select: {
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
        paidAt: true,
        paymentReceiptUrl: true,
        vendorInvoiceUrl: true,
        items: {
          select: {
            itemName: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            totalPrice: true,
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
            status: true,
            proofOfTransferUrl: true,
            paidAt: true,
          },
        },
      },
    }),
    prisma.directStockPurchase.findMany({
      where: { isApprovedByDirector: true },
      orderBy: { approvedAt: "asc" },
      take: 100,
      select: {
        id: true,
        purchaseNumber: true,
        vendorName: true,
        totalAmount: true,
        paymentBankName: true,
        paymentAccountNumber: true,
        paymentAccountName: true,
        createdAt: true,
        items: {
          select: {
            itemName: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            totalPrice: true,
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
            status: true,
            proofOfTransferUrl: true,
            paidAt: true,
          },
        },
      },
    }),
    prisma.ticket.findMany({
      where: {
        status: {
          in: [
            TicketStatus.WAITING_FINANCE_PAYMENT,
            TicketStatus.PROCESSED_FINANCE,
            TicketStatus.PROCESSED_LOGISTIC,
            TicketStatus.ASSIGNED_TO_MOVER,
            TicketStatus.IN_TRANSIT,
            TicketStatus.COMPLETED,
          ],
        },
        isApprovedByDirector: true,
        OR: [
          { type: { not: TicketType.MATERIAL } },
          { purchaseReceiptUrl: { not: null } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        ticketNumber: true,
        title: true,
        totalAmount: true,
        requestedAmount: true,
        purchaseReceiptUrl: true,
        recipientName: true,
        bankName: true,
        accountNumber: true,
        requester: {
          select: {
            name: true,
            bankName: true,
            bankAccountName: true,
            bankAccountNumber: true,
          },
        },
        purchaseOrders: {
          where: { status: POStatus.APPROVED },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            vendorName: true,
            includeTax: true,
            paymentBankName: true,
            paymentAccountNumber: true,
            paymentAccountName: true,
            items: { select: { totalPrice: true } },
            paymentTransactions: {
              where: { status: PaymentStatus.PAID },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                paymentType: true,
                amount: true,
                transferDestination: true,
                status: true,
                proofOfTransferUrl: true,
                paidAt: true,
              },
            },
          },
        },
        project: { select: { title: true, kelompokTani: true } },
        paymentTransactions: {
          where: { status: PaymentStatus.PAID },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            paymentType: true,
            amount: true,
            transferDestination: true,
            status: true,
            proofOfTransferUrl: true,
            paidAt: true,
          },
        },
      },
    }),
    prisma.subkonTermyn.findMany({
      where: {
        status: {
          in: [
            SubkonTermynStatus.FIELD_VERIFIED,
            SubkonTermynStatus.APPROVED,
          ],
        },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        termynNumber: true,
        claimedPercent: true,
        grossAmount: true,
        retentionAmount: true,
        netAmount: true,
        status: true,
        subkonContract: {
          select: {
            contractNumber: true,
            subkonName: true,
            project: { select: { title: true, kelompokTani: true } },
          },
        },
      },
    }),
    prisma.subkonContract.findMany({
      where: {
        retentionReleasedAt: null,
        termyns: { some: {} },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        contractNumber: true,
        subkonName: true,
        retentionReleasedAt: true,
        termyns: {
          select: { status: true, retentionAmount: true },
        },
        project: {
          select: {
            title: true,
            kelompokTani: true,
            bastDocuments: {
              where: { type: BASTType.PHO, isApproved: true },
              select: { maintenanceEndsAt: true },
            },
          },
        },
      },
    }),
    prisma.vendor.findMany({
      where: { isApproved: true },
      select: {
        name: true,
        address: true,
        phone: true,
        email: true,
        bankName: true,
        bankAccount: true,
        bankHolder: true,
      },
    }),
    prisma.documentTemplate.findMany({
      where: {
        type: {
          in: [
            DocType.INVOICE,
            DocType.PURCHASE_ORDER,
            DocType.DO,
            DocType.SPK,
            DocType.SURAT_JALAN,
            DocType.BAST,
          ],
        },
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      select: { id: true, name: true, type: true },
    }),
    prisma.financeAccount.findMany({
      orderBy: { accountName: "asc" },
      select: {
        id: true,
        accountName: true,
        accountNumber: true,
        holderName: true,
        balance: true,
      },
    }),
    prisma.cashflow.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        type: true,
        amount: true,
        sourceDesc: true,
        paymentMethod: true,
        senderName: true,
        transferGroupId: true,
        proofUrl: true,
        createdAt: true,
        account: { select: { accountName: true } },
        project: { select: { kelompokTani: true } },
        recorder: { select: { name: true } },
      },
    }),
    prisma.paymentTransaction.findMany({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { not: null },
        cashflow: null,
        OR: [
          { ticketId: { not: null } },
          { poId: { not: null } },
          { directStockPurchaseId: { not: null } },
        ],
      },
      orderBy: { paidAt: "desc" },
      take: 200,
      select: {
        id: true,
        amount: true,
        paymentType: true,
        proofOfTransferUrl: true,
        paidAt: true,
        ticket: {
          select: { ticketNumber: true, title: true },
        },
        po: {
          select: { poNumber: true, vendorName: true },
        },
        directStockPurchase: {
          select: { purchaseNumber: true, vendorName: true },
        },
      },
    }),
    prisma.cashflow.findMany({
      where: { type: "IN", transferGroupId: null },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        amount: true,
        sourceDesc: true,
        paymentMethod: true,
        senderName: true,
        proofUrl: true,
        createdAt: true,
        account: { select: { accountName: true } },
        project: { select: { kelompokTani: true } },
        recorder: { select: { name: true } },
      },
    }),
    prisma.paymentTransaction.findMany({
      where: {
        status: PaymentStatus.PAID,
        paidAt: { not: null },
        OR: [
          { ticketId: { not: null } },
          { poId: { not: null } },
          { directStockPurchaseId: { not: null } },
        ],
      },
      orderBy: { paidAt: "desc" },
      take: 200,
      select: {
        id: true,
        amount: true,
        transferDestination: true,
        proofOfTransferUrl: true,
        paymentType: true,
        paidAt: true,
        ticket: {
          select: {
            ticketNumber: true,
            title: true,
            requester: { select: { name: true } },
            project: { select: { title: true, kelompokTani: true } },
          },
        },
        po: {
          select: {
            poNumber: true,
            vendorName: true,
            project: { select: { title: true, kelompokTani: true } },
          },
        },
        directStockPurchase: {
          select: {
            purchaseNumber: true,
            vendorName: true,
            ticket: {
              select: {
                project: { select: { title: true, kelompokTani: true } },
              },
            },
          },
        },
      },
    }),
    prisma.project.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true, kelompokTani: true },
    }),
    prisma.vehicleTripLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        createdAt: true,
        kilometerStart: true,
        kilometerEnd: true,
        distanceKm: true,
        fuelLiter: true,
        vehicle: { select: { plateNumber: true, vehicleType: true } },
        deliveryOrder: { select: { doNumber: true } },
        project: { select: { title: true, kelompokTani: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.vehicleFuelRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        status: true,
        source: true,
        estimatedDistanceKm: true,
        exceptionDistanceKm: true,
        exceptionReason: true,
        estimatedFuelLiter: true,
        unitPrice: true,
        requestedAmount: true,
        disbursementMethod: true,
        transferDestination: true,
        transferProofUrl: true,
        beforeFillingPhotoUrl: true,
        afterFillingPhotoUrl: true,
        receiptPhotoUrl: true,
        financeNote: true,
        createdAt: true,
        disbursedAt: true,
        proofSubmittedAt: true,
        requestedBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        deliveryOrder: {
          select: {
            doNumber: true,
            vehicleTripLog: {
              select: {
                distanceKm: true,
              },
            },
            ticket: {
              select: {
                project: { select: { title: true, kelompokTani: true } },
              },
            },
          },
        },
        vehicle: { select: { plateNumber: true, vehicleType: true } },
        project: { select: { title: true, kelompokTani: true } },
      },
    }),
    session.user.role === UserRole.FINANCE
      ? prisma.invoice.findMany({
          where: { signedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            invoiceNumber: true,
            signedBy: { select: { name: true } },
            signedAt: true,
            acknowledgedBy: { select: { name: true } },
            acknowledgedAt: true,
          },
        })
      : session.user.role === UserRole.DIRECTOR
        ? prisma.invoice.findMany({
            where: { signedAt: { not: null }, acknowledgedAt: null },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              invoiceNumber: true,
              signedBy: { select: { name: true } },
              signedAt: true,
              acknowledgedBy: { select: { name: true } },
              acknowledgedAt: true,
            },
          })
        : Promise.resolve([]),
    session.user.role === UserRole.FINANCE
      ? prisma.orderConfirmation.findMany({
          where: { signedAt: { not: null }, acknowledgedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            koNumber: true,
            signedBy: { select: { name: true } },
            signedAt: true,
            acknowledgedBy: { select: { name: true } },
            acknowledgedAt: true,
          },
        })
      : Promise.resolve([]),
    session.user.role === UserRole.FINANCE
      ? prisma.deliveryOrder.findMany({
          where: { signedAt: { not: null }, acknowledgedAt: null },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            publicCode: true,
            doNumber: true,
            signedBy: { select: { name: true } },
            signedAt: true,
            acknowledgedBy: { select: { name: true } },
            acknowledgedAt: true,
          },
        })
      : Promise.resolve([]),
    prisma.$queryRaw<
      {
        monthKey: string;
        flowType: string;
        sourceCategory: string;
        totalAmount: number;
      }[]
    >`
      SELECT "monthKey", "flowType", "sourceCategory",
        SUM("totalAmount")::double precision AS "totalAmount"
      FROM (
        SELECT
          to_char(date_trunc('month', "createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM') AS "monthKey",
          'IN'::text AS "flowType",
          'incoming'::text AS "sourceCategory",
          SUM(amount)::double precision AS "totalAmount"
        FROM "Cashflow"
        WHERE type = 'IN'
          AND "transferGroupId" IS NULL
          AND "createdAt" >= ${cashflowDashboardStart}
          AND "createdAt" <= ${currentDate}
        GROUP BY 1

        UNION ALL

        SELECT
          to_char(date_trunc('month', "paidAt" AT TIME ZONE 'UTC'), 'YYYY-MM') AS "monthKey",
          'OUT'::text AS "flowType",
          CASE
            WHEN "ticketId" IS NOT NULL THEN 'ticket'
            WHEN "poId" IS NOT NULL THEN 'purchase-order'
            ELSE 'direct-material'
          END AS "sourceCategory",
          SUM(amount)::double precision AS "totalAmount"
        FROM "PaymentTransaction"
        WHERE status = ${PaymentStatus.PAID}
          AND "paidAt" >= ${cashflowDashboardStart}
          AND "paidAt" <= ${currentDate}
          AND (
            "ticketId" IS NOT NULL
            OR "poId" IS NOT NULL
            OR "directStockPurchaseId" IS NOT NULL
          )
        GROUP BY 1, 3
      ) AS "financeFlows"
      GROUP BY 1, 2, 3
      ORDER BY 1 ASC
    `,
  ]);

  const dashboardMonths: FinanceDashboardMonth[] = Array.from(
    { length: 6 },
    (_, index) => {
      const monthDate = new Date(
        Date.UTC(
          currentDate.getUTCFullYear(),
          currentDate.getUTCMonth() - 5 + index,
          1,
        ),
      );
      const key = `${monthDate.getUTCFullYear()}-${String(
        monthDate.getUTCMonth() + 1,
      ).padStart(2, "0")}`;
      const monthAggregates = cashflowMonthlyAggregates.filter(
        (aggregate) => aggregate.monthKey === key,
      );
      return {
        key,
        label: new Intl.DateTimeFormat("id-ID", {
          month: "short",
          timeZone: "UTC",
        }).format(monthDate),
        inflow: monthAggregates
          .filter((aggregate) => aggregate.flowType === "IN")
          .reduce((total, aggregate) => total + aggregate.totalAmount, 0),
        outflow: monthAggregates
          .filter((aggregate) => aggregate.flowType === "OUT")
          .reduce((total, aggregate) => total + aggregate.totalAmount, 0),
      };
    },
  );
  const currentMonthCashflow = dashboardMonths[dashboardMonths.length - 1];
  const expenseCategoryLabels: Record<
    FinanceExpenseCategory["kind"],
    string
  > = {
    ticket: "Tiket",
    "purchase-order": "Purchase Order",
    "direct-material": "Belanja Material Langsung",
  };
  const expenseCategoryKinds: FinanceExpenseCategory["kind"][] = [
    "ticket",
    "purchase-order",
    "direct-material",
  ];
  const expenseCategories: FinanceExpenseCategory[] = expenseCategoryKinds.map((kind) => ({
    kind,
    label: expenseCategoryLabels[kind],
    amount: cashflowMonthlyAggregates
      .filter(
        (aggregate) =>
          aggregate.flowType === "OUT" &&
          aggregate.sourceCategory === kind,
      )
      .reduce((total, aggregate) => total + aggregate.totalAmount, 0),
  }));
  const dashboardTransactions: FinanceDashboardTransaction[] = [
    ...dashboardIncomingFunds.map((fund) => ({
      id: fund.id,
      createdAt: fund.createdAt.toISOString(),
      type: "IN" as const,
      category: "Dana Masuk",
      sourceDesc: fund.sourceDesc,
      paymentMethod:
        fund.paymentMethod === "DEPOSIT"
          ? "Setor tunai"
          : fund.paymentMethod === "CASH"
            ? "Tunai"
            : "Transfer",
      counterparty: fund.senderName || fund.recorder.name || "—",
      accountOrDestination: fund.account.accountName,
      projectName: fund.project?.kelompokTani ?? null,
      amount: fund.amount,
      proofUrl: fund.proofUrl,
    })),
    ...dashboardPaidExpenses.flatMap((payment) => {
      if (!payment.paidAt) return [];
      if (payment.ticket) {
        return [{
          id: payment.id,
          createdAt: payment.paidAt.toISOString(),
          type: "OUT" as const,
          category: "Tiket",
          sourceDesc: `${payment.ticket.ticketNumber} · ${payment.ticket.title}`,
          paymentMethod:
            payment.paymentType === "DOWN_PAYMENT"
              ? "Down Payment"
              : payment.paymentType === "PROGRESS_PAYMENT"
                ? "Termin"
                : "Pelunasan",
          counterparty: payment.ticket.requester.name,
          accountOrDestination: payment.transferDestination || "Tujuan tidak dicatat",
          projectName:
            payment.ticket.project?.kelompokTani ||
            payment.ticket.project?.title ||
            null,
          amount: payment.amount,
          proofUrl: payment.proofOfTransferUrl,
        }];
      }
      if (payment.po) {
        return [{
          id: payment.id,
          createdAt: payment.paidAt.toISOString(),
          type: "OUT" as const,
          category: "Purchase Order",
          sourceDesc: `${payment.po.poNumber} · ${payment.po.vendorName}`,
          paymentMethod:
            payment.paymentType === "DOWN_PAYMENT"
              ? "Down Payment"
              : payment.paymentType === "PROGRESS_PAYMENT"
                ? "Termin"
                : "Pelunasan",
          counterparty: payment.po.vendorName,
          accountOrDestination: payment.transferDestination || "Tujuan tidak dicatat",
          projectName:
            payment.po.project?.kelompokTani ||
            payment.po.project?.title ||
            null,
          amount: payment.amount,
          proofUrl: payment.proofOfTransferUrl,
        }];
      }
      if (payment.directStockPurchase) {
        const project = payment.directStockPurchase.ticket?.project;
        return [{
          id: payment.id,
          createdAt: payment.paidAt.toISOString(),
          type: "OUT" as const,
          category: "Belanja Material Langsung",
          sourceDesc: `${payment.directStockPurchase.purchaseNumber} · ${payment.directStockPurchase.vendorName}`,
          paymentMethod:
            payment.paymentType === "DOWN_PAYMENT"
              ? "Down Payment"
              : payment.paymentType === "PROGRESS_PAYMENT"
                ? "Termin"
                : "Pelunasan",
          counterparty: payment.directStockPurchase.vendorName,
          accountOrDestination: payment.transferDestination || "Tujuan tidak dicatat",
          projectName: project?.kelompokTani || project?.title || null,
          amount: payment.amount,
          proofUrl: payment.proofOfTransferUrl,
        }];
      }
      return [];
    }),
  ].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() -
      new Date(first.createdAt).getTime(),
  );

  const findVendor = (name: string) =>
    vendors.find(
      (vendor) =>
        vendor.name.trim().toLocaleLowerCase("id-ID") ===
        name.trim().toLocaleLowerCase("id-ID"),
    );

  const historicalPayments = unmatchedHistoricalPayments.flatMap((payment) => {
    if (!payment.paidAt) return [];
    const source = payment.ticket
     ? {
         category: "Tiket",
         description: `${payment.ticket.ticketNumber} · ${payment.ticket.title}`,
       }
     : payment.po
       ? {
           category: "Purchase Order",
           description: `${payment.po.poNumber} · ${payment.po.vendorName}`,
         }
       : payment.directStockPurchase
         ? {
             category: "Belanja Material Langsung",
             description: `${payment.directStockPurchase.purchaseNumber} · ${payment.directStockPurchase.vendorName}`,
           }
         : null;
    if (!source) return [];
    return [{
     id: payment.id,
     amount: payment.amount,
     paidAt: payment.paidAt.toISOString(),
     paymentType: payment.paymentType,
     proofUrl: payment.proofOfTransferUrl,
     category: source.category,
     sourceDesc: source.description,
    }];
  });

  return (
    <>
      <FinanceHub
        key={`${tab ?? ""}:${openSheet ?? ""}`}
        role={session.user.role}
        cloudinaryCloudName={process.env.CLOUDINARY_CLOUD_NAME ?? ""}
        cloudinaryApiKey={process.env.CLOUDINARY_API_KEY ?? ""}
        dashboardMonths={dashboardMonths}
        financeAccounts={financeAccounts}
        dashboardTransactions={dashboardTransactions}
        expenseCategories={expenseCategories}
        cashflows={cashflows.map((cashflow) => ({
          ...cashflow,
          createdAt: cashflow.createdAt.toISOString(),
        }))}
        historicalPayments={historicalPayments}
        financeProjects={financeProjects.map((project) => ({
          id: project.id,
          name: project.kelompokTani || project.title,
        }))}
        monthInflow={currentMonthCashflow.inflow}
        monthOutflow={currentMonthCashflow.outflow}
        documentSignoffTasks={[
          ...documentSignoffInvoices.map((document) => ({
            id: document.id,
            kind: "INVOICE" as const,
            number: document.invoiceNumber,
            action:
              session.user.role === UserRole.FINANCE
                ? ("sign" as const)
                : ("acknowledge" as const),
            signedByName: document.signedBy?.name ?? null,
            signedAt: document.signedAt?.toISOString() ?? null,
            acknowledgedByName: document.acknowledgedBy?.name ?? null,
            acknowledgedAt: document.acknowledgedAt?.toISOString() ?? null,
            previewUrl: `/api/documents/transactions?kind=INVOICE&id=${encodeURIComponent(document.id)}`,
          })),
          ...documentSignoffConfirmations.map((document) => ({
            id: document.id,
            kind: "KO" as const,
            number: document.koNumber,
            action: "acknowledge" as const,
            signedByName: document.signedBy?.name ?? null,
            signedAt: document.signedAt?.toISOString() ?? null,
            acknowledgedByName: document.acknowledgedBy?.name ?? null,
            acknowledgedAt: document.acknowledgedAt?.toISOString() ?? null,
            previewUrl: `/api/documents/transactions?kind=KO&id=${encodeURIComponent(document.id)}`,
          })),
          ...documentSignoffDeliveryOrders.map((document) => ({
            id: document.id,
            kind: "DO" as const,
            number: document.doNumber,
            action: "acknowledge" as const,
            signedByName: document.signedBy?.name ?? null,
            signedAt: document.signedAt?.toISOString() ?? null,
            acknowledgedByName: document.acknowledgedBy?.name ?? null,
            acknowledgedAt: document.acknowledgedAt?.toISOString() ?? null,
            previewUrl: `/api/documents/transactions?kind=DO&publicCode=${encodeURIComponent(document.publicCode)}`,
          })),
        ]}
        purchaseOrders={orders.map((order) => ({
          id: order.id,
          publicCode: order.publicCode,
          poNumber: order.poNumber,
          vendorName: order.vendorName,
          vendorAddress: order.vendor?.address ?? findVendor(order.vendorName)?.address ?? null,
          vendorContact: order.vendor?.email ?? findVendor(order.vendorName)?.email ?? null,
          vendorPhone: order.vendor?.phone ?? findVendor(order.vendorName)?.phone ?? null,
          createdAt: order.createdAt.toISOString(),
          paidAt: order.paidAt?.toISOString() ?? null,
          paymentReceiptUrl: order.paymentReceiptUrl,
          vendorInvoiceUrl: order.vendorInvoiceUrl,
          paymentMethod: order.paymentMethod,
          paymentBankName:
            order.paymentBankName ??
            order.vendor?.bankName ??
            findVendor(order.vendorName)?.bankName ??
            null,
          paymentAccountNumber:
            order.paymentAccountNumber ??
            order.vendor?.bankAccount ??
            findVendor(order.vendorName)?.bankAccount ??
            null,
          paymentAccountName:
            order.paymentAccountName ??
            order.vendor?.bankHolder ??
            findVendor(order.vendorName)?.bankHolder ??
            null,
          paymentTerms: order.paymentTerms,
          includeTax: order.includeTax,
          items: order.items,
          paymentTransactions: order.paymentTransactions.map((payment) => ({
            ...payment,
            paidAt: payment.paidAt?.toISOString() ?? null,
          })),
        }))}
        standalonePayments={standalonePayments.map((order) => ({
          id: order.id,
          publicCode: order.publicCode,
          poNumber: order.poNumber,
          vendorName: order.vendorName,
          vendorAddress: order.vendor?.address ?? findVendor(order.vendorName)?.address ?? null,
          vendorContact: order.vendor?.email ?? findVendor(order.vendorName)?.email ?? null,
          vendorPhone: order.vendor?.phone ?? findVendor(order.vendorName)?.phone ?? null,
          createdAt: order.createdAt.toISOString(),
          paidAt: order.paidAt?.toISOString() ?? null,
          paymentReceiptUrl: order.paymentReceiptUrl,
          vendorInvoiceUrl: order.vendorInvoiceUrl,
          paymentMethod: order.paymentMethod,
          paymentBankName:
            order.paymentBankName ??
            order.vendor?.bankName ??
            findVendor(order.vendorName)?.bankName ??
            null,
          paymentAccountNumber:
            order.paymentAccountNumber ??
            order.vendor?.bankAccount ??
            findVendor(order.vendorName)?.bankAccount ??
            null,
          paymentAccountName:
            order.paymentAccountName ??
            order.vendor?.bankHolder ??
            findVendor(order.vendorName)?.bankHolder ??
            null,
          paymentTerms: order.paymentTerms,
          includeTax: order.includeTax,
          items: order.items,
          paymentTransactions: order.paymentTransactions.map((payment) => ({
            ...payment,
            paidAt: payment.paidAt?.toISOString() ?? null,
          })),
        }))}
        directPurchases={directPurchases.map((purchase) => ({
          id: purchase.id,
          purchaseNumber: purchase.purchaseNumber,
          vendorName: purchase.vendorName,
          totalAmount: purchase.totalAmount.toString(),
          paymentBankName: purchase.paymentBankName,
          paymentAccountNumber: purchase.paymentAccountNumber,
          paymentAccountName: purchase.paymentAccountName,
          createdAt: purchase.createdAt.toISOString(),
          items: purchase.items.map((item) => ({
            itemName: item.itemName,
            quantity: Number(item.quantity),
            unit: item.unit,
            unitPrice: Number(item.unitPrice),
            totalPrice: Number(item.totalPrice),
          })),
          paymentTransactions: purchase.paymentTransactions.map((payment) => ({
            ...payment,
            paidAt: payment.paidAt?.toISOString() ?? null,
          })),
        }))}
        tickets={tickets.map((ticket) => ({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          totalAmount:
            (ticket.purchaseOrders[0]
              ? Math.round(
                  ticket.purchaseOrders[0].items.reduce(
                    (sum, item) => sum + item.totalPrice,
                    0,
                  ) *
                    (ticket.purchaseOrders[0].includeTax ? 1.11 : 1) *
                    100,
                ) / 100
              : null)?.toString() ??
            ticket.requestedAmount?.toString() ??
            ticket.totalAmount?.toString() ??
            null,
          purchaseReceiptUrl: ticket.purchaseReceiptUrl,
          recipientName:
            ticket.recipientName ??
            ticket.requester.bankAccountName ??
            ticket.requester.name,
          bankName: ticket.bankName ?? ticket.requester.bankName,
          accountNumber:
            ticket.accountNumber ?? ticket.requester.bankAccountNumber,
          transferDestination:
            ticket.purchaseOrders[0]?.paymentBankName &&
            ticket.purchaseOrders[0]?.paymentAccountNumber
              ? `Ditransfer ke: ${ticket.purchaseOrders[0].paymentBankName} & ${ticket.purchaseOrders[0].paymentAccountNumber}`
              : null,
          vendorBankName:
            ticket.purchaseOrders[0]?.paymentBankName ??
            ticket.bankName ??
            ticket.requester.bankName,
          vendorAccountNumber:
            ticket.purchaseOrders[0]?.paymentAccountNumber ??
            ticket.accountNumber ??
            ticket.requester.bankAccountNumber,
          vendorAccountName:
            ticket.purchaseOrders[0]?.paymentAccountName ??
            ticket.recipientName ??
            ticket.requester.bankAccountName ??
            ticket.requester.name,
          projectName: ticket.project
            ? `${ticket.project.kelompokTani} · ${ticket.project.title}`
            : null,
          paymentTransactions: Array.from(
            new Map(
              [
                ...ticket.paymentTransactions,
                ...ticket.purchaseOrders.flatMap(
                  (order) => order.paymentTransactions,
                ),
              ].map((payment) => [payment.id, payment]),
            ).values(),
          ).map((payment) => ({
            ...payment,
            paidAt: payment.paidAt?.toISOString() ?? null,
          })),
        }))}
        termyns={termyns.map((termyn) => ({
          id: termyn.id,
          contractNumber: termyn.subkonContract.contractNumber,
          subkonName: termyn.subkonContract.subkonName,
          projectName: `${termyn.subkonContract.project.kelompokTani} · ${termyn.subkonContract.project.title}`,
          termynNumber: termyn.termynNumber,
          claimedPercent: termyn.claimedPercent.toString(),
          grossAmount: termyn.grossAmount.toString(),
          retentionAmount: termyn.retentionAmount.toString(),
          netAmount: termyn.netAmount.toString(),
          status: termyn.status,
        }))}
        retentionContracts={retentionContracts.map((contract) => ({
          id: contract.id,
          contractNumber: contract.contractNumber,
          subkonName: contract.subkonName,
          projectName: `${contract.project.kelompokTani} · ${contract.project.title}`,
          retainedAmount: contract.termyns
            .reduce(
              (total, termyn) => total.plus(termyn.retentionAmount),
              new Prisma.Decimal(0),
            )
            .toString(),
          eligible:
            contract.termyns.every((termyn) => termyn.status === "PAID") &&
            contract.project.bastDocuments.some(
              (pho) =>
                pho.maintenanceEndsAt !== null &&
                pho.maintenanceEndsAt.getTime() <= Date.now(),
            ),
        }))}
        vehicleTripLogs={vehicleTripLogs.map((log) => ({
          id: log.id,
          createdAt: log.createdAt.toISOString(),
          doNumber: log.deliveryOrder?.doNumber ?? null,
          projectName: log.project
            ? `${log.project.kelompokTani} · ${log.project.title}`
            : "Proyek tidak terhubung",
          plateNumber: log.vehicle.plateNumber,
          vehicleType: log.vehicle.vehicleType,
          kilometerStart: log.kilometerStart.toString(),
          kilometerEnd: log.kilometerEnd.toString(),
          distanceKm: log.distanceKm.toString(),
          fuelLiter: log.fuelLiter.toString(),
          createdByName: log.createdBy.name,
        }))}
        vehicleFuelRequests={vehicleFuelRequests.map((request) => ({
          id: request.id,
          status: request.status,
          source: request.source,
          estimatedDistanceKm: request.estimatedDistanceKm.toString(),
          tripDistanceKm:
            request.deliveryOrder.vehicleTripLog?.distanceKm.toString() ?? null,
          exceptionDistanceKm: request.exceptionDistanceKm.toString(),
          exceptionReason: request.exceptionReason,
          estimatedFuelLiter: request.estimatedFuelLiter.toString(),
          unitPrice: request.unitPrice.toString(),
          requestedAmount: request.requestedAmount.toString(),
          disbursementMethod: request.disbursementMethod,
          transferDestination: request.transferDestination,
          transferProofUrl: request.transferProofUrl,
          beforeFillingPhotoUrl: request.beforeFillingPhotoUrl,
          afterFillingPhotoUrl: request.afterFillingPhotoUrl,
          receiptPhotoUrl: request.receiptPhotoUrl,
          financeNote: request.financeNote,
          createdAt: request.createdAt.toISOString(),
          disbursedAt: request.disbursedAt?.toISOString() ?? null,
          proofSubmittedAt: request.proofSubmittedAt?.toISOString() ?? null,
          doNumber: request.deliveryOrder.doNumber,
          plateNumber: request.vehicle.plateNumber,
          vehicleType: request.vehicle.vehicleType,
          projectName: request.project
            ? `${request.project.kelompokTani} · ${request.project.title}`
            : request.deliveryOrder.ticket?.project
              ? `${request.deliveryOrder.ticket.project.kelompokTani} · ${request.deliveryOrder.ticket.project.title}`
              : "Proyek tidak terhubung",
          requestedByName: request.requestedBy.name,
          reviewerName: request.reviewedBy?.name ?? null,
        } satisfies VehicleFuelRequestView))}
        documentTemplates={documentTemplates}
        initialTab={tab}
        initialOpenSheet={openSheet}
      />
    </>
  );
}
