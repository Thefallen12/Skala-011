import type { Metadata } from "next";
import { redirect } from "next/navigation";
import FinanceHub from "@/app/components/apps/finance/FinanceHub";
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

  const [
    orders,
    standalonePayments,
    directPurchases,
    tickets,
    termyns,
    retentionContracts,
    vendors,
    documentTemplates,
    vehicleTripLogs,
    vehicleFuelRequests,
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
          { purchaseOrders: { some: { status: POStatus.APPROVED } } },
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
  ]);

  const findVendor = (name: string) =>
    vendors.find(
      (vendor) =>
        vendor.name.trim().toLocaleLowerCase("id-ID") ===
        name.trim().toLocaleLowerCase("id-ID"),
    );

  return (
    <>
      <FinanceHub
        key={`${tab ?? ""}:${openSheet ?? ""}`}
        role={session.user.role}
        cloudinaryCloudName={process.env.CLOUDINARY_CLOUD_NAME ?? ""}
        cloudinaryApiKey={process.env.CLOUDINARY_API_KEY ?? ""}
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
          recipientName: ticket.recipientName,
          bankName: ticket.bankName,
          accountNumber: ticket.accountNumber,
          transferDestination:
            ticket.purchaseOrders[0]?.paymentBankName &&
            ticket.purchaseOrders[0]?.paymentAccountNumber
              ? `Ditransfer ke: ${ticket.purchaseOrders[0].paymentBankName} & ${ticket.purchaseOrders[0].paymentAccountNumber}`
              : null,
          vendorBankName: ticket.purchaseOrders[0]?.paymentBankName ?? ticket.bankName,
          vendorAccountNumber:
            ticket.purchaseOrders[0]?.paymentAccountNumber ?? ticket.accountNumber,
          vendorAccountName:
            ticket.purchaseOrders[0]?.paymentAccountName ?? ticket.recipientName,
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
