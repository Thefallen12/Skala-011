import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BreadcrumbComp from "../../layout/shared/breadcrumb/BreadcrumbComp";
import LogisticsHub from "@/app/components/apps/logistics/LogisticsHub";
import MoverWorkspace from "@/app/components/apps/logistics/MoverWorkspace";
import type { TicketRow } from "../../types/ticket";
import type { Prisma } from "@/generated/prisma/client";
import {
  DODeliveryMethod,
  PaymentStatus,
  POStatus,
  TicketStatus,
  TicketType,
  UserRole,
} from "@/generated/prisma/enums";
import { auth } from "../../../../../auth";
import { prisma } from "@/lib/prisma";
import { projectSiteName } from "@/lib/documents/project-site-name";
import type { VehicleFuelRequestView } from "@/lib/vehicle-fuel-types";

export const metadata: Metadata = {
  title: "Logistik Lapangan",
};

const logisticsRoles: UserRole[] = [
  UserRole.LOGISTICS,
  UserRole.MOVER,
  UserRole.DIRECTOR,
  UserRole.ADMINISTRATIONS,
];

export default async function LogisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; openSheet?: string }>;
}) {
  const { tab, openSheet } = await searchParams;
  const session = await auth();
  if (!session?.user) redirect("/auth/login");
  if (!logisticsRoles.includes(session.user.role)) redirect("/apps/tickets");

  if (session.user.role === UserRole.MOVER) {
    const assignedToMover = [
      { ticket: { is: { moverAssigneeId: session.user.id } } },
      ...(session.user.name ? [{ driverName: session.user.name }] : []),
    ];
    const [deliveryOrders, projects, equipmentMasters, equipmentLogs] =
      await Promise.all([
        prisma.deliveryOrder.findMany({
          where: {
            deliveryMethod: DODeliveryMethod.INTERNAL_MOVER,
            OR: assignedToMover,
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          select: {
            publicCode: true,
            doNumber: true,
            status: true,
            createdAt: true,
            driverName: true,
            vehiclePlate: true,
            vehicleId: true,
            vehiclePlateNumber: true,
            departureKilometer: true,
            vehicle: {
              select: { currentKilometer: true, vehicleType: true },
            },
            vehicleTripLog: {
              select: {
                kilometerStart: true,
                kilometerEnd: true,
                distanceKm: true,
                fuelLiter: true,
              },
            },
            receiverName: true,
            deliveryReceiptUrl: true,
            receiptPhotos: {
              select: { url: true },
              orderBy: { createdAt: "asc" },
            },
            fuelRequests: {
              orderBy: { createdAt: "desc" },
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
              },
            },
            ticket: {
              select: {
                ticketNumber: true,
                project: {
                  select: { kelompokTani: true, location: true },
                },
              },
            },
            items: {
              select: {
                itemName: true,
                qtyDelivered: true,
                unit: true,
              },
              orderBy: { id: "asc" },
            },
          },
        }),
        prisma.project.findMany({
          where: { isDeleted: false },
          orderBy: { name: "asc" },
          select: { id: true, title: true, kelompokTani: true },
        }),
        prisma.equipmentMaster.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            code: true,
            name: true,
            currentHM: true,
          },
        }),
        prisma.equipmentLog.findMany({
          where: { createdById: session.user.id },
          orderBy: [{ date: "desc" }, { createdAt: "desc" }],
          take: 100,
          select: {
            id: true,
            equipmentName: true,
            operatorName: true,
            date: true,
            hmStart: true,
            hmEnd: true,
            effectiveHours: true,
            fuelLiter: true,
            project: { select: { title: true, kelompokTani: true } },
          },
        }),
      ]);

    return (
      <>
        <BreadcrumbComp
          title="Ruang Kerja Mover"
          items={[
            { to: "/", title: "Beranda" },
            { title: "Ruang Kerja Mover" },
          ]}
        />
        <MoverWorkspace
          userName={session.user.name ?? ""}
          deliveryOrders={deliveryOrders.map((order) => ({
            ...order,
            createdAt: order.createdAt.toISOString(),
            departureKilometer: order.departureKilometer?.toString() ?? null,
            vehicleCurrentKilometer:
              order.vehicle?.currentKilometer.toString() ?? null,
            vehicleType: order.vehicle?.vehicleType ?? null,
            vehicleTripLog: order.vehicleTripLog
              ? {
                  kilometerStart: order.vehicleTripLog.kilometerStart.toString(),
                  kilometerEnd: order.vehicleTripLog.kilometerEnd.toString(),
                  distanceKm: order.vehicleTripLog.distanceKm.toString(),
                  fuelLiter: order.vehicleTripLog.fuelLiter.toString(),
                }
              : null,
            fuelRequests: order.fuelRequests.map((request) => ({
              id: request.id,
              status: request.status,
              source: request.source,
              estimatedDistanceKm: request.estimatedDistanceKm.toString(),
              tripDistanceKm:
                order.vehicleTripLog?.distanceKm.toString() ?? null,
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
              proofSubmittedAt:
                request.proofSubmittedAt?.toISOString() ?? null,
              doNumber: order.doNumber,
              plateNumber: order.vehiclePlateNumber ?? order.vehiclePlate ?? "—",
              vehicleType: order.vehicle?.vehicleType ?? "Kendaraan",
              projectName: projectSiteName(
                order.ticket?.project?.kelompokTani,
                order.ticket?.project?.location,
              ),
              requestedByName: request.requestedBy.name,
              reviewerName: null,
            } satisfies VehicleFuelRequestView)),
            receiptPhotoUrls: Array.from(
              new Set([
                order.deliveryReceiptUrl,
                ...order.receiptPhotos.map((photo) => photo.url),
              ].filter((url): url is string => Boolean(url))),
            ),
            projectName: projectSiteName(
              order.ticket?.project?.kelompokTani,
              order.ticket?.project?.location,
            ),
            ticketNumber: order.ticket?.ticketNumber ?? null,
          }))}
          projects={projects}
          equipmentMasters={equipmentMasters.map((equipment) => ({
            ...equipment,
            currentHM: equipment.currentHM.toString(),
          }))}
          equipmentLogs={equipmentLogs.map((log) => ({
            ...log,
            date: log.date.toISOString().slice(0, 10),
            hmStart: log.hmStart.toString(),
            hmEnd: log.hmEnd.toString(),
            effectiveHours: log.effectiveHours.toString(),
            fuelLiter: log.fuelLiter.toString(),
            projectName: `${log.project.kelompokTani} · ${log.project.title}`,
          }))}
          initialTab={tab}
        />
      </>
    );
  }

  let where: Prisma.TicketWhereInput = { type: TicketType.MATERIAL };
  if (session.user.role === UserRole.LOGISTICS) {
    where = {
      type: TicketType.MATERIAL,
      OR: [
        {
          status: TicketStatus.DRAFT,
          requesterId: session.user.id,
        },
        {
          status: {
            in: [
              TicketStatus.PROCESSED_LOGISTIC,
              TicketStatus.ASSIGNED_TO_MOVER,
              TicketStatus.IN_TRANSIT,
              TicketStatus.COMPLETED,
            ],
          },
        },
        {
          status: TicketStatus.WAITING_FINANCE_PAYMENT,
          purchaseReceiptUrl: { not: null },
        },
      ],
    };
  }

  const [
    tickets,
    projects,
    stockItems,
    purchaseOrders,
    deliveryOrders,
    equipmentLogs,
    equipmentMasters,
    vendors,
    directStockPurchases,
    vehicles,
    vehicleTripLogs,
  ] = await Promise.all([
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
        operationalDocuments: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            documentNumber: true,
            kind: true,
            status: true,
            title: true,
            signedAt: true,
            issuedAt: true,
          },
        },
        purchaseOrders: {
          orderBy: { createdAt: "desc" },
          select: {
            publicCode: true,
            poNumber: true,
            vendorName: true,
            status: true,
            createdAt: true,
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
      orderBy: { name: "asc" },
      select: { id: true, title: true, kelompokTani: true },
    }),
    prisma.stockItem.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        stockQuantity: true,
        minimumStock: true,
        unitPrice: true,
        createdAt: true,
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: POStatus.APPROVED },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        publicCode: true,
        poNumber: true,
        vendorName: true,
        status: true,
        createdAt: true,
        ticketId: true,
      },
    }),
    prisma.deliveryOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        publicCode: true,
        doNumber: true,
        status: true,
        createdAt: true,
        ticketId: true,
        po: { select: { ticketId: true, status: true } },
        ticket: { select: { isApprovedByDirector: true, projectId: true } },
        vehicleId: true,
        vehiclePlateNumber: true,
      },
    }),
    prisma.equipmentLog.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 100,
      select: {
        id: true,
        equipmentName: true,
        operatorName: true,
        date: true,
        hmStart: true,
        hmEnd: true,
        effectiveHours: true,
        fuelLiter: true,
        notes: true,
        project: { select: { title: true, kelompokTani: true } },
      },
    }),
    prisma.equipmentMaster.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        currentHM: true,
        status: true,
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
        phone: true,
        email: true,
        bankName: true,
        bankAccount: true,
        bankHolder: true,
        rating: true,
      },
    }),
    prisma.directStockPurchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        purchaseNumber: true,
        vendorName: true,
        status: true,
        isApprovedByDirector: true,
        totalAmount: true,
        createdAt: true,
        receivedAt: true,
        arrivalPhotoUrl: true,
        paymentTransactions: {
          where: { status: PaymentStatus.PAID },
          select: { proofOfTransferUrl: true },
        },
        items: {
          select: { id: true, itemName: true, quantity: true, unit: true },
        },
        receivedBy: { select: { name: true } },
      },
    }),
    prisma.vehicle.findMany({
      orderBy: { plateNumber: "asc" },
      select: {
        id: true,
        plateNumber: true,
        vehicleType: true,
        brand: true,
        modelName: true,
        currentKilometer: true,
        odometerInitialized: true,
        status: true,
      },
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
    totalAmount: ticket.totalAmount?.toString() ?? null,
    attachmentUrl: ticket.attachmentUrl,
    purchaseReceiptUrl: ticket.purchaseReceiptUrl,
    transferReceiptUrl: ticket.transferReceiptUrl,
    deliveryReceiptUrl: ticket.deliveryReceiptUrl,
    recipientName:
      session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.ADMINISTRATIONS
        ? ticket.recipientName
        : null,
    bankName:
      session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.ADMINISTRATIONS
        ? ticket.bankName
        : null,
    accountNumber:
      session.user.role === UserRole.DIRECTOR ||
      session.user.role === UserRole.ADMINISTRATIONS
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
    auditLogs: ticket.auditLogs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    })),
    operationalDocuments: ticket.operationalDocuments.map((document) => ({
      ...document,
      signedAt: document.signedAt.toISOString(),
      issuedAt: document.issuedAt?.toISOString() ?? null,
    })),
    purchaseOrders: ticket.purchaseOrders.map((purchaseOrder) => ({
      ...purchaseOrder,
      createdAt: purchaseOrder.createdAt.toISOString(),
      paidAt: purchaseOrder.paidAt?.toISOString() ?? null,
    })),
    deliveryOrders: ticket.deliveryOrders.map((deliveryOrder) => ({
      ...deliveryOrder,
      createdAt: deliveryOrder.createdAt.toISOString(),
    })),
  }));

  return (
    <>
      <BreadcrumbComp
        title="Logistik Lapangan"
        items={[
          { to: "/", title: "Beranda" },
          { title: "Logistik Lapangan" },
        ]}
      />
      <LogisticsHub
        key={`${tab ?? ""}:${openSheet ?? ""}`}
        tickets={ticketRows}
        projects={projects}
        role={session.user.role}
        vendors={vendors}
        stockPurchases={directStockPurchases.map((purchase) => ({
          ...purchase,
          totalAmount: purchase.totalAmount.toString(),
          hasFinanceProof: purchase.paymentTransactions.some(
            (payment) => Boolean(payment.proofOfTransferUrl),
          ),
          createdAt: purchase.createdAt.toISOString(),
          receivedAt: purchase.receivedAt?.toISOString() ?? null,
          items: purchase.items.map((item) => ({
            ...item,
            quantity: item.quantity.toString(),
          })),
        }))}
        initialTab={tab}
        initialOpenSheet={openSheet}
        stockItems={stockItems.map((item) => ({
          ...item,
          stockQuantity: item.stockQuantity.toString(),
          minimumStock: item.minimumStock.toString(),
          unitPrice: item.unitPrice.toString(),
          createdAt: item.createdAt.toISOString(),
        }))}
        purchaseOrders={purchaseOrders.map((order) => ({
          ...order,
          createdAt: order.createdAt.toISOString(),
        }))}
        deliveryOrders={deliveryOrders.map((order) => ({
          id: order.id,
          publicCode: order.publicCode,
          doNumber: order.doNumber,
          status: order.status,
          createdAt: order.createdAt.toISOString(),
          ticketId: order.ticketId ?? order.po?.ticketId ?? null,
          vehicleId: order.vehicleId,
          vehiclePlateNumber: order.vehiclePlateNumber,
          executiveApproved:
            order.po?.status === POStatus.APPROVED ||
            order.ticket?.isApprovedByDirector === true,
        }))}
        equipmentLogs={equipmentLogs.map((log) => ({
          id: log.id,
          equipmentName: log.equipmentName,
          operatorName: log.operatorName,
          date: log.date.toISOString().slice(0, 10),
          hmStart: log.hmStart.toString(),
          hmEnd: log.hmEnd.toString(),
          effectiveHours: log.effectiveHours.toString(),
          fuelLiter: log.fuelLiter.toString(),
          notes: log.notes,
          projectName: `${log.project.kelompokTani} · ${log.project.title}`,
        }))}
        equipmentMasters={equipmentMasters.map((equipment) => ({
          ...equipment,
          currentHM: equipment.currentHM.toString(),
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
        vehicles={vehicles.map((vehicle) => ({
          ...vehicle,
          currentKilometer: vehicle.currentKilometer.toString(),
          status:
            vehicle.status === "AVAILABLE" ||
            vehicle.status === "RESERVED" ||
            vehicle.status === "IN_USE" ||
            vehicle.status === "MAINTENANCE"
              ? vehicle.status
              : "MAINTENANCE",
        }))}
      />
    </>
  );
}
