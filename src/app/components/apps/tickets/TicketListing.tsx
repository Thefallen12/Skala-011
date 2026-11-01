"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { Download, Eye, FileText, Printer } from "lucide-react";
import {
  checkTicketItemsStock,
  approveByDirector,
  fulfillTicketItemsFromStock,
  switchTicketItemsToPurchase,
  submitTicket,
  type TicketActionResult,
} from "@/app/actions/tickets";
import CreatePOForm from "@/app/components/forms/CreatePOForm";
import ExpeditionArrivalModal from "@/app/components/apps/tickets/ExpeditionArrivalModal";
import type {
  TicketPageRole,
  TicketProjectOption,
  TicketRow,
} from "@/app/(DashboardLayout)/types/ticket";
import type { VehicleSummary } from "@/app/actions/vehicles";
import {
  FulfillmentStatus,
  DOStatus,
  PaymentType,
  TicketStatus,
  TicketType,
  UserRole,
} from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import FinanceActionModal from "./FinanceActionModal";
import LogisticsActionModal from "./LogisticsActionModal";
import MoverActionModal from "./MoverActionModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const statusLabels: Record<TicketStatus, string> = {
  DRAFT: "Draft",
  PENDING_DIRECTOR: "Menunggu Direktur",
  APPROVED_DIR: "Disetujui Direktur",
  PROCESSED_FINANCE: "Diproses Keuangan",
  PROCESSED_LOGISTIC: "Diproses Logistik",
  ASSIGNED_TO_MOVER: "Ditugaskan ke Mover",
  IN_TRANSIT: "Dalam perjalanan (ekspedisi)",
  WAITING_FINANCE_PAYMENT: "Menunggu Pembayaran",
  COMPLETED: "Selesai",
  REJECTED: "Ditolak",
};

const statusVariants: Record<
  TicketStatus,
  "gray" | "lightWarning" | "lightSuccess" | "lightInfo" | "lightError"
> = {
  DRAFT: "gray",
  PENDING_DIRECTOR: "lightWarning",
  APPROVED_DIR: "lightSuccess",
  PROCESSED_FINANCE: "lightInfo",
  PROCESSED_LOGISTIC: "lightInfo",
  ASSIGNED_TO_MOVER: "lightWarning",
  IN_TRANSIT: "lightInfo",
  WAITING_FINANCE_PAYMENT: "lightWarning",
  COMPLETED: "lightSuccess",
  REJECTED: "lightError",
};

const typeLabels = {
  MATERIAL: "Material",
  COST: "Biaya",
  OPERATIONAL: "Operasional",
} as const;

const priorityLabels = {
  LOW: "Rendah",
  MEDIUM: "Sedang",
  HIGH: "Tinggi",
  URGENT: "Mendesak",
} as const;

const auditActionLabels: Record<string, string> = {
  CREATED: "Draft dibuat",
  SUBMITTED: "Diajukan ke Direktur",
  APPROVED_BY_DIR: "Disetujui Direktur",
  LOGISTICS_READY_WAREHOUSE: "Stok gudang siap; ditugaskan ke Mover",
  LOGISTICS_SWITCHED_TO_PURCHASE: "Dialihkan ke pengadaan baru",
  LOGISTICS_BUY_STORE: "Dibeli di toko; diteruskan ke Keuangan",
  LOGISTICS_PO_CREATED: "PO dibuat; menunggu persetujuan",
  LOGISTICS_DIRECT_PURCHASE_CREATED: "Pembelian langsung ditautkan",
  DOCUMENT_ISSUED: "Dokumen PO/DO diterbitkan",
  FINANCE_PAYMENT_COMPLETED: "Pembayaran diselesaikan",
  MOVER_DELIVERY_COMPLETED: "Barang diterima di lapangan",
  COMPLETED: "Pemrosesan selesai",
};

const formatCurrency = (amount: string | null) =>
  amount === null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(Number(amount));

const warehouseInsufficientMessage =
  "Stok gudang tidak mencukupi untuk memenuhi permintaan ini.";

type DirectAction = {
  label: string;
  run: (ticket: TicketRow) => Promise<TicketActionResult>;
};

function actionFor(
  role: TicketPageRole,
  ticket: TicketRow,
): DirectAction | null {
  if (
    role === UserRole.DIRECTOR &&
    ticket.status === TicketStatus.PENDING_DIRECTOR
  ) {
    return {
      label: "Setujui",
      run: (currentTicket) =>
        approveByDirector(currentTicket.id, currentTicket.type),
    };
  }
  return null;
}

function workflowFor(
  role: TicketPageRole,
  ticket: TicketRow,
): "LOGISTICS" | "EXPEDITION_RECEIPT" | "FINANCE" | "MOVER" | null {
  if (
    role === UserRole.LOGISTICS &&
    ticket.type === TicketType.MATERIAL &&
    ticket.status === TicketStatus.IN_TRANSIT &&
    ticket.deliveryOrders?.some(
      (deliveryOrder) => deliveryOrder.status === DOStatus.IN_TRANSIT,
    )
  ) {
    return "EXPEDITION_RECEIPT";
  }
  if (
    role === UserRole.LOGISTICS &&
    ticket.type === TicketType.MATERIAL &&
    ticket.status === TicketStatus.PROCESSED_LOGISTIC &&
    ticket.fulfillmentStatus === "COMPLETED" &&
    ticket.purchaseOrders?.some((purchaseOrder) => purchaseOrder.paidAt) &&
    ticket.deliveryOrders?.length === 0
  ) {
    return "LOGISTICS";
  }
  if (
    role === UserRole.FINANCE &&
    (ticket.status === TicketStatus.WAITING_FINANCE_PAYMENT ||
      ticket.status === TicketStatus.PROCESSED_FINANCE)
  ) {
    return "FINANCE";
  }
  if (
    role === UserRole.MOVER &&
    ticket.status === TicketStatus.ASSIGNED_TO_MOVER
  ) {
    return "MOVER";
  }
  return null;
}

type TicketVendorOption = {
  id: string;
  name: string;
  bankName: string | null;
  bankAccount: string | null;
  bankHolder: string | null;
};

type TicketStockItemOption = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitPrice: string;
};

export default function TicketListing({
  tickets,
  projects,
  vendors = [],
  stockItems = [],
  vehicles = [],
  role,
  ticketSearch,
  searchTickets,
  hideSearch = false,
  initialOpenSheet,
}: {
  tickets: TicketRow[];
  projects: TicketProjectOption[];
  vendors?: TicketVendorOption[];
  stockItems?: TicketStockItemOption[];
  vehicles?: VehicleSummary[];
  role: TicketPageRole;
  ticketSearch: string;
  searchTickets: (term: string) => void;
  hideSearch?: boolean;
  initialOpenSheet?: string;
}) {
  const [selectedTicket, setSelectedTicket] = useState<TicketRow | null>(
    () => tickets.find((ticket) => ticket.id === initialOpenSheet) ?? null,
  );
  const [itemSelection, setItemSelection] = useState<{
    ticketId: string;
    itemIds: string[];
  } | null>(null);
  const [doDialogOpen, setDoDialogOpen] = useState(false);
  const [stockFallbackRequired, setStockFallbackRequired] = useState(false);
  const [moverOptions, setMoverOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [vehicleOptions, setVehicleOptions] = useState<
    {
      id: string;
      plateNumber: string;
      vehicleType: string;
      brand: string | null;
      modelName: string | null;
    }[]
  >([]);
  const [selectedMoverId, setSelectedMoverId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [fulfillmentPending, setFulfillmentPending] = useState(false);
  const [fulfillmentMessage, setFulfillmentMessage] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<{
    label: string;
    url: string;
  } | null>(null);
  const [workflowTicket, setWorkflowTicket] = useState<TicketRow | null>(null);
  const [message, setMessage] = useState("");
  const [printMessage, setPrintMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedItemIds =
    selectedTicket && itemSelection?.ticketId === selectedTicket.id
      ? itemSelection.itemIds
      : [];

  const selectedTicketItems = selectedTicket
    ? selectedTicket.items.filter(
        (item) =>
          selectedItemIds.includes(item.id) &&
          item.status === FulfillmentStatus.PENDING,
      )
    : [];
  const selectedWarehouseItems = selectedTicketItems.filter(
    (item) => item.categoryHint === "WAREHOUSE",
  );
  const canSplitFulfillment =
    role === UserRole.LOGISTICS &&
    selectedTicket?.type === TicketType.MATERIAL &&
    selectedTicket.status === TicketStatus.PROCESSED_LOGISTIC;

  const openTicketSheet = (ticket: TicketRow) => {
    setItemSelection(null);
    setFulfillmentMessage("");
    setSelectedMoverId("");
    setSelectedTicket(ticket);
  };

  const closeTicketSheet = () => {
    setSelectedTicket(null);
    setItemSelection(null);
    setFulfillmentMessage("");
    if (initialOpenSheet) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("openSheet");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }
  };

  const fulfillSelectedItemsFromStock = async () => {
    if (!selectedTicket || selectedWarehouseItems.length === 0) return;
    if (!selectedMoverId || !selectedVehicleId) {
      setFulfillmentMessage("Pilih Mover dan kendaraan sebelum membuat DO.");
      return;
    }
    setFulfillmentPending(true);
    setFulfillmentMessage("");
    try {
      const result = await fulfillTicketItemsFromStock(
        selectedTicket.id,
        selectedWarehouseItems.map((item) => item.id),
        selectedMoverId,
        selectedVehicleId,
      );
      setFulfillmentMessage(result.message);
      if (result.success) {
        setDoDialogOpen(false);
        setStockFallbackRequired(false);
        setSelectedTicket(null);
        setItemSelection(null);
        router.refresh();
      } else if (result.fallbackRequired) {
        setStockFallbackRequired(true);
        setFulfillmentMessage(warehouseInsufficientMessage);
      }
    } catch (error) {
      console.error("Ticket stock fulfillment failed:", error);
      setFulfillmentMessage(
        "Pemenuhan stok gagal. Muat ulang tiket lalu coba kembali.",
      );
    } finally {
      setFulfillmentPending(false);
    }
  };

  const prepareWarehouseFulfillment = async () => {
    if (!selectedTicket || selectedWarehouseItems.length === 0) return;
    setFulfillmentPending(true);
    setFulfillmentMessage("");
    setStockFallbackRequired(false);
    setMoverOptions([]);
    setVehicleOptions([]);
    setSelectedMoverId("");
    setSelectedVehicleId("");
    try {
      const result = await checkTicketItemsStock(
        selectedTicket.id,
        selectedWarehouseItems.map((item) => item.id),
      );
      if (result.fallbackRequired) {
        setStockFallbackRequired(true);
        setFulfillmentMessage(warehouseInsufficientMessage);
        setDoDialogOpen(true);
      } else if (!result.success) {
        setFulfillmentMessage(result.message);
        setDoDialogOpen(true);
      } else {
        setMoverOptions(result.movers ?? []);
        setVehicleOptions(result.vehicles ?? []);
        setSelectedVehicleId(result.vehicles?.[0]?.id ?? "");
        setSelectedMoverId(
          result.movers?.some((mover) => mover.id === result.moverAssigneeId)
            ? result.moverAssigneeId ?? ""
            : "",
        );
        setDoDialogOpen(true);
      }
    } catch (error) {
      console.error("Ticket stock availability check failed:", error);
      setFulfillmentMessage("Saldo gudang gagal diperiksa. Silakan coba kembali.");
      setDoDialogOpen(true);
    } finally {
      setFulfillmentPending(false);
    }
  };

  const switchSelectedItemsToPurchase = async () => {
    if (!selectedTicket || selectedWarehouseItems.length === 0) return;
    const ticketId = selectedTicket.id;
    const itemIds = selectedWarehouseItems.map((item) => item.id);
    setFulfillmentPending(true);
    setFulfillmentMessage("");
    try {
      const result = await switchTicketItemsToPurchase(ticketId, itemIds);
      setFulfillmentMessage(result.message);
      if (result.success) {
        setSelectedTicket((current) =>
          current?.id === ticketId
            ? {
                ...current,
                items: current.items.map((item) =>
                  itemIds.includes(item.id)
                    ? { ...item, categoryHint: "PURCHASE" }
                    : item,
                ),
              }
            : current,
        );
        setStockFallbackRequired(false);
        setDoDialogOpen(false);
        setPoDialogOpen(true);
        router.refresh();
      } else {
        setStockFallbackRequired(false);
      }
    } catch (error) {
      console.error("Ticket item procurement fallback failed:", error);
      setFulfillmentMessage(
        "Item gagal dialihkan ke pengadaan baru. Silakan coba kembali.",
      );
    } finally {
      setFulfillmentPending(false);
    }
  };

  const runAction = (
    ticket: TicketRow,
    action: ReturnType<typeof actionFor>,
  ) => {
    if (!action) return;
    setBusyId(ticket.id);
    setMessage("");
    startTransition(async () => {
      try {
        const result = await action.run(ticket);
        setMessage(result.message);
        if (result.success) {
          setSelectedTicket(null);
          setItemSelection(null);
          router.refresh();
        }
      } catch (error) {
        console.error("Ticket workflow action failed:", error);
        setMessage("Aksi tiket gagal. Silakan muat ulang dan coba kembali.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const printPurchaseOrder = async (ticketId: string) => {
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) {
      setPrintMessage("Izinkan pop-up browser untuk membuka PDF PO.");
      return;
    }
    setPrintMessage("Menyiapkan PDF Purchase Order...");
    try {
      const response = await fetch("/api/documents/po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      if (!response.ok) {
        const body: unknown = await response.json();
        const errorMessage =
          typeof body === "object" &&
          body !== null &&
          "message" in body &&
          typeof body.message === "string"
            ? body.message
            : "PDF PO gagal dibuat.";
        pdfWindow.close();
        setPrintMessage(errorMessage);
        return;
      }
      const pdfUrl = URL.createObjectURL(await response.blob());
      pdfWindow.location.href = pdfUrl;
      window.setTimeout(() => URL.revokeObjectURL(pdfUrl), 60_000);
      setPrintMessage("");
    } catch (error) {
      console.error("Purchase order PDF download failed:", error);
      pdfWindow.close();
      setPrintMessage("PDF PO gagal dibuat. Silakan coba kembali.");
    }
  };

  return (
    <div className="my-6">
      {!hideSearch && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-full sm:max-w-72">
            <Icon
              icon="tabler:search"
              height={18}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              type="search"
              className="pl-8"
              value={ticketSearch}
              onChange={(event) => searchTickets(event.target.value)}
              placeholder="Cari tiket"
              aria-label="Cari tiket"
            />
          </div>
        </div>
      )}

      {message && (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nomor tiket</TableHead>
              <TableHead>Permintaan</TableHead>
              <TableHead>Pemohon</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Estimasi</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow
                key={ticket.id}
                tabIndex={0}
                className="cursor-pointer"
                onClick={() => openTicketSheet(ticket)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openTicketSheet(ticket);
                  }
                }}
              >
                <TableCell className="min-w-40 whitespace-nowrap font-medium">
                  {ticket.ticketNumber}
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {format(new Date(ticket.createdAt), "d MMM yyyy, HH:mm", {
                      locale: id,
                    })}
                  </span>
                </TableCell>
                <TableCell className="min-w-52">
                  <p className="font-medium">{ticket.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {typeLabels[ticket.type]}
                    {ticket.project
                      ? ` · ${ticket.project.kelompokTani} - ${ticket.project.title}`
                      : ""}
                  </p>
                </TableCell>
                <TableCell>{ticket.requester.name}</TableCell>
                <TableCell>{priorityLabels[ticket.priority]}</TableCell>
                <TableCell>
                  <Badge variant={statusVariants[ticket.status]}>
                    {statusLabels[ticket.status]}
                  </Badge>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatCurrency(ticket.totalAmount)}
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  {(() => {
                    const action = actionFor(role, ticket);
                    const workflow = workflowFor(role, ticket);
                    const canSubmit =
                      ticket.status === TicketStatus.DRAFT && ticket.canSubmit;
                    const visibleAction =
                      action ??
                      (canSubmit
                        ? {
                            label: "Ajukan",
                            run: (currentTicket: TicketRow) =>
                              submitTicket(currentTicket.id),
                          }
                        : null);
                    if (workflow) {
                      const labels = {
                        LOGISTICS: ticket.deliveryOrders?.length
                          ? "Lanjutkan DO"
                          : "Proses Logistik",
                        EXPEDITION_RECEIPT: "Terima & Selesaikan",
                        FINANCE: "Selesaikan",
                        MOVER: "Konfirmasi Tiba",
                      };
                      return (
                        <Button
                          size="sm"
                          onClick={() => setWorkflowTicket(ticket)}
                        >
                          {labels[workflow]}
                        </Button>
                      );
                    }
                    if (
                      role === UserRole.LOGISTICS &&
                      ticket.type === TicketType.MATERIAL &&
                      ticket.status === TicketStatus.PROCESSED_LOGISTIC &&
                      ticket.items.some(
                        (item) => item.status === FulfillmentStatus.PENDING,
                      )
                    ) {
                      return (
                        <Button
                          size="sm"
                          onClick={() => openTicketSheet(ticket)}
                        >
                          Proses Item
                        </Button>
                      );
                    }
                    return visibleAction ? (
                      <Button
                        size="sm"
                        disabled={isPending && busyId === ticket.id}
                        onClick={() => runAction(ticket, visibleAction)}
                      >
                        {isPending && busyId === ticket.id
                          ? "Memproses..."
                          : visibleAction.label}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openTicketSheet(ticket)}
                      >
                        Detail
                      </Button>
                    );
                  })()}
                </TableCell>
              </TableRow>
            ))}
            {tickets.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  Tidak ada tiket untuk ditampilkan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Sheet
        open={selectedTicket !== null}
        onOpenChange={(open) => {
          if (!open) closeTicketSheet();
        }}
      >
        <SheetContent className="w-[min(42rem,calc(100vw-1rem))] overflow-y-auto p-6">
          {selectedTicket && (
            <>
              <SheetHeader className="pr-8 text-left">
                <SheetTitle>
                  {selectedTicket.ticketNumber} · {selectedTicket.title}
                </SheetTitle>
                <SheetDescription>
                  {typeLabels[selectedTicket.type]} ·{" "}
                  {statusLabels[selectedTicket.status]} · Prioritas{" "}
                  {priorityLabels[selectedTicket.priority]} · Pemenuhan{" "}
                  {selectedTicket.fulfillmentStatus === "COMPLETED"
                    ? "Selesai"
                    : selectedTicket.fulfillmentStatus ===
                        "PARTIALLY_FULFILLED"
                      ? "Sebagian"
                      : "Menunggu"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <section className="space-y-2">
                  <h3 className="font-semibold">Ringkasan</h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {selectedTicket.description || "Tidak ada deskripsi."}
                  </p>
                  <p className="text-sm">
                    Pemohon: {selectedTicket.requester.name}
                  </p>
                  <p className="text-sm">
                    Tanggal &amp; waktu request:{" "}
                    {format(
                      new Date(selectedTicket.createdAt),
                      "d MMMM yyyy, HH:mm",
                      { locale: id },
                    )}
                  </p>
                  <p className="text-sm">
                    Proyek: {selectedTicket.project
                      ? `${selectedTicket.project.kelompokTani} - ${selectedTicket.project.title}`
                      : "Tidak ditentukan"}
                  </p>
                  <p className="text-sm">
                    Total estimasi: {formatCurrency(selectedTicket.totalAmount)}
                  </p>
                  {(selectedTicket.directStockPurchases?.length ?? 0) > 0 && (
                    <div className="space-y-2 rounded-md border p-3">
                      <h4 className="font-semibold">Pembelian Langsung Terkait</h4>
                      {selectedTicket.directStockPurchases!.map((purchase) => (
                        <div
                          key={purchase.id}
                          className="flex flex-wrap items-center justify-between gap-3 border-t pt-2 first:border-0 first:pt-0"
                        >
                          <div>
                            <p className="font-medium">
                              {purchase.purchaseNumber} · {purchase.vendorName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {format(
                                new Date(purchase.createdAt),
                                "d MMM yyyy, HH:mm",
                                { locale: id },
                              )}{" "}
                              · {formatCurrency(purchase.totalAmount)}
                            </p>
                          </div>
                          <Badge
                            variant={
                              purchase.status === "RECEIVED"
                                ? "lightSuccess"
                                : "lightWarning"
                            }
                          >
                            {purchase.status === "RECEIVED"
                              ? "Diterima"
                              : purchase.isApprovedByDirector
                                ? "Dalam proses"
                                : "Menunggu Direktur"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedTicket.type === TicketType.MATERIAL &&
                    (role === UserRole.LOGISTICS ||
                      role === UserRole.DIRECTOR ||
                      role === UserRole.ADMINISTRATIONS) && (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => printPurchaseOrder(selectedTicket.id)}
                        >
                          <Printer className="mr-2 h-4 w-4" />
                          Cetak PO
                        </Button>
                        {printMessage && (
                          <p className="text-sm text-muted-foreground" role="status">
                            {printMessage}
                          </p>
                        )}
                      </div>
                    )}
                  {selectedTicket.deliveryOrders?.map((deliveryOrder) => (
                    <div
                      key={deliveryOrder.publicCode}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                    >
                      <div>
                        <h4 className="font-semibold">Surat Jalan</h4>
                        <p className="text-sm text-muted-foreground">
                          DO {deliveryOrder.doNumber}
                        </p>
                      </div>
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href={`/d/${deliveryOrder.publicCode}`}>
                          Buka / cetak DO
                        </Link>
                      </Button>
                    </div>
                  ))}
                  {selectedTicket.recipientName && (
                    <div className="rounded-md border p-3 text-sm">
                      <h4 className="mb-2 font-semibold">Tujuan Pembayaran</h4>
                      <p>Nama penerima: {selectedTicket.recipientName}</p>
                      <p>Bank: {selectedTicket.bankName || "—"}</p>
                      <p>Nomor rekening: {selectedTicket.accountNumber || "—"}</p>
                    </div>
                  )}
                  {(selectedTicket.paymentTransactions?.length ?? 0) > 0 && (
                    <div className="space-y-2 rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h4 className="font-semibold">Riwayat Pembayaran</h4>
                        {(() => {
                          const paid = selectedTicket.paymentTransactions!.reduce(
                            (sum, payment) => sum + payment.amount,
                            0,
                          );
                          const remaining = Math.max(
                            0,
                            Number(selectedTicket.totalAmount ?? 0) - paid,
                          );
                          return (
                            <Badge variant={remaining < 0.005 ? "success" : "warning"}>
                              {remaining < 0.005 ? "LUNAS" : "SEBAGIAN / DP"}
                            </Badge>
                          );
                        })()}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[480px] text-left text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="py-2 pr-3">Tanggal</th>
                              <th className="py-2 pr-3">Tipe</th>
                              <th className="py-2 pr-3">Jumlah</th>
                              <th className="py-2 pr-3">Tujuan Transfer</th>
                              <th className="py-2">Bukti</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedTicket.paymentTransactions!.map((payment) => (
                              <tr key={payment.id} className="border-b last:border-0">
                                <td className="py-2 pr-3">
                                  {payment.paidAt
                                    ? new Date(payment.paidAt).toLocaleDateString("id-ID")
                                    : "—"}
                                </td>
                                <td className="py-2 pr-3">
                                  {payment.paymentType === PaymentType.DOWN_PAYMENT
                                    ? "DP"
                                    : payment.paymentType === PaymentType.PROGRESS_PAYMENT
                                      ? "Termin"
                                      : "Pelunasan"}
                                </td>
                                <td className="py-2 pr-3">
                                  {formatCurrency(String(payment.amount))}
                                </td>
                                <td className="py-2 pr-3">{payment.transferDestination}</td>
                                <td className="py-2">
                                  {payment.proofOfTransferUrl ? (
                                    <a
                                      href={payment.proofOfTransferUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="text-primary underline"
                                    >
                                      Lihat
                                    </a>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {selectedTicket.attachmentUrl && (
                    <a
                      href={selectedTicket.attachmentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary underline"
                    >
                      Buka lampiran / quotation
                    </a>
                  )}
                  {[
                    ["Bukti pembelian", selectedTicket.purchaseReceiptUrl],
                    ["Bukti transfer", selectedTicket.transferReceiptUrl],
                    ["Bukti pengiriman", selectedTicket.deliveryReceiptUrl],
                  ]
                    .filter((receipt): receipt is [string, string] =>
                      Boolean(receipt[1]),
                    )
                    .map(([label, url]) => (
                      <Button
                        key={url}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mr-2"
                        onClick={() => setSelectedReceipt({ label, url })}
                      >
                        <Eye aria-hidden="true" />
                        Lihat {label}
                      </Button>
                    ))}
                </section>

                <section className="space-y-3">
                  <h3 className="font-semibold">Rincian item</h3>
                  {canSplitFulfillment && (
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm text-muted-foreground">
                        Pilih item untuk dipenuhi dari stok atau dibelikan lewat PO.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            selectedWarehouseItems.length === 0 ||
                            fulfillmentPending
                          }
                          onClick={prepareWarehouseFulfillment}
                        >
                          Penuhi dari Stok (DO)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={
                            selectedTicketItems.length === 0 ||
                            fulfillmentPending
                          }
                          onClick={() => {
                            setFulfillmentMessage("");
                            setPoDialogOpen(true);
                          }}
                        >
                          Beli via Vendor (PO)
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {canSplitFulfillment && (
                            <TableHead className="w-10">Pilih</TableHead>
                          )}
                          <TableHead>Item</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Harga satuan</TableHead>
                          <TableHead>Sumber</TableHead>
                          <TableHead>Tanggal diperlukan</TableHead>
                          <TableHead>Status pemenuhan</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTicket.items.map((item) => (
                          <TableRow key={item.id}>
                            {canSplitFulfillment && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedItemIds.includes(item.id)}
                                  disabled={
                                    item.status !== FulfillmentStatus.PENDING
                                  }
                                  aria-label={`Pilih ${item.itemName}`}
                                  onCheckedChange={(checked) =>
                                    setItemSelection({
                                      ticketId: selectedTicket.id,
                                      itemIds:
                                        checked === true
                                          ? [...selectedItemIds, item.id]
                                          : selectedItemIds.filter(
                                              (id) => id !== item.id,
                                            ),
                                    })
                                  }
                                />
                              </TableCell>
                            )}
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell>
                              {item.quantity} {item.unit}
                            </TableCell>
                            <TableCell>
                              {formatCurrency(item.estimatedCost)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {item.categoryHint === "WAREHOUSE"
                                  ? "Gudang"
                                  : "Pembelian"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {item.expectedDeliveryDate ?? "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  item.status === FulfillmentStatus.PENDING
                                    ? "lightWarning"
                                    : "lightSuccess"
                                }
                              >
                                {item.status === FulfillmentStatus.PENDING
                                  ? "Menunggu"
                                  : item.status ===
                                      FulfillmentStatus.PROCESSED_TO_DO
                                    ? "Dipenuhi via DO"
                                    : "Diproses via PO"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="font-semibold">Aktivitas</h3>
                  <ol className="space-y-4 border-l pl-4">
                    {selectedTicket.auditLogs.map((log) => (
                      <li key={log.id} className="relative">
                        <span className="absolute -left-[1.35rem] top-1.5 h-2 w-2 rounded-full bg-primary" />
                        <p className="font-medium">
                          {auditActionLabels[log.action] ?? log.action}
                        </p>
                        {log.notes && (
                          <p className="text-sm text-muted-foreground">
                            {log.notes}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {log.user.name} ·{" "}
                          {format(new Date(log.createdAt), "d MMM yyyy, HH:mm", {
                            locale: id,
                          })}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>

                {(() => {
                  const action =
                    actionFor(role, selectedTicket) ??
                    (selectedTicket.status === TicketStatus.DRAFT &&
                    selectedTicket.canSubmit
                      ? {
                          label: "Ajukan",
                          run: (currentTicket: TicketRow) =>
                            submitTicket(currentTicket.id),
                        }
                      : null);
                  const workflow = workflowFor(role, selectedTicket);
                  if (workflow) {
                    const labels = {
                      LOGISTICS: "Lanjutkan DO",
                      EXPEDITION_RECEIPT: "Terima & Selesaikan",
                      FINANCE: "Selesaikan",
                      MOVER: "Konfirmasi Tiba",
                    };
                    return (
                      <Button
                        onClick={() => {
                          setSelectedTicket(null);
                          setItemSelection(null);
                          setWorkflowTicket(selectedTicket);
                        }}
                      >
                        {labels[workflow]}
                      </Button>
                    );
                  }
                  return action ? (
                    <Button
                      disabled={isPending}
                      onClick={() => runAction(selectedTicket, action)}
                    >
                      {isPending ? "Memproses..." : action.label}
                    </Button>
                  ) : null;
                })()}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={doDialogOpen}
        onOpenChange={(open) => {
          setDoDialogOpen(open);
          if (!open) {
            setFulfillmentMessage("");
            setStockFallbackRequired(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi pemenuhan dari stok</DialogTitle>
            <DialogDescription>
              {stockFallbackRequired
                ? warehouseInsufficientMessage
                : fulfillmentMessage
                  ? "Periksa kembali saldo atau data sebelum membuat DO."
                  : "Saldo gudang sudah diperiksa. Buat DO hanya untuk item yang dipilih; stok berkurang setelah DO berhasil dibuat."}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 rounded-md border p-3 text-sm">
            {selectedWarehouseItems.map((item) => (
              <li key={item.id}>
                {item.itemName} · {item.quantity} {item.unit}
              </li>
            ))}
          </ul>
          {!stockFallbackRequired && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Mover untuk pengiriman</span>
                <select
                  value={selectedMoverId}
                  onChange={(event) => setSelectedMoverId(event.target.value)}
                  disabled={fulfillmentPending || moverOptions.length === 0}
                  className="h-10 w-full rounded-md border border-input bg-background px-3"
                  required
                >
                  <option value="">Pilih Mover</option>
                  {moverOptions.map((mover) => (
                    <option key={mover.id} value={mover.id}>
                      {mover.name}
                    </option>
                  ))}
                </select>
                {moverOptions.length === 0 && (
                  <span className="block text-xs text-destructive" role="alert">
                    Belum ada Mover aktif yang dapat ditugaskan.
                  </span>
                )}
              </label>
              <label className="space-y-1.5 text-sm">
                <span className="font-medium">Kendaraan (ditetapkan Logistik)</span>
                <select
                  value={selectedVehicleId}
                  onChange={(event) => setSelectedVehicleId(event.target.value)}
                  disabled={fulfillmentPending || vehicleOptions.length === 0}
                  className="h-10 w-full rounded-md border border-input bg-background px-3"
                  required
                >
                  <option value="">Pilih kendaraan</option>
                  {vehicleOptions.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plateNumber} · {vehicle.vehicleType}
                      {vehicle.brand ? ` · ${vehicle.brand}` : ""}
                      {vehicle.modelName ? ` · ${vehicle.modelName}` : ""}
                    </option>
                  ))}
                </select>
                {vehicleOptions.length === 0 && (
                  <span className="block text-xs text-destructive" role="alert">
                    Tidak ada kendaraan tersedia dengan KM awal yang sudah disiapkan.
                  </span>
                )}
              </label>
            </div>
          )}
          {fulfillmentMessage && !stockFallbackRequired && (
            <p className="text-sm text-destructive" role="alert">
              {fulfillmentMessage}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDoDialogOpen(false)}
              disabled={fulfillmentPending}
            >
              {stockFallbackRequired ? "Batalkan" : "Batal"}
            </Button>
            {stockFallbackRequired ? (
              <Button
                type="button"
                onClick={switchSelectedItemsToPurchase}
                disabled={fulfillmentPending || selectedWarehouseItems.length === 0}
              >
                {fulfillmentPending
                  ? "Memproses..."
                  : "Alihkan ke Pengadaan Baru (Beli Baru)"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={fulfillSelectedItemsFromStock}
                disabled={
                  fulfillmentPending ||
                  selectedWarehouseItems.length === 0 ||
                  !selectedMoverId ||
                  !selectedVehicleId
                }
              >
                {fulfillmentPending ? "Memproses..." : "Buat DO"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={poDialogOpen}
        onOpenChange={(open) => {
          setPoDialogOpen(open);
          if (!open) setFulfillmentMessage("");
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Beli item melalui vendor (PO)</DialogTitle>
            <DialogDescription>
              Item yang dipilih akan diprefill ke PO. Setelah PO tersimpan,
              item terkait ditandai sebagai diproses via PO.
            </DialogDescription>
          </DialogHeader>
          {selectedTicket && selectedTicketItems.length > 0 && (
            <CreatePOForm
              key={`${selectedTicket.id}:${selectedTicketItems
                .map((item) => item.id)
                .join(",")}`}
              vendors={vendors}
              stockItems={stockItems}
              ticketId={selectedTicket.id}
              ticketItems={selectedTicketItems.map((item) => ({
                ticketItemId: item.id,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
              }))}
              projectSiteName={
                selectedTicket.project
                  ? `${selectedTicket.project.kelompokTani} - ${selectedTicket.project.title}`
                  : selectedTicket.title
              }
              onCancel={() => setPoDialogOpen(false)}
              onCreated={() => {
                setPoDialogOpen(false);
                setSelectedTicket(null);
                setItemSelection(null);
                router.refresh();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={selectedReceipt !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedReceipt(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {selectedReceipt && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedReceipt.label}</DialogTitle>
                <DialogDescription>
                  Pratinjau bukti terunggah. Unduh file untuk menyimpan salinannya.
                </DialogDescription>
              </DialogHeader>
              <div className="flex min-h-56 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                {/\.(jpe?g|png|webp)$/i.test(selectedReceipt.url.split("?")[0]) ? (
                  <img
                    src={`${selectedReceipt.url}?preview=1`}
                    alt={selectedReceipt.label}
                    className="max-h-[65vh] max-w-full object-contain"
                  />
                ) : selectedReceipt.url.toLowerCase().endsWith(".pdf") ? (
                  <iframe
                    src={`${selectedReceipt.url}?preview=1`}
                    title={`Pratinjau ${selectedReceipt.label}`}
                    className="h-[65vh] w-full"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-3 p-8 text-center">
                    <FileText className="size-12 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Pratinjau tidak tersedia untuk jenis file ini.
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button asChild>
                  <a href={selectedReceipt.url} download>
                    <Download aria-hidden="true" />
                    Unduh Bukti
                  </a>
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {workflowTicket && (
        <>
          {workflowFor(role, workflowTicket) === "EXPEDITION_RECEIPT" &&
            (() => {
              const deliveryOrder = workflowTicket.deliveryOrders?.find(
                (item) => item.status === DOStatus.IN_TRANSIT,
              );
              return deliveryOrder ? (
                <ExpeditionArrivalModal
                  open
                  publicCode={deliveryOrder.publicCode}
                  ticketNumber={workflowTicket.ticketNumber}
                  doNumber={deliveryOrder.doNumber}
                  onOpenChange={(open) => {
                    if (!open) setWorkflowTicket(null);
                  }}
                  onSuccess={() => {
                    setWorkflowTicket(null);
                    router.refresh();
                  }}
                />
              ) : null;
            })()}
          <LogisticsActionModal
            open={workflowFor(role, workflowTicket) === "LOGISTICS"}
            ticket={workflowTicket}
            vendors={vendors}
            stockItems={stockItems}
            vehicles={vehicles}
            onOpenChange={(open) => {
              if (!open) setWorkflowTicket(null);
            }}
            onSuccess={() => {
              setWorkflowTicket(null);
              router.refresh();
            }}
          />
          <FinanceActionModal
            open={workflowFor(role, workflowTicket) === "FINANCE"}
            ticket={workflowTicket}
            onOpenChange={(open) => {
              if (!open) setWorkflowTicket(null);
            }}
            onSuccess={() => {
              setWorkflowTicket(null);
              router.refresh();
            }}
          />
          <MoverActionModal
            open={workflowFor(role, workflowTicket) === "MOVER"}
            ticketId={workflowTicket.id}
            onOpenChange={(open) => {
              if (!open) setWorkflowTicket(null);
            }}
            onSuccess={() => {
              setWorkflowTicket(null);
              router.refresh();
            }}
          />
        </>
      )}
    </div>
  );
}
