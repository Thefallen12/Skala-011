"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import {
  DOStatus,
  DODeliveryMethod,
  FulfillmentStatus,
  NotificationType,
  POPaymentMethod,
  POStatus,
  StockMovementType,
  TicketCategoryHint,
  TicketStatus,
  TicketType,
  UserRole,
} from "@/generated/prisma/enums";
import { auth } from "../../../auth";
import { prisma } from "@/lib/prisma";
import {
  generateAvailablePublicCode,
  isValidPublicCode,
} from "@/lib/documents/random-code";
import { resolvePublicAppUrl } from "@/lib/documents/public-app-url";
import { nextDocumentNumber } from "@/lib/documents/numbering";
import { createBrandedQrDataUrl } from "@/lib/documents/qr-code";
import { lockTicketDeliveryOrderCreation } from "@/lib/documents/lock-ticket-delivery-order";
import {
  lockTicketFulfillment,
  syncTicketStatus,
} from "@/lib/ticket-utils";
import { sendNotification } from "@/lib/notifications";
import {
  DeliveryOrderArrivalPhotoValidationError,
  removeDeliveryOrderArrivalPhoto,
  saveDeliveryOrderArrivalPhoto,
} from "@/lib/delivery-order-arrival-photos";
import { Prisma } from "@/generated/prisma/client";
import { removeTicketReceipt, saveTicketReceipt } from "@/lib/ticket-receipts";
import { VEHICLE_FUEL_EFFICIENCY_KM_PER_LITER } from "@/lib/vehicle-fuel";

export type PurchaseOrderItemInput = {
  stockItemId?: string;
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

export type DeliveryOrderItemInput = {
  id?: string;
  itemName: string;
  qtyOrdered: number;
  qtyDelivered: number;
  unit: string;
  remarks?: string;
};

export type OrderActionResult = {
  success: boolean;
  message: string;
  publicCode?: string;
  qrDataUrl?: string;
  actorName?: string;
  approvedAt?: string;
};

type PurchaseOrderInput = {
  poNumber?: string;
  vendorId?: string;
  vendorName: string;
  paymentMethod?: POPaymentMethod;
  paymentBankName?: string;
  paymentAccountNumber?: string;
  paymentAccountName?: string;
  paymentTerms?: string;
  includeTax?: boolean;
  items: PurchaseOrderItemInput[];
};

type DeliveryOrderInput = {
  doNumber?: string;
  ticketId?: string;
  vehicleId?: string;
  deliveryMethod?: DODeliveryMethod;
  vehicleDocumentNumber?: string;
  driverName?: string;
  vehiclePlate?: string;
  driverIdentityNumber?: string;
  driverPhone?: string;
  receiverName?: string;
  status: DOStatus;
  items: DeliveryOrderItemInput[];
};

const fail = (message: string): OrderActionResult => ({
  success: false,
  message,
});

function isText(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return (
    typeof value === "string" &&
    value.length <= maxLength &&
    (allowEmpty || value.trim().length > 0)
  );
}

function isValidItems<T extends Record<string, unknown>>(
  items: unknown,
  validator: (item: unknown) => item is T,
): items is T[] {
  return (
    Array.isArray(items) &&
    items.length > 0 &&
    items.length <= 200 &&
    items.every(validator)
  );
}

function isPurchaseOrderItem(value: unknown): value is PurchaseOrderItemInput {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    isText(item.itemName, 180) &&
    isText(item.unit, 40) &&
    (item.stockItemId === undefined ||
      (typeof item.stockItemId === "string" &&
        item.stockItemId.length > 0 &&
        item.stockItemId.length <= 64)) &&
    typeof item.quantity === "number" &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0 &&
    item.quantity <= 1_000_000_000 &&
    typeof item.unitPrice === "number" &&
    Number.isFinite(item.unitPrice) &&
    item.unitPrice >= 0 &&
    item.unitPrice <= 1_000_000_000_000
  );
}

function isDeliveryOrderItem(value: unknown): value is DeliveryOrderItemInput {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    (item.id === undefined ||
      (typeof item.id === "string" &&
        item.id.length > 0 &&
        item.id.length <= 64)) &&
    isText(item.itemName, 180) &&
    typeof item.qtyOrdered === "number" &&
    Number.isFinite(item.qtyOrdered) &&
    item.qtyOrdered > 0 &&
    item.qtyOrdered <= 1_000_000_000 &&
    typeof item.qtyDelivered === "number" &&
    Number.isFinite(item.qtyDelivered) &&
    item.qtyDelivered >= 0 &&
    item.qtyDelivered <= item.qtyOrdered &&
    new Prisma.Decimal(item.qtyDelivered.toString()).decimalPlaces() <= 3 &&
    isText(item.unit, 40) &&
    (item.remarks === undefined || isText(item.remarks, 1000, true))
  );
}

function isValidPurchaseOrderPayment(input: PurchaseOrderInput): boolean {
  const method = input.paymentMethod ?? POPaymentMethod.CASH;
  if (!Object.values(POPaymentMethod).includes(method)) return false;

  if (method === POPaymentMethod.CASH) {
    return (
      (input.paymentBankName === undefined ||
        isText(input.paymentBankName, 120, true)) &&
      (input.paymentAccountNumber === undefined ||
        isText(input.paymentAccountNumber, 80, true)) &&
      (input.paymentAccountName === undefined ||
        isText(input.paymentAccountName, 180, true))
    );
  }

  return (
    isText(input.paymentBankName, 120) &&
    isText(input.paymentAccountNumber, 80) &&
    isText(input.paymentAccountName, 180)
  );
}

function validPublicCode(value: string): boolean {
  return isValidPublicCode(value);
}

function isValidKilometer(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 9_999_999_999 &&
    Number(value.toFixed(2)) === value
  );
}

function canEditPurchaseOrders(role: UserRole): boolean {
  return (
    role === UserRole.LOGISTICS ||
    role === UserRole.ADMINISTRATIONS
  );
}

function canApprovePurchaseOrders(role: UserRole): boolean {
  return (
    role === UserRole.DIRECTOR ||
    role === UserRole.DEPUTY_DIRECTOR
  );
}

async function makePurchaseOrderQr(
  publicCode: string,
): Promise<{ verificationUrl: string; qrDataUrl: string } | null> {
  try {
    const baseUrl = resolvePublicAppUrl();
    if (!baseUrl) return null;
    const verification = new URL(
      `/verify/po/${encodeURIComponent(publicCode)}`,
      baseUrl,
    );
    const verificationUrl = verification.toString();
    const qrDataUrl = await createBrandedQrDataUrl(verificationUrl, 240);
    return { verificationUrl, qrDataUrl };
  } catch (error) {
    console.error("Purchase Order verification QR generation failed:", error);
    return null;
  }
}

function canEditDeliveryOrders(role: UserRole): boolean {
  return (
    canEditPurchaseOrders(role) ||
    role === UserRole.DIRECTOR ||
    role === UserRole.FIELD_TEAM ||
    role === UserRole.KOORDINATOR
  );
}

export async function createPurchaseOrder(
  input: PurchaseOrderInput,
): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user || !canEditPurchaseOrders(session.user.role)) {
    return fail("Anda tidak memiliki akses untuk membuat Purchase Order.");
  }
  if (
    !input ||
    !isText(input.vendorName, 180) ||
    (input.vendorId !== undefined &&
      (!isText(input.vendorId, 64) || input.vendorId.length === 0)) ||
    !isValidPurchaseOrderPayment(input) ||
    (input.includeTax !== undefined && typeof input.includeTax !== "boolean") ||
    (input.paymentTerms !== undefined &&
      !isText(input.paymentTerms, 2000, true)) ||
    !isValidItems(input.items, isPurchaseOrderItem)
  ) {
    return fail("Data Purchase Order tidak valid. Periksa nomor, vendor, dan item.");
  }

  try {
    const created = await prisma.$transaction(async (transaction) => {
      const vendor = input.vendorId
        ? await transaction.vendor.findFirst({
            where: { id: input.vendorId, isApproved: true },
            select: {
              id: true,
              name: true,
              bankName: true,
              bankAccount: true,
              bankHolder: true,
            },
          })
        : null;
      if (input.vendorId && !vendor) {
        throw new Error("Vendor tidak ditemukan atau belum disetujui.");
      }
      const selectedStockIds = [
        ...new Set(
          input.items.flatMap((item) =>
            item.stockItemId ? [item.stockItemId] : [],
          ),
        ),
      ];
      const selectedStockItems = selectedStockIds.length
        ? await transaction.stockItem.findMany({
            where: { id: { in: selectedStockIds } },
            select: { id: true, name: true, unit: true },
          })
        : [];
      if (selectedStockItems.length !== selectedStockIds.length) {
        throw new Error("Salah satu barang katalog tidak ditemukan.");
      }
      const selectedStockById = new Map(
        selectedStockItems.map((item) => [item.id, item]),
      );
      const normalizeCatalogValue = (value: string) =>
        value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
      if (
        input.items.some((item) => {
          if (!item.stockItemId) return false;
          const stockItem = selectedStockById.get(item.stockItemId);
          return (
            !stockItem ||
            normalizeCatalogValue(stockItem.name) !==
              normalizeCatalogValue(item.itemName) ||
            normalizeCatalogValue(stockItem.unit) !==
              normalizeCatalogValue(item.unit)
          );
        })
      ) {
        throw new Error("Nama dan satuan PO harus sesuai dengan katalog barang.");
      }
      const vendorHasTransferDetails = Boolean(
        vendor?.bankName && vendor.bankAccount && vendor.bankHolder,
      );
      const paymentMethod = vendor
        ? vendorHasTransferDetails
          ? POPaymentMethod.TRANSFER
          : POPaymentMethod.CASH
        : input.paymentMethod ?? POPaymentMethod.CASH;
      const code = await generateAvailablePublicCode(transaction);
      const poNumber = await nextDocumentNumber(transaction, "PO");
      await transaction.purchaseOrder.create({
        data: {
          publicCode: code,
          createdById: session.user.id,
          poNumber,
          vendorId: vendor?.id ?? null,
          vendorName: vendor?.name ?? input.vendorName.trim(),
          paymentMethod,
          paymentBankName: vendor
            ? vendorHasTransferDetails
              ? vendor.bankName
              : null
            : paymentMethod === POPaymentMethod.TRANSFER
              ? input.paymentBankName?.trim()
              : null,
          paymentAccountNumber: vendor
            ? vendorHasTransferDetails
              ? vendor.bankAccount
              : null
            : paymentMethod === POPaymentMethod.TRANSFER
              ? input.paymentAccountNumber?.trim()
              : null,
          paymentAccountName: vendor
            ? vendorHasTransferDetails
              ? vendor.bankHolder
              : null
            : paymentMethod === POPaymentMethod.TRANSFER
              ? input.paymentAccountName?.trim()
              : null,
          paymentTerms: input.paymentTerms?.trim() || null,
          includeTax: input.includeTax ?? false,
          items: {
            create: input.items.map((item) => ({
              ...item,
              stockItemId: item.stockItemId ?? null,
              itemName: item.itemName.trim(),
              unit: item.unit.trim(),
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
      });
      await sendNotification({
        roleTarget: UserRole.FINANCE,
        title: "PO Menunggu Verifikasi",
        message: `PO #${poNumber} Butuh Pemeriksaan (Checked By).`,
        actionUrl: `/apps/finance?tab=po-check&openSheet=${encodeURIComponent(code)}`,
        type: NotificationType.APPROVAL,
        database: transaction,
      });
      return { code, poNumber };
    });
    revalidatePath(`/d/${created.code}`);
    revalidatePath("/apps/orders");
    return {
      success: true,
      message: `Purchase Order ${created.poNumber} berhasil dibuat.`,
      publicCode: created.code,
    };
  } catch (error) {
    console.error("Purchase Order creation failed:", error);
    return fail("Purchase Order gagal dibuat. Periksa nomor PO dan coba kembali.");
  }
}

export async function updatePurchaseOrder(
  publicCode: string,
  input: PurchaseOrderInput,
): Promise<OrderActionResult> {
  const poNumber = input?.poNumber;
  const session = await auth();
  if (!session?.user || !canEditPurchaseOrders(session.user.role)) {
    return fail("Anda tidak memiliki akses untuk mengubah Purchase Order.");
  }
  if (
    !validPublicCode(publicCode) ||
    !input ||
    !isText(poNumber, 80) ||
    !isText(input.vendorName, 180) ||
    !isValidPurchaseOrderPayment(input) ||
    (input.includeTax !== undefined && typeof input.includeTax !== "boolean") ||
    (input.paymentTerms !== undefined &&
      !isText(input.paymentTerms, 2000, true)) ||
    !isValidItems(input.items, isPurchaseOrderItem)
  ) {
    return fail("Data Purchase Order tidak valid. Periksa nomor, vendor, dan item.");
  }

  try {
    const updated = await prisma.$transaction(async (transaction) => {
      const statusGuard = await transaction.purchaseOrder.updateMany({
        where: { publicCode, status: POStatus.DRAFT },
        data: { updatedAt: new Date() },
      });
      if (statusGuard.count !== 1) return false;

      await transaction.purchaseOrder.update({
        where: { publicCode },
        data: {
          poNumber: poNumber.trim(),
          vendorName: input.vendorName.trim(),
          paymentMethod: input.paymentMethod ?? POPaymentMethod.CASH,
          paymentBankName:
            input.paymentMethod === POPaymentMethod.TRANSFER
              ? input.paymentBankName?.trim()
              : null,
          paymentAccountNumber:
            input.paymentMethod === POPaymentMethod.TRANSFER
              ? input.paymentAccountNumber?.trim()
              : null,
          paymentAccountName:
            input.paymentMethod === POPaymentMethod.TRANSFER
              ? input.paymentAccountName?.trim()
              : null,
          paymentTerms: input.paymentTerms?.trim() || null,
          includeTax: input.includeTax ?? false,
          items: {
            deleteMany: {},
            create: input.items.map((item) => ({
              ...item,
              itemName: item.itemName.trim(),
              unit: item.unit.trim(),
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
      });
      return true;
    });
    if (!updated) {
      return fail("Purchase Order hanya dapat diubah sebelum dikirim untuk persetujuan.");
    }
  } catch (error) {
    console.error("Purchase Order update failed:", error);
    return fail("Purchase Order gagal disimpan. Periksa nomor PO dan coba kembali.");
  }

  revalidatePath(`/d/${publicCode}`);
  revalidatePath("/apps/documents");
  return { success: true, message: "Perubahan Purchase Order berhasil disimpan." };
}

export async function reviewPurchaseOrder(
  publicCode: string,
): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user || session.user.role !== UserRole.FINANCE) {
    return fail("Hanya Manager Keuangan yang dapat memeriksa Purchase Order.");
  }
  if (!validPublicCode(publicCode)) {
    return fail("Kode Purchase Order tidak valid.");
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const update = await transaction.purchaseOrder.updateMany({
        where: { publicCode, status: POStatus.DRAFT },
        data: {
          status: POStatus.PENDING_APPROVAL,
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
      if (update.count === 1) {
        const order = await transaction.purchaseOrder.findUniqueOrThrow({
          where: { publicCode },
          select: { poNumber: true },
        });
        await sendNotification({
          roleTarget: [UserRole.DIRECTOR, UserRole.DEPUTY_DIRECTOR],
          title: "PO Menunggu Tanda Tangan",
          message: `PO #${order.poNumber} Butuh Persetujuan & QR Sign.`,
          actionUrl: `/apps/approvals?tab=po&openSheet=${encodeURIComponent(publicCode)}`,
          type: NotificationType.APPROVAL,
          database: transaction,
        });
      }
      return update;
    });
    if (result.count !== 1) {
      return fail("PO tidak ditemukan atau sudah masuk proses persetujuan.");
    }
  } catch (error) {
    console.error("Purchase Order finance review failed:", error);
    return fail("Pemeriksaan PO gagal disimpan. Silakan coba kembali.");
  }

  revalidatePath(`/d/${publicCode}`);
  revalidatePath("/apps/orders");
  revalidatePath("/apps/finance");
  return {
    success: true,
    message: "PO telah diperiksa dan dikirim kepada Direktur/Wakil Direktur.",
    actorName: session.user.name ?? "Manager Keuangan",
  };
}

export async function approvePurchaseOrder(
  publicCode: string,
  clientOrigin?: string,
): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user || !canApprovePurchaseOrders(session.user.role)) {
    return fail("Hanya Direktur atau Wakil Direktur yang dapat menyetujui PO.");
  }
  if (!validPublicCode(publicCode)) {
    return fail("Kode Purchase Order tidak valid.");
  }

  const qr = await makePurchaseOrderQr(publicCode);
  if (!qr) {
    return fail(
      "QR verifikasi gagal dibuat. Pastikan NEXT_PUBLIC_APP_URL atau AUTH_URL valid, atau akses aplikasi melalui alamat yang valid. Periksa juga aset logo QR dan log server.",
    );
  }

  const approvalTime = new Date();
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const update = await transaction.purchaseOrder.updateMany({
        where: {
          publicCode,
          status: POStatus.PENDING_APPROVAL,
          reviewedById: { not: null },
          reviewedAt: { not: null },
        },
        data: {
          status: POStatus.APPROVED,
          approvedById: session.user.id,
          approvedAt: approvalTime,
        },
      });
      if (update.count === 1) {
        const order = await transaction.purchaseOrder.findUniqueOrThrow({
          where: { publicCode },
          select: { poNumber: true, ticketId: true },
        });
        await sendNotification({
          roleTarget: UserRole.LOGISTICS,
          title: "PO Disetujui",
          message: order.ticketId
            ? `PO #${order.poNumber} disetujui. Silakan unggah invoice dan proses tiket material.`
            : `PO #${order.poNumber} disetujui. Silakan proses pembayaran dan Surat Jalan.`,
          actionUrl: order.ticketId
            ? `/apps/logistics?tab=tickets&openSheet=${encodeURIComponent(order.ticketId)}`
            : `/apps/logistics?tab=stock`,
          type: NotificationType.SUCCESS,
          database: transaction,
        });
        await sendNotification({
          roleTarget: UserRole.FINANCE,
          title: "PO Disetujui Direktur",
          message: order.ticketId
            ? `PO #${order.poNumber} disetujui. Pembayaran dapat diproses setelah invoice diunggah Logistik.`
            : `PO #${order.poNumber} disetujui. Silakan proses pembayaran dan Surat Jalan.`,
          actionUrl: order.ticketId
            ? `/apps/finance?tab=payments`
            : `/apps/finance?tab=payments&openSheet=${encodeURIComponent(publicCode)}`,
          type: NotificationType.SUCCESS,
          database: transaction,
        });
      }
      return update;
    });
    if (result.count !== 1) {
      return fail("PO tidak ditemukan atau belum diperiksa oleh Manager Keuangan.");
    }
  } catch (error) {
    console.error("Purchase Order approval failed:", error);
    return fail("Persetujuan PO gagal disimpan. Silakan coba kembali.");
  }

  revalidatePath(`/d/${publicCode}`);
  revalidatePath("/apps/orders");
  revalidatePath("/apps/approvals");
  revalidatePath("/apps/documents/issued");
  revalidatePath("/apps/logistics");
  revalidatePath("/apps/finance");
  revalidatePath(`/verify/po/${publicCode}`);
  return {
    success: true,
    message: "Purchase Order disetujui. QR verifikasi unik telah dibuat.",
    qrDataUrl: qr.qrDataUrl,
    actorName: session.user.name ?? "Direksi",
    approvedAt: approvalTime.toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    }),
  };
}

export async function createDeliveryOrder(
  input: DeliveryOrderInput & { poPublicCode?: string },
): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user || !canEditDeliveryOrders(session.user.role)) {
    return fail("Anda tidak memiliki akses untuk membuat Delivery Order.");
  }
  const deliveryMethod =
    input?.deliveryMethod ?? DODeliveryMethod.INTERNAL_MOVER;
  if (
    deliveryMethod === DODeliveryMethod.INTERNAL_MOVER &&
    session.user.role !== UserRole.LOGISTICS
  ) {
    return fail("Hanya Logistik yang dapat menetapkan kendaraan master pada DO internal.");
  }
  if (
    !input ||
    !isText(input.ticketId ?? "", 64) ||
    !Object.values(DOStatus).includes(input.status) ||
    (input.ticketId !== undefined && !isText(input.ticketId, 64)) ||
    (input.poPublicCode !== undefined &&
      !validPublicCode(input.poPublicCode)) ||
    !isText(input.driverName ?? "", 180, true) ||
    !isText(input.vehiclePlate ?? "", 40, true) ||
    !isText(input.vehicleDocumentNumber ?? "", 80, true) ||
    !isText(input.driverIdentityNumber ?? "", 32, true) ||
    !isText(input.driverPhone ?? "", 32, true) ||
    (input.deliveryMethod !== undefined &&
      !Object.values(DODeliveryMethod).includes(input.deliveryMethod)) ||
    (input.vehicleId !== undefined &&
      !isText(input.vehicleId, 64)) ||
    (input.vehicleId !== undefined &&
      input.deliveryMethod === DODeliveryMethod.EXPEDITION) ||
    (deliveryMethod === DODeliveryMethod.INTERNAL_MOVER &&
      !isText(input.vehicleId ?? "", 64)) ||
    (deliveryMethod === DODeliveryMethod.INTERNAL_MOVER &&
      input.status !== DOStatus.PENDING) ||
    (input.deliveryMethod === DODeliveryMethod.EXPEDITION &&
      (!isText(input.vehicleDocumentNumber ?? "", 80) ||
        !isText(input.driverName ?? "", 180) ||
        !/^[A-Za-z0-9./ -]{3,40}$/.test(input.vehiclePlate ?? "") ||
        !/^\d{16}$/.test(input.driverIdentityNumber ?? "") ||
        !/^[+()\d\s.-]{8,32}$/.test(input.driverPhone ?? ""))) ||
    !isText(input.receiverName ?? "", 180, true) ||
    !isValidItems(input.items, isDeliveryOrderItem)
  ) {
    return fail("Data Delivery Order tidak valid. Periksa nomor dan item pengiriman.");
  }
  try {
    const created = await prisma.$transaction(async (transaction) => {
      if (input.ticketId) {
        await lockTicketDeliveryOrderCreation(transaction);
      }
      const ticket = input.ticketId
        ? await transaction.ticket.findUnique({
            where: { id: input.ticketId },
            select: {
              id: true,
              type: true,
              status: true,
              isApprovedByDirector: true,
              projectId: true,
              ticketNumber: true,
              moverAssignee: { select: { name: true } },
              items: {
                select: {
                  id: true,
                  itemName: true,
                  quantity: true,
                  unit: true,
                  categoryHint: true,
                  status: true,
                },
                orderBy: { id: "asc" },
              },
            },
          })
        : null;
      if (input.ticketId && (!ticket || ticket.type !== TicketType.MATERIAL)) {
        throw new Error("Tiket material yang dirujuk tidak ditemukan.");
      }
      if (ticket && !ticket.isApprovedByDirector) {
        throw new Error(
          "Tiket harus memiliki persetujuan eksekutif sebelum DO diterbitkan.",
        );
      }
      if (ticket) {
        const existingOrder = await transaction.deliveryOrder.findFirst({
          where: { ticketId: ticket.id },
          orderBy: { createdAt: "desc" },
          select: { publicCode: true, doNumber: true },
        });
        if (existingOrder) {
          return {
            code: existingOrder.publicCode,
            doNumber: existingOrder.doNumber,
            alreadyExists: true,
          };
        }
      }
      if (
        ticket &&
        ticket.status !== TicketStatus.PROCESSED_LOGISTIC &&
        ticket.status !== TicketStatus.ASSIGNED_TO_MOVER &&
        ticket.status !== TicketStatus.WAITING_FINANCE_PAYMENT &&
        ticket.status !== TicketStatus.COMPLETED
      ) {
        throw new Error("Tiket belum disetujui untuk diproses sebagai DO.");
      }
      const purchaseOrder = input.poPublicCode
        ? await transaction.purchaseOrder.findUnique({
            where: { publicCode: input.poPublicCode },
            select: { id: true, ticketId: true, status: true },
          })
        : null;
      if (input.poPublicCode && !purchaseOrder) {
        throw new Error("Purchase Order yang dirujuk tidak ditemukan.");
      }
      if (purchaseOrder && purchaseOrder.status !== POStatus.APPROVED) {
        throw new Error(
          "DO hanya dapat ditautkan ke Purchase Order yang sudah disetujui eksekutif.",
        );
      }
      if (
        purchaseOrder &&
        ticket &&
        purchaseOrder.ticketId !== ticket.id
      ) {
        throw new Error(
          "Purchase Order harus berasal dari tiket yang sama dengan DO.",
        );
      }
      if (
        ticket &&
        (ticket.items.length !== input.items.length ||
          ticket.items.some((ticketItem, index) => {
            const orderItem = input.items[index];
            return (
              orderItem.itemName.trim() !== ticketItem.itemName ||
              orderItem.qtyOrdered !== ticketItem.quantity ||
              orderItem.unit.trim() !== ticketItem.unit
            );
          }))
      ) {
        throw new Error("Item DO harus sesuai dengan item pada tiket referensi.");
      }
      const selectedVehicle =
        deliveryMethod === DODeliveryMethod.INTERNAL_MOVER
          ? await transaction.vehicle.findFirst({
              where: {
                id: input.vehicleId,
                status: "AVAILABLE",
                odometerInitialized: true,
                deliveryOrders: {
                  none: {
                    status: { in: [DOStatus.PENDING, DOStatus.IN_TRANSIT] },
                  },
                },
              },
              select: {
                id: true,
                plateNumber: true,
              },
            })
          : null;
      if (deliveryMethod === DODeliveryMethod.INTERNAL_MOVER && !selectedVehicle) {
        throw new Error(
          "Kendaraan tidak tersedia atau KM awal belum diinisialisasi.",
        );
      }
      const code = await generateAvailablePublicCode(transaction);
      const doNumber = await nextDocumentNumber(transaction, "DO");
      const warehouseItems = ticket
        ? ticket.items.flatMap((ticketItem, index) => {
            const orderItem = input.items[index];
            return ticketItem.categoryHint === TicketCategoryHint.WAREHOUSE &&
              ticketItem.status === FulfillmentStatus.PENDING &&
              orderItem.qtyDelivered > 0
              ? [
                  {
                    itemName: ticketItem.itemName,
                    unit: ticketItem.unit,
                    quantity: new Prisma.Decimal(
                      orderItem.qtyDelivered.toString(),
                    ),
                  },
                ]
              : [];
          })
        : [];
      const stockItems = warehouseItems.length
        ? await transaction.stockItem.findMany({
            select: {
              id: true,
              name: true,
              unit: true,
              stockQuantity: true,
              unitPrice: true,
            },
          })
        : [];
      const normalize = (value: string) =>
        value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
      const reservations = new Map<
        string,
        {
          name: string;
          unit: string;
          quantity: Prisma.Decimal;
          unitPrice: Prisma.Decimal;
        }
      >();
      for (const item of warehouseItems) {
        const matches = stockItems.filter(
          (stockItem) =>
            normalize(stockItem.name) === normalize(item.itemName) &&
            normalize(stockItem.unit) === normalize(item.unit),
        );
        if (matches.length !== 1) {
          throw new Error(
            matches.length === 0
              ? `Barang "${item.itemName}" tidak ditemukan di stok gudang.`
              : `Barang "${item.itemName}" memiliki SKU ganda di stok gudang.`,
          );
        }
        const stockItem = matches[0];
        const current = reservations.get(stockItem.id);
        reservations.set(stockItem.id, {
          name: stockItem.name,
          unit: stockItem.unit,
          quantity: (current?.quantity ?? new Prisma.Decimal(0)).plus(
            item.quantity,
          ),
          unitPrice: stockItem.unitPrice,
        });
      }
      for (const [stockItemId, reservation] of reservations) {
        const stockItem = stockItems.find((item) => item.id === stockItemId);
        if (!stockItem || stockItem.stockQuantity.lessThan(reservation.quantity)) {
          throw new Error(
            `Stok gudang untuk "${reservation.name}" tidak mencukupi.`,
          );
        }
      }

      const deliveryOrder = await transaction.deliveryOrder.create({
        data: {
          publicCode: code,
          doNumber,
          poId: purchaseOrder?.id,
          ticketId: ticket?.id,
          createdById: session.user.id,
          deliveryMethod,
          vehicleId: selectedVehicle?.id,
          vehiclePlateNumber: selectedVehicle?.plateNumber,
          vehicleDocumentNumber:
            input.vehicleDocumentNumber?.trim() || null,
          driverName:
            input.deliveryMethod === DODeliveryMethod.EXPEDITION
              ? input.driverName!.trim()
              : ticket?.moverAssignee?.name ?? input.driverName?.trim() ?? null,
          vehiclePlate:
            selectedVehicle?.plateNumber ??
            (input.vehiclePlate?.trim() || null),
          driverIdentityNumber: input.driverIdentityNumber?.trim() || null,
          driverPhone: input.driverPhone?.trim() || null,
          receiverName:
            input.deliveryMethod === DODeliveryMethod.EXPEDITION
              ? session.user.name?.trim() || "Tim Logistik"
              : input.receiverName?.trim() || null,
          status: input.status,
          items: {
            create: input.items.map((item) => ({
              qtyOrdered: item.qtyOrdered,
              qtyDelivered: item.qtyDelivered,
              itemName: item.itemName.trim(),
              unit: item.unit.trim(),
              remarks: item.remarks?.trim() || null,
            })),
          },
        },
        select: { id: true },
      });
      if (selectedVehicle) {
        const reserved = await transaction.vehicle.updateMany({
          where: {
            id: selectedVehicle.id,
            status: "AVAILABLE",
            odometerInitialized: true,
          },
          data: { status: "RESERVED" },
        });
        if (reserved.count !== 1) {
          throw new Error("Kendaraan baru saja ditugaskan. Pilih kendaraan lain.");
        }
      }
      for (const [stockItemId, reservation] of reservations) {
        const updated = await transaction.stockItem.updateMany({
          where: {
            id: stockItemId,
            stockQuantity: { gte: reservation.quantity },
          },
          data: { stockQuantity: { decrement: reservation.quantity } },
        });
        if (updated.count !== 1) {
          throw new Error(
            `Stok gudang untuk "${reservation.name}" tidak mencukupi.`,
          );
        }
        await transaction.stockMovement.create({
          data: {
            projectId: ticket?.projectId,
            stockItemId,
            type: StockMovementType.OUT,
            materialName: reservation.name,
            quantity: reservation.quantity,
            unit: reservation.unit,
            totalCost: reservation.quantity
              .mul(reservation.unitPrice)
              .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
            reference: doNumber,
            notes: `Pemenuhan tiket ${ticket?.ticketNumber ?? ""} melalui DO ${doNumber}.`,
            createdById: session.user.id,
          },
        });
      }
      return { code, doNumber, alreadyExists: false };
    });
    revalidatePath(`/d/${created.code}`);
    revalidatePath("/apps/orders");
    revalidatePath("/apps/logistics");
    revalidatePath("/apps/documents/issued");
    revalidatePath("/apps/logistics/stock");
    return {
      success: true,
      message: created.alreadyExists
        ? `DO ${created.doNumber} sudah ada. Lanjutkan menggunakan Surat Jalan tersebut.`
        : `Delivery Order ${created.doNumber} berhasil dibuat.`,
      publicCode: created.code,
    };
  } catch (error) {
    console.error("Delivery Order creation failed:", error);
    const inventoryError =
      error instanceof Error &&
      (/^Stok gudang/.test(error.message) ||
        /^Barang .* (tidak ditemukan|memiliki SKU ganda) di stok gudang\.$/.test(
          error.message,
        ));
    const vehicleError =
      error instanceof Error && error.message.startsWith("Kendaraan");
    const approvalError =
      error instanceof Error &&
      [
        "Tiket belum disetujui untuk diproses sebagai DO.",
        "Tiket harus memiliki persetujuan eksekutif sebelum DO diterbitkan.",
        "DO hanya dapat ditautkan ke Purchase Order yang sudah disetujui eksekutif.",
        "Purchase Order harus berasal dari tiket yang sama dengan DO.",
        "Item DO harus sesuai dengan item pada tiket referensi.",
      ].includes(error.message);
    return fail(
      inventoryError || approvalError || vehicleError
        ? error.message
        : "Delivery Order gagal dibuat. Periksa nomor DO dan PO terkait.",
    );
  }
}

export async function updateDeliveryOrder(
  publicCode: string,
  input: DeliveryOrderInput,
  arrivalPhotoFile?: File,
): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user || !canEditDeliveryOrders(session.user.role)) {
    return fail("Anda tidak memiliki akses untuk mengubah Delivery Order.");
  }
  if (
    !validPublicCode(publicCode) ||
    !input ||
    !isText(input.doNumber, 80) ||
    !Object.values(DOStatus).includes(input.status) ||
    !isText(input.driverName ?? "", 180, true) ||
    !isText(input.vehiclePlate ?? "", 40, true) ||
    !isText(input.vehicleDocumentNumber ?? "", 80, true) ||
    !isText(input.driverIdentityNumber ?? "", 32, true) ||
    !isText(input.driverPhone ?? "", 32, true) ||
    (input.deliveryMethod !== undefined &&
      !Object.values(DODeliveryMethod).includes(input.deliveryMethod)) ||
    (input.vehicleId !== undefined &&
      !isText(input.vehicleId, 64)) ||
    (input.vehicleId !== undefined &&
      input.deliveryMethod === DODeliveryMethod.EXPEDITION) ||
    (input.deliveryMethod === DODeliveryMethod.EXPEDITION &&
      (!isText(input.vehicleDocumentNumber ?? "", 80) ||
        !isText(input.driverName ?? "", 180) ||
        !/^[A-Za-z0-9./ -]{3,40}$/.test(input.vehiclePlate ?? "") ||
        !/^\d{16}$/.test(input.driverIdentityNumber ?? "") ||
        !/^[+()\d\s.-]{8,32}$/.test(input.driverPhone ?? ""))) ||
    !isText(input.receiverName ?? "", 180, true) ||
    !isValidItems(input.items, isDeliveryOrderItem)
  ) {
    return fail("Data Delivery Order tidak valid. Periksa nomor dan item pengiriman.");
  }
  const normalizedDoNumber = input.doNumber?.trim();
  if (!normalizedDoNumber) {
    return fail("Nomor Delivery Order wajib diisi.");
  }

  let savedArrivalPhotoUrl: string | null = null;
  try {
    const existingOrder = await prisma.deliveryOrder.findUnique({
      where: { publicCode },
      select: {
        id: true,
        deliveryMethod: true,
        arrivalPhotoUrl: true,
        receivedAt: true,
        receivedById: true,
        ticket: {
          select: {
            id: true,
            moverAssignee: { select: { name: true } },
          },
        },
      },
    });
    if (!existingOrder) {
      return fail("Delivery Order tidak ditemukan.");
    }
    if (
      input.deliveryMethod !== undefined &&
      input.deliveryMethod !== existingOrder.deliveryMethod
    ) {
      return fail("Jenis pengiriman tidak dapat diubah setelah DO diterbitkan.");
    }
    const deliveryMethod =
      existingOrder.deliveryMethod;
    const isExpeditionArrival =
      deliveryMethod === DODeliveryMethod.EXPEDITION &&
      input.status === DOStatus.DELIVERED;
    if (isExpeditionArrival) {
      if (session.user.role !== UserRole.LOGISTICS) {
        return fail(
          "Material ekspedisi harus diterima dan diselesaikan oleh bagian Logistik.",
        );
      }
      if (
        !existingOrder.arrivalPhotoUrl &&
        (!(arrivalPhotoFile instanceof File) || arrivalPhotoFile.size === 0)
      ) {
        return fail("Unggah foto material saat tiba di gudang sebelum menyelesaikan DO.");
      }
      if (existingOrder.receivedAt && arrivalPhotoFile instanceof File) {
        return fail("Bukti penerimaan material yang sudah tercatat tidak dapat diganti.");
      }
      if (arrivalPhotoFile instanceof File) {
        savedArrivalPhotoUrl =
          await saveDeliveryOrderArrivalPhoto(arrivalPhotoFile);
      }
    } else if (arrivalPhotoFile instanceof File && arrivalPhotoFile.size > 0) {
      return fail("Foto kedatangan hanya dapat dicatat saat DO ekspedisi diterima.");
    }

    const assignedMoverName = existingOrder.ticket?.moverAssignee?.name;
    const receivedAt = existingOrder.receivedAt ?? new Date();
    await prisma.$transaction(async (transaction) => {
      const currentOrder = await transaction.deliveryOrder.findUnique({
        where: { publicCode },
        select: {
          id: true,
          doNumber: true,
          deliveryMethod: true,
          status: true,
          vehicleId: true,
          items: {
            select: {
              id: true,
              itemName: true,
              qtyDelivered: true,
              unit: true,
            },
          },
          ticket: {
            select: {
              id: true,
              projectId: true,
              ticketNumber: true,
            },
          },
        },
      });
      if (!currentOrder) {
        throw new Error("Delivery Order tidak ditemukan.");
      }
      if (
        currentOrder.deliveryMethod === DODeliveryMethod.INTERNAL_MOVER &&
        input.status !== currentOrder.status
      ) {
        throw new Error(
          "Status DO internal hanya dapat diubah melalui Ruang Kerja Mover.",
        );
      }
      let assignedVehicle: { id: string; plateNumber: string } | null = null;
      if (input.vehicleId && input.vehicleId !== currentOrder.vehicleId) {
        if (
          session.user.role !== UserRole.LOGISTICS ||
          currentOrder.deliveryMethod !== DODeliveryMethod.INTERNAL_MOVER ||
          currentOrder.status !== DOStatus.PENDING ||
          currentOrder.vehicleId
        ) {
          throw new Error(
            "Kendaraan hanya dapat ditetapkan Logistik pada DO internal yang belum memiliki kendaraan.",
          );
        }
        assignedVehicle = await transaction.vehicle.findFirst({
          where: {
            id: input.vehicleId,
            status: "AVAILABLE",
            odometerInitialized: true,
            deliveryOrders: {
              none: { status: { in: [DOStatus.PENDING, DOStatus.IN_TRANSIT] } },
            },
          },
          select: { id: true, plateNumber: true },
        });
        if (!assignedVehicle) {
          throw new Error(
            "Kendaraan tidak tersedia atau KM awal belum diinisialisasi.",
          );
        }
        const reserved = await transaction.vehicle.updateMany({
          where: {
            id: assignedVehicle.id,
            status: "AVAILABLE",
            odometerInitialized: true,
          },
          data: { status: "RESERVED" },
        });
        if (reserved.count !== 1) {
          throw new Error("Kendaraan baru saja ditugaskan. Muat ulang DO.");
        }
        const attached = await transaction.deliveryOrder.updateMany({
          where: {
            id: currentOrder.id,
            status: DOStatus.PENDING,
            vehicleId: null,
          },
          data: {
            vehicleId: assignedVehicle.id,
            vehiclePlateNumber: assignedVehicle.plateNumber,
          },
        });
        if (attached.count !== 1) {
          throw new Error("DO sudah memiliki kendaraan atau statusnya berubah.");
        }
      }
      if (currentOrder.ticket) {
        await lockTicketFulfillment(transaction, currentOrder.ticket.id);
      }

      const currentItemIds = new Set(currentOrder.items.map((item) => item.id));
      const submittedItemIds = input.items.flatMap((item) =>
        item.id ? [item.id] : [],
      );
      if (
        new Set(submittedItemIds).size !== submittedItemIds.length ||
        submittedItemIds.some((id) => !currentItemIds.has(id)) ||
        (submittedItemIds.length === 0 &&
          input.items.length !== currentOrder.items.length)
      ) {
        throw new Error(
          "Daftar item DO berubah sejak halaman dibuka. Muat ulang sebelum menyimpan.",
        );
      }

      const outboundMovements =
        await transaction.stockMovement.findMany({
          where: {
            reference: currentOrder.doNumber,
            type: StockMovementType.OUT,
          },
          select: {
            stockItemId: true,
            materialName: true,
            unit: true,
          },
        });
      const trackedStockItemIds = new Set(
        outboundMovements.flatMap((movement) =>
          movement.stockItemId ? [movement.stockItemId] : [],
        ),
      );

      if (trackedStockItemIds.size > 0) {
        const [stockItems, movements] = await Promise.all([
          transaction.stockItem.findMany({
            where: { id: { in: [...trackedStockItemIds] } },
            select: {
              id: true,
              name: true,
              unit: true,
              stockQuantity: true,
              unitPrice: true,
            },
          }),
          transaction.stockMovement.findMany({
            where: {
              reference: currentOrder.doNumber,
              type: {
                in: [StockMovementType.IN, StockMovementType.OUT],
              },
              stockItemId: { in: [...trackedStockItemIds] },
            },
            select: {
              stockItemId: true,
              type: true,
              quantity: true,
            },
          }),
        ]);
        const normalize = (value: string) =>
          value.trim().replace(/\s+/g, " ").toLocaleLowerCase("id-ID");
        const itemKey = (name: string, unit: string) =>
          `${normalize(name)}\u0000${normalize(unit)}`;
        const movementItemIdsByKey = new Map<string, Set<string>>();
        for (const movement of outboundMovements) {
          if (!movement.stockItemId) continue;
          const key = itemKey(movement.materialName, movement.unit);
          const ids = movementItemIdsByKey.get(key) ?? new Set<string>();
          ids.add(movement.stockItemId);
          movementItemIdsByKey.set(key, ids);
        }
        const oldItemStockIds = new Map<string, string>();
        for (const item of currentOrder.items) {
          const ids = movementItemIdsByKey.get(itemKey(item.itemName, item.unit));
          if (ids?.size === 1) {
            oldItemStockIds.set(item.id, [...ids][0]);
          }
        }
        const targetQuantities = new Map<string, Prisma.Decimal>();
        for (const item of input.items) {
          const oldStockItemId = item.id
            ? oldItemStockIds.get(item.id)
            : undefined;
          if (item.id && oldStockItemId) {
            const oldItem = currentOrder.items.find(
              (current) => current.id === item.id,
            );
            if (
              oldItem &&
              itemKey(item.itemName, item.unit) !==
                itemKey(oldItem.itemName, oldItem.unit)
            ) {
              throw new Error(
                "Nama dan satuan barang yang stoknya sudah dipotong tidak dapat diubah pada DO.",
              );
            }
          }
          const itemIds = movementItemIdsByKey.get(
            itemKey(item.itemName, item.unit),
          );
          const stockItemId =
            oldStockItemId ??
            (itemIds?.size === 1 ? [...itemIds][0] : undefined);
          if (!stockItemId) continue;
          targetQuantities.set(
            stockItemId,
            (targetQuantities.get(stockItemId) ?? new Prisma.Decimal(0)).plus(
              new Prisma.Decimal(item.qtyDelivered.toString()),
            ),
          );
        }

        for (const stockItemId of trackedStockItemIds) {
          const stockItem = stockItems.find((item) => item.id === stockItemId);
          if (!stockItem) continue;
          const netIssued = movements
            .filter((movement) => movement.stockItemId === stockItemId)
            .reduce(
              (quantity, movement) =>
                movement.type === StockMovementType.OUT
                  ? quantity.plus(movement.quantity)
                  : quantity.minus(movement.quantity),
              new Prisma.Decimal(0),
            );
          if (netIssued.lessThan(0)) {
            throw new Error(
              `Riwayat stok DO ${currentOrder.doNumber} tidak konsisten.`,
            );
          }
          const targetQuantity =
            targetQuantities.get(stockItemId) ?? new Prisma.Decimal(0);
          const difference = netIssued.minus(targetQuantity);
          if (difference.isZero()) continue;

          const isRestock = difference.greaterThan(0);
          const adjustedQuantity = difference.abs();
          const updated = await transaction.stockItem.updateMany({
            where: {
              id: stockItemId,
              ...(isRestock
                ? {}
                : { stockQuantity: { gte: adjustedQuantity } }),
            },
            data: {
              stockQuantity: isRestock
                ? { increment: adjustedQuantity }
                : { decrement: adjustedQuantity },
            },
          });
          if (updated.count !== 1) {
            throw new Error(
              `Stok ${stockItem.name} tidak mencukupi untuk menyesuaikan Qty DO.`,
            );
          }
          await transaction.stockMovement.create({
            data: {
              projectId: currentOrder.ticket?.projectId,
              stockItemId,
              type: isRestock
                ? StockMovementType.IN
                : StockMovementType.OUT,
              materialName: stockItem.name,
              quantity: adjustedQuantity,
              unit: stockItem.unit,
              totalCost: adjustedQuantity
                .mul(stockItem.unitPrice)
                .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
              reference: currentOrder.doNumber,
              notes: isRestock
                ? `Restock selisih Qty DO ${currentOrder.doNumber} dari tiket ${currentOrder.ticket?.ticketNumber ?? "tanpa tiket"}.`
                : `Pemotongan tambahan selisih Qty DO ${currentOrder.doNumber} dari tiket ${currentOrder.ticket?.ticketNumber ?? "tanpa tiket"}.`,
              createdById: session.user.id,
            },
          });
        }
      }

      await transaction.deliveryOrder.update({
        where: { publicCode },
        data: {
          doNumber: normalizedDoNumber,
          deliveryMethod: existingOrder.deliveryMethod,
          vehicleDocumentNumber:
            input.vehicleDocumentNumber?.trim() || null,
          driverName:
            input.deliveryMethod === DODeliveryMethod.EXPEDITION
              ? input.driverName!.trim()
              : assignedMoverName ?? input.driverName?.trim() ?? null,
          vehiclePlate: input.vehiclePlate?.trim() || null,
          ...(assignedVehicle
            ? {
                vehicleId: assignedVehicle.id,
                vehiclePlateNumber: assignedVehicle.plateNumber,
                vehiclePlate: assignedVehicle.plateNumber,
              }
            : {}),
          driverIdentityNumber: input.driverIdentityNumber?.trim() || null,
          driverPhone: input.driverPhone?.trim() || null,
          receiverName: isExpeditionArrival
            ? existingOrder.receivedAt
              ? input.receiverName?.trim() || null
              : session.user.name?.trim() || "Tim Logistik"
            : input.receiverName?.trim() || null,
          ...(isExpeditionArrival && !existingOrder.receivedAt
            ? {
                receivedAt,
                receivedById: session.user.id,
                arrivalPhotoUrl:
                  savedArrivalPhotoUrl ?? existingOrder.arrivalPhotoUrl,
              }
            : {}),
          ...(currentOrder.deliveryMethod === DODeliveryMethod.EXPEDITION
            ? { status: input.status }
            : {}),
        },
      });
      if (normalizedDoNumber !== currentOrder.doNumber) {
        await transaction.stockMovement.updateMany({
          where: { reference: currentOrder.doNumber },
          data: { reference: normalizedDoNumber },
        });
      }
      await transaction.dOItem.deleteMany({
        where: {
          doId: currentOrder.id,
          id: { notIn: submittedItemIds },
        },
      });
      for (const item of input.items) {
        const data = {
          itemName: item.itemName.trim(),
          qtyOrdered: item.qtyOrdered,
          qtyDelivered: item.qtyDelivered,
          unit: item.unit.trim(),
          remarks: item.remarks?.trim() || null,
        };
        if (item.id) {
          await transaction.dOItem.update({
            where: { id: item.id },
            data,
          });
        } else {
          await transaction.dOItem.create({
            data: { doId: currentOrder.id, ...data },
          });
        }
      }
      if (
        existingOrder.deliveryMethod ===
          DODeliveryMethod.EXPEDITION &&
        input.status === DOStatus.DELIVERED &&
        existingOrder.ticket
      ) {
        await syncTicketStatus(
          transaction,
          existingOrder.ticket.id,
          TicketStatus.COMPLETED,
        );
        await transaction.ticketAuditLog.create({
          data: {
            id: randomUUID(),
            ticketId: existingOrder.ticket.id,
            userId: session.user.id,
            action: "EXPEDITION_DELIVERY_COMPLETED",
            notes: `Material pada DO ${normalizedDoNumber} diterima oleh Logistik di gudang pada ${receivedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}.`,
          },
        });
      }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (savedArrivalPhotoUrl) {
      try {
        await removeDeliveryOrderArrivalPhoto(savedArrivalPhotoUrl);
      } catch (cleanupError) {
        console.error(
          "Delivery Order arrival photo cleanup failed:",
          cleanupError,
        );
      }
    }
    if (error instanceof DeliveryOrderArrivalPhotoValidationError) {
      return fail(error.message);
    }
    console.error("Delivery Order update failed:", error);
    const actionableError =
      error instanceof Error &&
      /^(Daftar item DO berubah|Nama dan satuan barang|Stok .* tidak mencukupi|Riwayat stok DO|Kendaraan|DO sudah memiliki kendaraan|Status DO internal)/.test(
        error.message,
      );
    return fail(
      actionableError
        ? error.message
        : "Delivery Order gagal disimpan. Periksa nomor DO dan coba kembali.",
    );
  }

  revalidatePath(`/d/${publicCode}`);
  revalidatePath("/apps/documents");
  revalidatePath("/apps/tickets");
  revalidatePath("/apps/logistics");
  revalidatePath("/apps/logistics/stock");
  return { success: true, message: "Perubahan Delivery Order berhasil disimpan." };
}

export async function startMoverDeliveryOrder(
  publicCode: string,
  kilometerStart: number,
): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== UserRole.MOVER) {
    return fail("Hanya Mover yang ditugaskan yang dapat memulai pengiriman.");
  }
  if (
    !validPublicCode(publicCode) ||
    !isValidKilometer(kilometerStart)
  ) {
    return fail("Kode DO atau kendaraan tidak valid.");
  }

  try {
    const result = await prisma.$transaction(async (transaction) => {
      const reference = await transaction.deliveryOrder.findUnique({
        where: { publicCode },
        select: { ticketId: true },
      });
      if (!reference) throw new Error("Delivery Order tidak ditemukan.");
      if (reference.ticketId) {
        await lockTicketFulfillment(transaction, reference.ticketId);
      }

      const order = await transaction.deliveryOrder.findUnique({
        where: { publicCode },
        select: {
          id: true,
          doNumber: true,
          deliveryMethod: true,
          status: true,
          driverName: true,
          vehicleId: true,
          vehiclePlateNumber: true,
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              moverAssigneeId: true,
              status: true,
            },
          },
        },
      });
      if (!order) throw new Error("Delivery Order tidak ditemukan.");
      const isAssigned =
        order.ticket?.moverAssigneeId === session.user.id ||
        (!order.ticket?.moverAssigneeId &&
          Boolean(session.user.name) &&
          order.driverName === session.user.name);
      if (!isAssigned) {
        throw new Error("DO ini tidak ditugaskan kepada akun Mover Anda.");
      }
      if (order.deliveryMethod !== DODeliveryMethod.INTERNAL_MOVER) {
        throw new Error("DO ini bukan tugas pengiriman Mover internal.");
      }
      if (order.status !== DOStatus.PENDING) {
        throw new Error("Status DO sudah berubah. Muat ulang halaman.");
      }
      if (!order.vehicleId || !order.vehiclePlateNumber) {
        throw new Error("DO belum memiliki kendaraan yang ditetapkan Logistik.");
      }
      const vehicle = await transaction.vehicle.findFirst({
        where: {
          id: order.vehicleId,
          status: "RESERVED",
          odometerInitialized: true,
        },
        select: {
          id: true,
          plateNumber: true,
          currentKilometer: true,
          odometerInitialized: true,
        },
      });
      if (!vehicle) {
        throw new Error("Kendaraan yang ditetapkan Logistik tidak tersedia.");
      }
      if (!vehicle.odometerInitialized) {
        throw new Error("KM awal kendaraan belum diinisialisasi oleh Logistik.");
      }
      const startOdometer = new Prisma.Decimal(kilometerStart.toString());
      if (!vehicle.currentKilometer.equals(startOdometer)) {
        throw new Error(
          `KM berangkat harus sesuai odometer kendaraan (${vehicle.currentKilometer.toString()} km).`,
        );
      }
      const claimedVehicle = await transaction.vehicle.updateMany({
        where: {
          id: vehicle.id,
          status: "RESERVED",
          currentKilometer: startOdometer,
        },
        data: { status: "IN_USE" },
      });
      if (claimedVehicle.count !== 1) {
        throw new Error("Kendaraan baru saja digunakan. Pilih armada lain.");
      }

      const updated = await transaction.deliveryOrder.updateMany({
        where: { id: order.id, status: DOStatus.PENDING },
        data: {
          status: DOStatus.IN_TRANSIT,
          departureKilometer: startOdometer,
        },
      });
      if (updated.count !== 1) {
        throw new Error("Status DO sudah berubah. Muat ulang halaman.");
      }

      if (order.ticket) {
        await syncTicketStatus(
          transaction,
          order.ticket.id,
          TicketStatus.IN_TRANSIT,
        );
        await transaction.ticketAuditLog.create({
          data: {
            ticketId: order.ticket.id,
            userId: session.user.id,
            action: "MOVER_DELIVERY_STARTED",
            notes: `Mover memulai pengiriman DO ${order.doNumber} menggunakan kendaraan ${vehicle.plateNumber}.`,
          },
        });
      }
      return { doNumber: order.doNumber, plateNumber: vehicle.plateNumber };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    revalidatePath("/apps/logistics");
    revalidatePath("/apps/tickets");
    revalidatePath(`/d/${publicCode}`);
    return {
      success: true,
      message: `Pengiriman DO ${result.doNumber} dimulai dengan kendaraan ${result.plateNumber}.`,
      publicCode,
    };
  } catch (error) {
    console.error("Mover delivery start failed:", error);
    return fail(
      error instanceof Error &&
        (error.message.startsWith("Delivery Order") ||
          error.message.startsWith("DO ini") ||
          error.message.startsWith("Status DO") ||
          error.message.startsWith("Kendaraan") ||
          error.message.startsWith("KM berangkat") ||
          error.message.startsWith("KM awal kendaraan") ||
          error.message.startsWith("Ajukan dana") ||
          error.message.startsWith("DO belum memiliki"))
        ? error.message
        : "Pengiriman gagal dimulai. Muat ulang halaman lalu coba kembali.",
    );
  }
}

const MAX_MOVER_PROOF_PHOTOS = 5;
const MAX_MOVER_PROOF_TOTAL_BYTES = 25 * 1024 * 1024;
const MOVER_PROOF_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function submitMoverDeliveryProofs(
  publicCode: string,
  files: File[],
  completeDelivery: boolean,
  kilometerStart?: number,
  kilometerEnd?: number,
): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== UserRole.MOVER) {
    return fail("Hanya Mover yang ditugaskan yang dapat mengirim bukti.");
  }
  if (
    !validPublicCode(publicCode) ||
    !Array.isArray(files) ||
    typeof completeDelivery !== "boolean" ||
    (completeDelivery &&
      (!isValidKilometer(kilometerStart) ||
        !isValidKilometer(kilometerEnd) ||
        kilometerEnd < kilometerStart)) ||
    files.length > MAX_MOVER_PROOF_PHOTOS ||
    files.some(
      (file) =>
        !(file instanceof File) ||
        !MOVER_PROOF_IMAGE_TYPES.includes(file.type) ||
        file.size < 1 ||
        file.size > 5 * 1024 * 1024,
    ) ||
    files.reduce((total, file) => total + file.size, 0) >
      MAX_MOVER_PROOF_TOTAL_BYTES ||
    (!completeDelivery && files.length === 0)
  ) {
    return fail(
      "Pilih 1–5 foto JPG, PNG, atau WEBP. Maksimal 5 MB per foto dan 25 MB per pengiriman.",
    );
  }

  const receiptUrls: string[] = [];
  try {
    for (const file of files) {
      receiptUrls.push(await saveTicketReceipt(file));
    }
  } catch (error) {
    await Promise.all(
      receiptUrls.map(async (url) => {
        try {
          await removeTicketReceipt(url);
        } catch (cleanupError) {
          console.error("Failed to remove invalid Mover proof upload:", cleanupError);
        }
      }),
    );
    return fail(
      error instanceof Error
        ? error.message
        : "Foto bukti pengiriman gagal diproses.",
    );
  }

  let proofsCommitted = false;
  try {
    const result = await prisma.$transaction(async (transaction) => {
      const reference = await transaction.deliveryOrder.findUnique({
        where: { publicCode },
        select: { ticketId: true },
      });
      if (!reference) throw new Error("Delivery Order tidak ditemukan.");
      if (reference.ticketId) {
        await lockTicketFulfillment(transaction, reference.ticketId);
      }

      const order = await transaction.deliveryOrder.findUnique({
        where: { publicCode },
        select: {
          id: true,
          doNumber: true,
          deliveryMethod: true,
          status: true,
          driverName: true,
          vehicleId: true,
          departureKilometer: true,
          deliveryReceiptUrl: true,
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              moverAssigneeId: true,
              projectId: true,
            },
          },
          po: {
            select: {
              ticket: { select: { projectId: true } },
            },
          },
        },
      });
      if (!order) throw new Error("Delivery Order tidak ditemukan.");
      const isAssigned =
        order.ticket?.moverAssigneeId === session.user.id ||
        (!order.ticket?.moverAssigneeId &&
          Boolean(session.user.name) &&
          order.driverName === session.user.name);
      if (!isAssigned) {
        throw new Error("DO ini tidak ditugaskan kepada akun Mover Anda.");
      }
      if (order.deliveryMethod !== DODeliveryMethod.INTERNAL_MOVER) {
        throw new Error("DO ini bukan tugas pengiriman Mover internal.");
      }
      if (order.status !== DOStatus.IN_TRANSIT) {
        throw new Error("Mulai pengiriman terlebih dahulu sebelum menyelesaikan DO.");
      }

      const storedProofCount = await transaction.deliveryOrderProof.count({
        where: { deliveryOrderId: order.id },
      });
      const existingProofCount = Math.max(
        storedProofCount,
        order.deliveryReceiptUrl ? 1 : 0,
      );
      if (completeDelivery && existingProofCount + receiptUrls.length === 0) {
        throw new Error("Unggah minimal satu foto bukti sebelum menyelesaikan DO.");
      }

      let tripDistance: Prisma.Decimal | null = null;
      let tripFuelLiter: Prisma.Decimal | null = null;
      if (completeDelivery) {
        if (!order.vehicleId) {
          throw new Error("Kendaraan pengiriman belum terhubung ke DO.");
        }
        const startOdometer = new Prisma.Decimal(kilometerStart!.toString());
        const endOdometer = new Prisma.Decimal(kilometerEnd!.toString());
        if (
          order.departureKilometer &&
          !order.departureKilometer.equals(startOdometer)
        ) {
          throw new Error("KM berangkat tidak sesuai dengan data saat kendaraan dipilih.");
        }
        const vehicle = await transaction.vehicle.findUnique({
          where: { id: order.vehicleId },
          select: { status: true, currentKilometer: true },
        });
        if (!vehicle || vehicle.status !== "IN_USE") {
          throw new Error("Status kendaraan tidak sesuai dengan DO yang berjalan.");
        }
        if (!vehicle.currentKilometer.equals(startOdometer)) {
          throw new Error(
            `KM berangkat harus sesuai odometer kendaraan (${vehicle.currentKilometer.toString()} km).`,
          );
        }
        tripDistance = endOdometer.minus(startOdometer);
        tripFuelLiter = tripDistance
          .div(VEHICLE_FUEL_EFFICIENCY_KM_PER_LITER)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
        const updatedVehicle = await transaction.vehicle.updateMany({
          where: {
            id: order.vehicleId,
            status: "IN_USE",
            currentKilometer: startOdometer,
          },
          data: {
            currentKilometer: endOdometer,
            status: "AVAILABLE",
          },
        });
        if (updatedVehicle.count !== 1) {
          throw new Error("Odometer kendaraan berubah. Muat ulang halaman.");
        }
      }

      if (receiptUrls.length > 0) {
        await transaction.deliveryOrderProof.createMany({
          data: receiptUrls.map((url) => ({
            deliveryOrderId: order.id,
            url,
          })),
        });
      }

      const primaryReceiptUrl =
        order.deliveryReceiptUrl ?? receiptUrls[0] ?? null;
      const updated = await transaction.deliveryOrder.updateMany({
        where: { id: order.id, status: DOStatus.IN_TRANSIT },
        data: {
          ...(primaryReceiptUrl
            ? { deliveryReceiptUrl: primaryReceiptUrl }
            : {}),
          ...(completeDelivery
            ? {
                status: DOStatus.DELIVERED,
                receivedAt: new Date(),
                receivedById: session.user.id,
                departureKilometer: new Prisma.Decimal(
                  kilometerStart!.toString(),
                ),
              }
            : {}),
        },
      });
      if (updated.count !== 1) {
        throw new Error("Status DO sudah berubah. Muat ulang halaman.");
      }

      if (completeDelivery && order.vehicleId && tripDistance && tripFuelLiter) {
        await transaction.vehicleTripLog.create({
          data: {
            vehicleId: order.vehicleId,
            deliveryOrderId: order.id,
            projectId:
              order.ticket?.projectId ?? order.po?.ticket?.projectId ?? null,
            kilometerStart: new Prisma.Decimal(kilometerStart!.toString()),
            kilometerEnd: new Prisma.Decimal(kilometerEnd!.toString()),
            distanceKm: tripDistance,
            fuelLiter: tripFuelLiter,
            fuelEfficiencyKmPerL: VEHICLE_FUEL_EFFICIENCY_KM_PER_LITER,
            createdById: session.user.id,
          },
        });
      }

      if (order.ticket) {
        if (primaryReceiptUrl) {
          await transaction.ticket.update({
            where: { id: order.ticket.id },
            data: { deliveryOrderReceiptUrl: primaryReceiptUrl },
          });
        }
        if (completeDelivery) {
          await syncTicketStatus(
            transaction,
            order.ticket.id,
            TicketStatus.COMPLETED,
          );
        }
        await transaction.ticketAuditLog.create({
          data: {
            ticketId: order.ticket.id,
            userId: session.user.id,
            action: completeDelivery
              ? "MOVER_DELIVERY_COMPLETED"
              : "MOVER_DELIVERY_PROOF_ADDED",
            notes: completeDelivery
              ? `Mover menyelesaikan pengiriman DO ${order.doNumber} dengan ${existingProofCount + receiptUrls.length} foto bukti.`
              : `Mover menambahkan ${receiptUrls.length} foto bukti untuk DO ${order.doNumber}.`,
          },
        });
      }
      return {
        doNumber: order.doNumber,
        proofCount: existingProofCount + receiptUrls.length,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    proofsCommitted = true;

    revalidatePath("/apps/logistics");
    if (completeDelivery) revalidatePath("/apps/finance");
    revalidatePath("/apps/tickets");
    revalidatePath(`/d/${publicCode}`);
    return {
      success: true,
      message: completeDelivery
        ? `Pengiriman DO ${result.doNumber} selesai. ${result.proofCount} foto bukti tersimpan.`
        : `${receiptUrls.length} foto bukti untuk DO ${result.doNumber} berhasil disimpan.`,
      publicCode,
    };
  } catch (error) {
    if (!proofsCommitted) {
      await Promise.all(
        receiptUrls.map(async (url) => {
          try {
            await removeTicketReceipt(url);
          } catch (cleanupError) {
            console.error("Failed to remove unused Mover proof:", cleanupError);
          }
        }),
      );
    }
    console.error("Mover delivery proof submission failed:", error);
    return fail(
      error instanceof Error &&
        (error.message.startsWith("Delivery Order") ||
          error.message.startsWith("DO ini") ||
          error.message.startsWith("Mulai pengiriman") ||
          error.message.startsWith("Status DO") ||
          error.message.startsWith("Unggah minimal") ||
          error.message.startsWith("Kendaraan") ||
          error.message.startsWith("Status kendaraan") ||
          error.message.startsWith("KM berangkat") ||
          error.message.startsWith("Odometer"))
        ? error.message
        : "Foto bukti gagal disimpan. Muat ulang halaman lalu coba kembali.",
    );
  }
}

export async function receiveExpeditionDeliveryOrder(
  publicCode: string,
  arrivalPhotoFile: File,
): Promise<OrderActionResult> {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== UserRole.LOGISTICS) {
    return fail("Hanya Logistik yang dapat menerima material ekspedisi.");
  }
  if (
    !isValidPublicCode(publicCode) ||
    !(arrivalPhotoFile instanceof File) ||
    arrivalPhotoFile.size === 0
  ) {
    return fail("Delivery Order dan foto bukti penerimaan wajib dipilih.");
  }

  let arrivalPhotoUrl: string;
  try {
    arrivalPhotoUrl = await saveDeliveryOrderArrivalPhoto(arrivalPhotoFile);
  } catch (error) {
    if (error instanceof DeliveryOrderArrivalPhotoValidationError) {
      return fail(error.message);
    }
    console.error("Expedition arrival photo save failed:", error);
    return fail("Foto kedatangan gagal disimpan. Silakan coba kembali.");
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const deliveryOrderReference = await transaction.deliveryOrder.findUnique({
        where: { publicCode },
        select: { ticketId: true },
      });
      if (!deliveryOrderReference?.ticketId) {
        throw new Error(
          "Delivery Order tidak ditemukan, bukan ekspedisi, atau tidak lagi dalam perjalanan.",
        );
      }

      await lockTicketFulfillment(
        transaction,
        deliveryOrderReference.ticketId,
      );
      const deliveryOrder = await transaction.deliveryOrder.findUnique({
        where: { publicCode },
        select: {
          id: true,
          doNumber: true,
          deliveryMethod: true,
          status: true,
          receivedAt: true,
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              status: true,
              requesterId: true,
            },
          },
        },
      });
      if (
        !deliveryOrder ||
        deliveryOrder.deliveryMethod !== DODeliveryMethod.EXPEDITION ||
        deliveryOrder.status !== DOStatus.IN_TRANSIT ||
        deliveryOrder.receivedAt ||
        deliveryOrder.ticket?.status !== TicketStatus.IN_TRANSIT
      ) {
        throw new Error(
          "Delivery Order tidak ditemukan, bukan ekspedisi, atau tidak lagi dalam perjalanan.",
        );
      }

      const receivedAt = new Date();
      const deliveryUpdate = await transaction.deliveryOrder.updateMany({
        where: {
          id: deliveryOrder.id,
          status: DOStatus.IN_TRANSIT,
          receivedAt: null,
        },
        data: {
          status: DOStatus.DELIVERED,
          receiverName: session.user.name?.trim() || "Tim Logistik",
          receivedAt,
          receivedById: session.user.id,
          arrivalPhotoUrl,
        },
      });
      if (deliveryUpdate.count !== 1) {
        throw new Error("Status DO berubah; muat ulang lalu coba kembali.");
      }
      await syncTicketStatus(
        transaction,
        deliveryOrder.ticket.id,
        TicketStatus.COMPLETED,
      );

      await transaction.ticketAuditLog.create({
        data: {
          id: randomUUID(),
          ticketId: deliveryOrder.ticket.id,
          userId: session.user.id,
          action: "EXPEDITION_DELIVERY_COMPLETED",
          notes: `Material pada DO ${deliveryOrder.doNumber} diterima di gudang oleh Logistik pada ${receivedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}.`,
        },
      });
      await sendNotification({
        userId: deliveryOrder.ticket.requesterId,
        title: "Material Tiba di Gudang",
        message: `Material pada DO ${deliveryOrder.doNumber} untuk tiket ${deliveryOrder.ticket.ticketNumber} telah diterima Logistik.`,
        actionUrl: `/apps/logistics`,
        type: NotificationType.SUCCESS,
        database: transaction,
      });
    });
  } catch (error) {
    try {
      await removeDeliveryOrderArrivalPhoto(arrivalPhotoUrl);
    } catch (cleanupError) {
      console.error("Expedition arrival photo cleanup failed:", cleanupError);
    }
    if (
      error instanceof DeliveryOrderArrivalPhotoValidationError ||
      (error instanceof Error &&
        (error.message.startsWith("Delivery Order") ||
          error.message.startsWith("Status DO")))
    ) {
      return fail(error.message);
    }
    console.error("Expedition delivery receipt failed:", error);
    return fail("Tiket gagal diselesaikan. Periksa DO lalu coba kembali.");
  }

  revalidatePath(`/d/${publicCode}`);
  revalidatePath("/apps/documents");
  revalidatePath("/apps/tickets");
  revalidatePath("/apps/logistics");
  return {
    success: true,
    message: "Material diterima di gudang dan tiket berhasil diselesaikan.",
  };
}
