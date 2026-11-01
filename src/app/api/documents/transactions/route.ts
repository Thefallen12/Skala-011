import { NextRequest, NextResponse } from "next/server";
import { PaymentStatus, UserRole } from "@/generated/prisma/enums";
import { auth } from "../../../../../auth";
import { renderUniversalTransactionDocument } from "@/lib/documents/universal-transaction-print";
import type {
  UniversalDocumentData,
  UniversalDocumentItem,
} from "@/lib/documents/universal-transaction-print";
import { prisma } from "@/lib/prisma";
import {
  createBrandedQrDataUrl,
  getDocumentHeaderLogoDataUrl,
} from "@/lib/documents/qr-code";
import { resolvePublicAppUrl } from "@/lib/documents/public-app-url";
import { projectSiteName } from "@/lib/documents/project-site-name";
import { renderPdf } from "@/lib/documents/render-pdf";

export const runtime = "nodejs";

type DocumentKind = UniversalDocumentData["kind"];

const allowedPrivateRoles: UserRole[] = [
  UserRole.LOGISTICS,
  UserRole.FINANCE,
  UserRole.DIRECTOR,
  UserRole.DEPUTY_DIRECTOR,
  UserRole.ADMINISTRATIONS,
];
const allowedPreviewRoles: UserRole[] = [
  UserRole.ADMINISTRATIONS,
  UserRole.DIRECTOR,
];

const formatDate = (date: Date | null | undefined) =>
  date?.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" }) ?? "-";

const formatDateTime = (date: Date | null | undefined) =>
  date?.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) ?? "-";

const summary = (subtotal: number, tax: number, deduction = 0) => [
  { label: "SUB TOTAL", amount: subtotal },
  { label: "PPN / TAX", amount: tax },
  ...(deduction ? [{ label: "POTONGAN / DEDUCTION", amount: -deduction }] : []),
  { label: "TOTAL", amount: subtotal + tax - deduction, emphasis: true },
];

function sampleDocument(kind: DocumentKind): UniversalDocumentData {
  const examples = {
    PO: {
      title: "PURCHASE ORDER",
      subtitle: "PESANAN PEMBELIAN",
      number: "PO-CONTOH-2026",
      leftDetails: [
        { label: "Kepada / Vendor", value: "CV Contoh Material" },
        { label: "Alamat", value: "Jl. Contoh No. 10, Takengon" },
        { label: "Kontak", value: "vendor@contoh.co.id" },
        { label: "No. Telepon", value: "0642 123456" },
      ],
      rightDetails: [
        { label: "Proyek / Site", value: "Pembangunan Gedung Contoh" },
        { label: "Metode Pembayaran", value: "Transfer" },
        { label: "Syarat Pembayaran", value: "Pembayaran setelah invoice diterima" },
      ],
      items: [
        { itemCode: "MAT-001", description: "Semen Portland 50 kg", quantity: 40, unit: "sak", unitPrice: 75000, totalPrice: 3000000 },
        { itemCode: "MAT-002", description: "Besi beton ulir 10 mm", quantity: 25, unit: "batang", unitPrice: 98000, totalPrice: 2450000 },
        { itemCode: "MAT-003", description: "Pasir pasang", quantity: 5, unit: "m³", unitPrice: 325000, totalPrice: 1625000 },
      ],
      summary: summary(7075000, 0),
      terms: [
        "Harap cantumkan nomor PO ini pada semua dokumen pengiriman dan invoice.",
        "Barang harus dikirim sesuai spesifikasi dan tanggal yang disepakati.",
      ],
      notes: undefined,
      signatures: [
        { heading: "Dibuat Oleh / Prepared By", name: "Bambang Gunawan", role: "Logistik" },
        { heading: "Diperiksa Oleh / Checked By", name: "Siti Rahmawati", role: "Keuangan" },
        { heading: "Disetujui Oleh / Approved By", name: "Direktur", role: "Direksi" },
      ],
    },
    INVOICE: {
      title: "INVOICE PEMBAYARAN",
      subtitle: "TAGIHAN VENDOR",
      number: "INV-CONTOH-2026",
      leftDetails: [
        { label: "Nama Toko / Mandor", value: "CV Contoh Material" },
        { label: "Proyek / Site", value: "Pembangunan Gedung Contoh" },
        { label: "No. PO / SPK", value: "PO-CONTOH-2026" },
      ],
      rightDetails: [
        { label: "Metode Pembayaran", value: "Transfer" },
        { label: "No. Rekening / Bank", value: "1234567890 · Bank Contoh" },
        { label: "Periode / Tanggal", value: "2 November 2026" },
      ],
      items: [
        { itemCode: "MAT-001", description: "Semen Portland 50 kg", quantity: 40, unit: "sak", unitPrice: 75000, totalPrice: 3000000 },
        { itemCode: "MAT-002", description: "Besi beton ulir 10 mm", quantity: 25, unit: "batang", unitPrice: 98000, totalPrice: 2450000 },
      ],
      summary: summary(5450000, 599500, 50000),
      terms: undefined,
      notes: "Pembayaran sesuai rincian invoice dan purchase order terlampir.",
      signatures: [
        { heading: "Ditandatangani Oleh / Signed By", name: "Siti Rahmawati", role: "Keuangan" },
        { heading: "Diketahui Oleh / Acknowledged By", name: "Direktur", role: "Direktur" },
        { heading: "Diterima Oleh / Vendor", name: "CV Contoh Material", role: "Vendor" },
      ],
    },
    KO: {
      title: "ORDER CONFIRMATION",
      subtitle: "KONFIRMASI ORDER",
      number: "KO-CONTOH-2026",
      leftDetails: [
        { label: "Kepada / Vendor", value: "CV Contoh Material" },
        { label: "No. PO Pelanggan", value: "PO-CONTOH-2026" },
        { label: "Jenis Pembayaran", value: "Uang Muka (DP)" },
      ],
      rightDetails: [
        { label: "Syarat Pembayaran", value: "DP 30%, pelunasan setelah barang diterima" },
        { label: "Nominal Dibayar", value: "Rp 1.800.000" },
        { label: "Tujuan Transfer", value: "Bank Contoh · 1234567890" },
      ],
      items: [
        { itemCode: "MAT-001", description: "Semen Portland 50 kg", quantity: 40, unit: "sak", unitPrice: 75000, totalPrice: 3000000 },
        { itemCode: "MAT-002", description: "Besi beton ulir 10 mm", quantity: 25, unit: "batang", unitPrice: 98000, totalPrice: 2450000 },
      ],
      summary: summary(5450000, 599500),
      terms: undefined,
      notes: "Nominal pembayaran transaksi ini: Rp 1.800.000.",
      signatures: [
        { heading: "Ditandatangani Oleh / Signed By", name: "Siti Rahmawati", role: "Keuangan" },
        { heading: "Diketahui Oleh / Acknowledged By", name: "Direktur", role: "Direktur" },
        { heading: "Diterima Oleh / Vendor", name: "CV Contoh Material", role: "Vendor" },
      ],
    },
    DO: {
      title: "DELIVERY ORDER",
      subtitle: "SURAT JALAN",
      number: "DO-CONTOH-2026",
      leftDetails: [
        { label: "No. PO / Kontrak", value: "PO-CONTOH-2026" },
        { label: "Proyek / Site", value: "Pembangunan Gedung Contoh" },
        { label: "Vendor / Tujuan", value: "CV Contoh Material" },
        { label: "No. Tiket", value: "TKT-2026-001" },
      ],
      rightDetails: [
        { label: "Driver / Mover", value: "Andi Saputra" },
        { label: "Plat Kendaraan", value: "BL 1234 AB" },
        { label: "No. Dokumen Kendaraan", value: "STNK-123456" },
        { label: "No. HP Driver", value: "0812 3456 7890" },
        { label: "Penerima", value: "Bambang Gunawan" },
        { label: "Persetujuan Eksekutif", value: "PO disetujui Direksi" },
      ],
      items: [
        { itemCode: "MAT-001", description: "Semen Portland 50 kg", quantity: 40, unit: "sak", remarks: "Kemasan utuh" },
        { itemCode: "MAT-002", description: "Besi beton ulir 10 mm", quantity: 25, unit: "batang", remarks: "Dikirim sesuai pesanan" },
      ],
      summary: undefined,
      terms: undefined,
      notes: "Material diterima dalam kondisi baik.",
      signatures: [
        { heading: "Ditandatangani Oleh / Signed By", name: "Bambang Gunawan", role: "Logistik" },
        { heading: "Diketahui Oleh / Acknowledged By", name: "Siti Rahmawati", role: "Keuangan" },
        { heading: "Diterima Oleh / Received By", name: "Penerima Proyek", role: "Penerima" },
      ],
    },
  } satisfies Record<
    DocumentKind,
    Omit<UniversalDocumentData, "kind" | "date" | "logoDataUrl">
  >;

  return {
    ...examples[kind],
    kind,
    date: "2 November 2026",
    logoDataUrl: "",
  };
}

function documentItems(items: {
  itemCode?: string | null;
  description: string;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  totalPrice?: number | null;
  remarks?: string | null;
}[]): UniversalDocumentItem[] {
  return items.map((item) => ({
    itemCode: item.itemCode,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
    remarks: item.remarks,
  }));
}

async function loadDocument(
  kind: DocumentKind,
  recordId: string,
  publicCode: string,
): Promise<UniversalDocumentData | null> {
  if (kind === "PO") {
    const order = await prisma.purchaseOrder.findUnique({
      where: { publicCode },
      select: {
        poNumber: true,
        vendorName: true,
        paymentMethod: true,
        paymentTerms: true,
        paymentBankName: true,
        paymentAccountNumber: true,
        paymentAccountName: true,
        includeTax: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        reviewedBy: { select: { name: true } },
        approvedBy: { select: { name: true } },
        vendor: {
          select: { address: true, phone: true, email: true },
        },
        project: { select: { kelompokTani: true, location: true } },
        ticket: {
          select: {
            project: { select: { kelompokTani: true, location: true } },
          },
        },
        items: {
          orderBy: { id: "asc" },
          select: {
            itemCode: true,
            itemName: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
      },
    });
    if (!order) return null;
    const subtotal = order.items.reduce((total, item) => total + item.totalPrice, 0);
    const tax = order.includeTax ? Math.round(subtotal * 0.11 * 100) / 100 : 0;
    return {
      kind,
      title: "PURCHASE ORDER",
      subtitle: "PESANAN PEMBELIAN",
      number: order.poNumber,
      date: formatDate(order.createdAt),
      leftDetails: [
        { label: "Kepada / Vendor", value: order.vendorName },
        { label: "Alamat", value: order.vendor?.address ?? "-" },
        { label: "Kontak", value: order.vendor?.email ?? "-" },
        { label: "No. Telepon", value: order.vendor?.phone ?? "-" },
      ],
      rightDetails: [
        { label: "Proyek / Site", value: projectSiteName(
          order.project?.kelompokTani ?? order.ticket?.project?.kelompokTani,
          order.project?.location ?? order.ticket?.project?.location,
        ) },
        { label: "Metode Pembayaran", value: order.paymentMethod },
        ...(order.paymentMethod === "TRANSFER"
          ? [
              { label: "Bank Tujuan", value: order.paymentBankName ?? "-" },
              { label: "No. Rekening", value: order.paymentAccountNumber ?? "-" },
              { label: "Nama Rekening", value: order.paymentAccountName ?? "-" },
            ]
          : []),
        { label: "Syarat Pembayaran", value: order.paymentTerms ?? "-" },
      ],
      items: documentItems(order.items.map((item) => ({
        ...item,
        description: item.itemName,
      }))),
      summary: summary(subtotal, tax),
      terms: [
        "Harap cantumkan nomor PO ini pada semua dokumen pengiriman dan invoice.",
        "Barang harus dikirim sesuai spesifikasi dan tanggal yang disepakati.",
        "Invoice harus disertai Surat Jalan (DO) dan salinan PO ini.",
      ],
      signatures: [
        { heading: "Dibuat Oleh / Prepared By", name: order.createdBy?.name ?? undefined, role: "Logistik" },
        { heading: "Diperiksa Oleh / Checked By", name: order.reviewedBy?.name ?? undefined, role: "Keuangan" },
        { heading: "Disetujui Oleh / Approved By", name: order.approvedBy?.name ?? undefined, role: "Direktur" },
      ],
      logoDataUrl: "",
    };
  }

  if (kind === "DO") {
    const order = await prisma.deliveryOrder.findUnique({
      where: { publicCode },
      select: {
        doNumber: true,
        driverName: true,
        vehicleDocumentNumber: true,
        vehiclePlate: true,
        vehiclePlateNumber: true,
        driverIdentityNumber: true,
        driverPhone: true,
        receiverName: true,
        receivedAt: true,
        createdAt: true,
        createdBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
        publicCode: true,
        signedAt: true,
        signedBy: { select: { name: true } },
        acknowledgedAt: true,
        acknowledgedBy: { select: { name: true } },
        po: {
          select: {
            publicCode: true,
            poNumber: true,
            vendorName: true,
            status: true,
            approvedAt: true,
            approvedBy: { select: { name: true } },
          },
        },
        ticket: {
          select: {
            ticketNumber: true,
            title: true,
            isApprovedByDirector: true,
            auditLogs: {
              where: { action: "APPROVED_BY_DIR" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: {
                createdAt: true,
                user: { select: { name: true } },
              },
            },
            project: { select: { kelompokTani: true, location: true, vendor: true } },
          },
        },
        items: {
          orderBy: { id: "asc" },
          select: {
            itemCode: true,
            itemName: true,
            qtyOrdered: true,
            qtyDelivered: true,
            unit: true,
            remarks: true,
          },
        },
      },
    });
    if (!order) return null;
    const approvalLog = order.ticket?.auditLogs[0];
    const approvalLabel =
      order.po?.status === "APPROVED"
        ? `PO ${order.po.poNumber} disetujui ${order.po.approvedBy?.name ?? "Direksi"} pada ${formatDateTime(order.po.approvedAt)}`
        : order.ticket?.isApprovedByDirector
          ? `Tiket disetujui ${approvalLog?.user.name ?? "Direktur/Wakil Direktur"} pada ${formatDateTime(approvalLog?.createdAt)}`
          : "Persetujuan eksekutif belum tercatat";
    return {
      kind,
      title: "DELIVERY ORDER",
      subtitle: "SURAT JALAN",
      number: order.doNumber,
      date: formatDate(order.createdAt),
      leftDetails: [
        { label: "No. PO / Kontrak", value: order.po?.poNumber ?? "-" },
        { label: "Proyek / Site", value: projectSiteName(
          order.ticket?.project?.kelompokTani,
          order.ticket?.project?.location,
        ) },
        { label: "Vendor / Tujuan", value: order.po?.vendorName ?? order.ticket?.project?.vendor ?? "-" },
        { label: "No. Tiket", value: order.ticket?.ticketNumber ?? "-" },
      ],
      rightDetails: [
        { label: "Driver / Mover", value: order.driverName ?? "-" },
        { label: "Plat Kendaraan", value: order.vehiclePlateNumber ?? order.vehiclePlate ?? "-" },
        { label: "No. Dokumen Kendaraan", value: order.vehicleDocumentNumber ?? "-" },
        { label: "NIK Driver", value: order.driverIdentityNumber ?? "-" },
        { label: "No. HP Driver", value: order.driverPhone ?? "-" },
        { label: "Penerima", value: order.receivedBy?.name ?? order.receiverName ?? "-" },
        { label: "Persetujuan Eksekutif", value: approvalLabel },
      ],
      items: documentItems(order.items.map((item) => ({
        itemCode: item.itemCode,
        description: item.itemName,
        quantity: item.qtyDelivered || item.qtyOrdered,
        unit: item.unit,
        remarks: item.remarks,
      }))),
      notes: [
        order.ticket?.title,
        `Korelasi persetujuan eksekutif: ${approvalLabel}`,
      ]
        .filter(Boolean)
        .join("\n"),
      approvalPublicCode: order.po?.publicCode,
      verificationPublicCode:
        order.signedAt && order.acknowledgedAt ? order.publicCode : null,
      signatures: [
        { heading: "Ditandatangani Oleh / Signed By", name: order.signedBy?.name ?? undefined, role: "Logistik" },
        { heading: "Diketahui Oleh / Acknowledged By", name: order.acknowledgedBy?.name ?? undefined, role: "Keuangan" },
        { heading: "Diterima Oleh / Received By", name: order.receivedBy?.name ?? order.receiverName ?? undefined, role: "Penerima" },
      ],
      logoDataUrl: "",
    };
  }

  if (kind === "INVOICE") {
    const invoice = await prisma.invoice.findUnique({
      where: { id: recordId },
      select: {
        invoiceNumber: true,
        vendorName: true,
        periodOrDate: true,
        paymentMethod: true,
        bankAccount: true,
        subTotal: true,
        tax: true,
        deduction: true,
        grandTotal: true,
        documentUrl: true,
        createdAt: true,
        publicCode: true,
        signedAt: true,
        signedBy: { select: { name: true } },
        acknowledgedAt: true,
        acknowledgedBy: { select: { name: true } },
        project: { select: { kelompokTani: true, location: true } },
        po: { select: { poNumber: true, paymentTerms: true } },
        subkonTermyn: {
          select: {
            termynNumber: true,
            claimedPercent: true,
            subkonContract: {
              select: {
                contractNumber: true,
                project: { select: { kelompokTani: true, location: true } },
              },
            },
          },
        },
        items: {
          orderBy: { id: "asc" },
          select: {
            itemCode: true,
            description: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            totalPrice: true,
          },
        },
      },
    });
    if (!invoice) return null;
    const project = invoice.project ??
      (invoice.subkonTermyn
        ? invoice.subkonTermyn.subkonContract.project
        : null);
    return {
      kind,
      title: "INVOICE PEMBAYARAN",
      subtitle: invoice.subkonTermyn ? "UPAH TUKANG & LANSIR" : "TAGIHAN VENDOR",
      number: invoice.invoiceNumber,
      date: invoice.periodOrDate ?? formatDate(invoice.createdAt),
      verificationPublicCode:
        invoice.signedAt && invoice.acknowledgedAt ? invoice.publicCode : null,
      leftDetails: [
        { label: "Nama Toko / Mandor", value: invoice.vendorName },
        { label: "Proyek / Site", value: projectSiteName(project?.kelompokTani, project?.location) },
        { label: "No. PO / SPK", value: invoice.po?.poNumber ?? invoice.subkonTermyn?.subkonContract.contractNumber ?? "-" },
      ],
      rightDetails: [
        { label: "Metode Pembayaran", value: invoice.paymentMethod ?? "-" },
        { label: "No. Rekening / Bank", value: invoice.bankAccount ?? "-" },
        { label: "Periode / Tanggal", value: invoice.periodOrDate ?? formatDate(invoice.createdAt) },
      ],
      items: documentItems(invoice.items),
      summary: summary(invoice.subTotal, invoice.tax ?? 0, invoice.deduction ?? 0),
      notes: invoice.documentUrl ? `Dokumen invoice vendor: ${invoice.documentUrl}` : undefined,
      signatures: [
        { heading: "Ditandatangani Oleh / Signed By", name: invoice.signedBy?.name ?? undefined, role: "Keuangan" },
        { heading: "Diketahui Oleh / Acknowledged By", name: invoice.acknowledgedBy?.name ?? undefined, role: "Direktur" },
        { heading: "Diterima Oleh / Received By", role: "Vendor / Mandor" },
      ],
      logoDataUrl: "",
    };
  }

  const confirmation = await prisma.orderConfirmation.findFirst({
    where: {
      OR: [{ id: recordId }, { paymentTransactionId: recordId }],
    },
    select: {
      id: true,
      koNumber: true,
      publicCode: true,
      signedAt: true,
      signedBy: { select: { name: true } },
      acknowledgedAt: true,
      acknowledgedBy: { select: { name: true } },
      paymentType: true,
      paymentAmount: true,
      transferDestination: true,
      proofOfTransferUrl: true,
      paidAt: true,
      subTotal: true,
      tax: true,
      grandTotal: true,
      paymentTerms: true,
      paymentTransaction: {
        select: {
          id: true,
          confirmationOrderNumber: true,
          paymentType: true,
          amount: true,
          transferDestination: true,
          proofOfTransferUrl: true,
          paidAt: true,
          po: {
            select: {
              poNumber: true,
              vendorName: true,
              paymentTerms: true,
              items: {
                orderBy: { id: "asc" },
                select: {
                  itemCode: true,
                  itemName: true,
                  quantity: true,
                  unit: true,
                  unitPrice: true,
                  totalPrice: true,
                },
              },
            },
          },
        },
      },
      po: {
        select: {
          poNumber: true,
          vendorName: true,
          paymentTerms: true,
          items: {
            orderBy: { id: "asc" },
            select: {
              itemCode: true,
              itemName: true,
              quantity: true,
              unit: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      },
      items: {
        orderBy: { id: "asc" },
        select: {
          itemCode: true,
          description: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          totalPrice: true,
        },
      },
    },
  });

  if (confirmation) {
    const payment = confirmation.paymentTransaction;
    const po = confirmation.po ?? payment?.po;
    if (!po) return null;
    const paymentType = confirmation.paymentType ?? payment?.paymentType ?? "-";
    const paymentAmount = confirmation.paymentAmount ?? payment?.amount ?? 0;
    const subtotal = confirmation.subTotal;
    const tax = confirmation.tax ?? 0;
    return {
      kind,
      title: "ORDER CONFIRMATION",
      subtitle: "KONFIRMASI ORDER",
      number: confirmation.koNumber,
      date: formatDateTime(confirmation.paidAt ?? payment?.paidAt),
      verificationPublicCode:
        confirmation.signedAt && confirmation.acknowledgedAt
          ? confirmation.publicCode
          : null,
      leftDetails: [
        { label: "Kepada / Vendor", value: po.vendorName },
        { label: "No. PO Pelanggan", value: po.poNumber },
        { label: "Jenis Pembayaran", value: paymentType },
      ],
      rightDetails: [
        { label: "Syarat Pembayaran", value: confirmation.paymentTerms ?? po.paymentTerms ?? "-" },
        { label: "Nominal Dibayar", value: new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(paymentAmount) },
        { label: "Tujuan Transfer", value: confirmation.transferDestination ?? payment?.transferDestination ?? "-" },
      ],
      items: documentItems(confirmation.items.length > 0
        ? confirmation.items
        : po.items.map((item) => ({ ...item, description: item.itemName }))),
      summary: summary(subtotal, tax),
      notes: `Nominal pembayaran transaksi ini: Rp ${paymentAmount.toLocaleString("id-ID")}.`,
      signatures: [
        { heading: "Ditandatangani Oleh / Signed By", name: confirmation.signedBy?.name ?? undefined, role: "Logistik" },
        { heading: "Diketahui Oleh / Acknowledged By", name: confirmation.acknowledgedBy?.name ?? undefined, role: "Keuangan" },
        { heading: "Diterima Oleh / Vendor", role: "Vendor" },
      ],
      logoDataUrl: "",
    };
  }

  const legacyPayment = await prisma.paymentTransaction.findUnique({
    where: { id: recordId },
    select: {
      confirmationOrderNumber: true,
      paymentType: true,
      amount: true,
      transferDestination: true,
      proofOfTransferUrl: true,
      paidAt: true,
      status: true,
      po: {
        select: {
          poNumber: true,
          vendorName: true,
          paymentTerms: true,
          includeTax: true,
          items: {
            orderBy: { id: "asc" },
            select: {
              itemCode: true,
              itemName: true,
              quantity: true,
              unit: true,
              unitPrice: true,
              totalPrice: true,
            },
          },
        },
      },
    },
  });
  if (
    !legacyPayment ||
    legacyPayment.status !== PaymentStatus.PAID ||
    !legacyPayment.confirmationOrderNumber ||
    !legacyPayment.po
  ) {
    return null;
  }
  const subtotal = legacyPayment.po.items.reduce(
    (total, item) => total + item.totalPrice,
    0,
  );
  const tax = legacyPayment.po.includeTax ? subtotal * 0.11 : 0;
  return {
    kind,
    title: "ORDER CONFIRMATION",
    subtitle: "KONFIRMASI ORDER",
    number: legacyPayment.confirmationOrderNumber,
    date: formatDateTime(legacyPayment.paidAt),
    leftDetails: [
      { label: "Kepada / Vendor", value: legacyPayment.po.vendorName },
      { label: "No. PO Pelanggan", value: legacyPayment.po.poNumber },
      { label: "Jenis Pembayaran", value: legacyPayment.paymentType },
    ],
    rightDetails: [
      { label: "Syarat Pembayaran", value: legacyPayment.po.paymentTerms ?? "-" },
      { label: "Nominal Dibayar", value: `Rp ${legacyPayment.amount.toLocaleString("id-ID")}` },
      { label: "Tujuan Transfer", value: legacyPayment.transferDestination },
    ],
    items: documentItems(legacyPayment.po.items.map((item) => ({
      ...item,
      description: item.itemName,
    }))),
    summary: summary(subtotal, tax),
    notes: `Nominal pembayaran transaksi ini: Rp ${legacyPayment.amount.toLocaleString("id-ID")}.`,
    signatures: [
      { heading: "Ditandatangani Oleh / Signed By", role: "Logistik" },
      { heading: "Diketahui Oleh / Acknowledged By", role: "Keuangan" },
      { heading: "Diterima Oleh / Vendor", role: "Vendor" },
    ],
    logoDataUrl: "",
  };
}

export async function GET(request: NextRequest) {
  const kindParam = request.nextUrl.searchParams.get("kind") ?? "";
  const kind = ["PO", "INVOICE", "KO", "DO"].includes(kindParam)
    ? (kindParam as DocumentKind)
    : null;
  const recordId = request.nextUrl.searchParams.get("id") ?? "";
  const publicCode = request.nextUrl.searchParams.get("publicCode") ?? "";
  const previewOnly = request.nextUrl.searchParams.get("preview") === "1";
  if (
    !kind ||
    (!previewOnly && (kind === "PO" || kind === "DO" ? !publicCode : !recordId))
  ) {
    return NextResponse.json({ message: "Jenis atau nomor dokumen tidak valid." }, { status: 400 });
  }

  if (previewOnly || kind === "INVOICE" || kind === "KO") {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ message: "Silakan masuk untuk mencetak dokumen." }, { status: 401 });
    }
    if (
      previewOnly
        ? !allowedPreviewRoles.includes(session.user.role)
        : !allowedPrivateRoles.includes(session.user.role)
    ) {
      return NextResponse.json({ message: "Anda tidak memiliki akses mencetak dokumen ini." }, { status: 403 });
    }
  }

  try {
    const document = previewOnly
      ? sampleDocument(kind)
      : await loadDocument(kind, recordId, publicCode);
    if (!document) {
      return NextResponse.json({ message: "Dokumen tidak ditemukan." }, { status: 404 });
    }
    const verificationCode =
      kind === "PO" ? publicCode : document.verificationPublicCode;
    const verificationPath = verificationCode
      ? `/verify/${kind.toLowerCase()}/${encodeURIComponent(verificationCode)}`
      : null;
    const [logoDataUrl, qrDataUrl, approvalQrDataUrl] = await Promise.all([
      getDocumentHeaderLogoDataUrl(),
      verificationPath && resolvePublicAppUrl()
        ? createBrandedQrDataUrl(
            new URL(verificationPath, resolvePublicAppUrl()!).toString(),
            260,
          )
        : Promise.resolve(null),
      kind === "DO" &&
      document.approvalPublicCode &&
      resolvePublicAppUrl()
        ? createBrandedQrDataUrl(
            new URL(
              `/verify/po/${encodeURIComponent(document.approvalPublicCode)}`,
              resolvePublicAppUrl()!,
            ).toString(),
            240,
          )
        : Promise.resolve(null),
    ]);
    document.logoDataUrl = logoDataUrl;
    document.qrDataUrl = qrDataUrl;
    document.approvalQrDataUrl = approvalQrDataUrl;
    delete document.approvalPublicCode;
    const documentHtml = renderUniversalTransactionDocument(document);
    if (previewOnly) {
      return new NextResponse(documentHtml, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const pdf = await renderPdf(documentHtml);
    const disposition =
      request.nextUrl.searchParams.get("download") === "1"
        ? "attachment"
        : "inline";
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(document.number)}.pdf"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Universal transaction document rendering failed:", error);
    return NextResponse.json(
      { message: "Dokumen gagal dibuat. Silakan coba kembali." },
      { status: 500 },
    );
  }
}
