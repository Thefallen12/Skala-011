"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { reviewPurchaseOrder } from "@/app/actions/orders";
import {
  completeVehicleFuelRequestReview,
  processVehicleFuelRequest,
} from "@/app/actions/vehicle-fuel";
import {
  paySubkonTermyn,
  releaseSubkonRetention,
  reviewSubkonTermynFinance,
} from "@/app/actions/construction";
import {
  submitPaymentRecord,
} from "@/app/actions/tickets";
import type { TicketActionResult } from "@/app/actions/tickets";
import ErpHubBrand from "@/app/components/apps/erp/ErpHubBrand";
import FinanceDashboard, {
  type FinanceDashboardCategory,
  type FinanceDashboardMonth,
} from "@/app/components/apps/finance/FinanceDashboard";
import PaymentModal, {
  type PaymentModalTarget,
} from "@/app/components/apps/finance/PaymentModal";
import FinancePaymentProofUpload from "@/app/components/apps/finance/FinancePaymentProofUpload";
import DocumentPdfGenerator, {
  type DocumentTemplateOption,
} from "@/app/components/apps/documents/DocumentPdfGenerator";
import PurchaseOrderTemplate from "@/components/documents/PurchaseOrderTemplate";
import VehicleTripLogTable from "@/app/components/apps/logistics/VehicleTripLogTable";
import type { VehicleTripLogRow } from "@/lib/vehicle-trip-types";
import type { VehicleFuelRequestView } from "@/lib/vehicle-fuel-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  POPaymentMethod,
  PaymentType,
  UserRole,
} from "@/generated/prisma/enums";
import {
  Eye,
  FileCheck2,
  Fuel,
  History,
  ReceiptText,
} from "lucide-react";

type FinanceOrder = {
  id: string;
  publicCode: string;
  poNumber: string;
  vendorName: string;
  vendorAddress: string | null;
  vendorContact: string | null;
  vendorPhone: string | null;
  createdAt: string;
  paidAt?: string | null;
  paymentReceiptUrl?: string | null;
  paymentMethod: "CASH" | "TRANSFER";
  paymentBankName: string | null;
  paymentAccountNumber: string | null;
  paymentAccountName: string | null;
  paymentTerms: string | null;
  includeTax: boolean;
  items: {
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  paymentTransactions?: PaymentTransaction[];
};

type PaymentTransaction = {
  id: string;
  paymentType: PaymentType;
  amount: number;
  transferDestination: string;
  status: string;
  proofOfTransferUrl: string | null;
  paidAt: string | null;
};

type FinanceTicket = {
  id: string;
  ticketNumber: string;
  title: string;
  totalAmount: string | null;
  purchaseReceiptUrl: string | null;
  recipientName: string | null;
  bankName: string | null;
  accountNumber: string | null;
  transferDestination: string | null;
  vendorBankName: string | null;
  vendorAccountNumber: string | null;
  vendorAccountName: string | null;
  projectName: string | null;
  paymentTransactions: PaymentTransaction[];
};

type FinanceDirectPurchase = {
  id: string;
  purchaseNumber: string;
  vendorName: string;
  totalAmount: string;
  paymentBankName: string | null;
  paymentAccountNumber: string | null;
  paymentAccountName: string | null;
  createdAt: string;
  items: {
    itemName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
  }[];
  paymentTransactions: PaymentTransaction[];
};

type FinanceHistoryTransaction = {
  id: string;
  reference: string;
  title: string;
  targetKind: FinancePaymentRow["kind"];
  targetId: string;
  paymentType: PaymentType;
  amount: number;
  transferDestination: string;
  proofOfTransferUrl: string | null;
  paidAt: string | null;
};

type FinanceTermyn = {
  id: string;
  contractNumber: string;
  subkonName: string;
  projectName: string;
  termynNumber: number;
  claimedPercent: string;
  grossAmount: string;
  retentionAmount: string;
  netAmount: string;
  status: string;
};

type RetentionContract = {
  id: string;
  contractNumber: string;
  subkonName: string;
  projectName: string;
  retainedAmount: string;
  eligible: boolean;
};

type Selection =
  | { kind: "po"; id: string }
  | { kind: "standalone-po"; id: string }
  | { kind: "direct-purchase"; id: string }
  | { kind: "ticket"; id: string }
  | null;

type FinancePaymentRow = PaymentModalTarget & {
  kind: "ticket" | "standalone-po" | "direct-purchase";
};

const currency = (amount: number | string | null) =>
  amount === null
    ? "—"
    : new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(Number(amount));

const paymentReceiptHref = (url: string) =>
  url.startsWith("/api/tickets/receipts/") ? `${url}?preview=1` : url;

export default function FinanceHub({
  purchaseOrders,
  standalonePayments,
  directPurchases,
  tickets,
  termyns,
  retentionContracts,
  vehicleTripLogs,
  vehicleFuelRequests,
  documentTemplates,
  role,
  initialTab,
  initialOpenSheet,
  cloudinaryCloudName,
  cloudinaryApiKey,
  dashboardMonths,
  dashboardCategories,
}: {
  purchaseOrders: FinanceOrder[];
  standalonePayments: FinanceOrder[];
  directPurchases: FinanceDirectPurchase[];
  tickets: FinanceTicket[];
  termyns: FinanceTermyn[];
  retentionContracts: RetentionContract[];
  vehicleTripLogs: VehicleTripLogRow[];
  vehicleFuelRequests: VehicleFuelRequestView[];
  documentTemplates: DocumentTemplateOption[];
  role: UserRole;
  initialTab?: string;
  initialOpenSheet?: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  dashboardMonths: FinanceDashboardMonth[];
  dashboardCategories: FinanceDashboardCategory[];
}) {
  const router = useRouter();
  const legacyOperationalTabs = ["subcontract", "fuel-logs", "fuel-requests"];
  const tabAliases: Record<string, string> = {
    "po-check": "check",
    payments: "payment",
    check: "check",
    payment: "payment",
    history: "history",
    operations: "operations",
  };
  const resolvedTab = legacyOperationalTabs.includes(initialTab ?? "")
    ? "operations"
    : tabAliases[initialTab ?? ""] ?? "check";
  const [activeTab, setActiveTab] = useState(resolvedTab);
  const [operationsTab, setOperationsTab] = useState(
    legacyOperationalTabs.includes(initialTab ?? "")
      ? initialTab!
      : "subcontract",
  );
  const [paymentModalSelection, setPaymentModalSelection] = useState<{
    kind: FinancePaymentRow["kind"];
    id: string;
  } | null>(null);
  const [selection, setSelection] = useState<Selection>(() => {
    if (!initialOpenSheet) return null;
    if (purchaseOrders.some((order) => order.publicCode === initialOpenSheet)) {
      return { kind: "po", id: initialOpenSheet };
    }
    if (
      standalonePayments.some((order) => order.publicCode === initialOpenSheet)
    ) {
      return { kind: "standalone-po", id: initialOpenSheet };
    }
    if (directPurchases.some((purchase) => purchase.id === initialOpenSheet)) {
      return { kind: "direct-purchase", id: initialOpenSheet };
    }
    if (tickets.some((ticket) => ticket.id === initialOpenSheet)) {
      return { kind: "ticket", id: initialOpenSheet };
    }
    return null;
  });
  const [message, setMessage] = useState("");
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>(
    PaymentType.FULL_PAYMENT,
  );
  const [paymentAmount, setPaymentAmount] = useState("");
  const [termynReceipts, setTermynReceipts] = useState<Record<string, File>>({});
  const [retentionReceipts, setRetentionReceipts] = useState<Record<string, File>>({});
  const [fuelDisbursementMethods, setFuelDisbursementMethods] = useState<
    Record<string, POPaymentMethod>
  >({});
  const [isPending, startTransition] = useTransition();
  const activeOrder =
    selection?.kind === "po"
      ? purchaseOrders.find((order) => order.publicCode === selection.id)
      : undefined;
  const activeStandaloneOrder =
    selection?.kind === "standalone-po"
      ? standalonePayments.find((order) => order.publicCode === selection.id)
      : undefined;
  const activeDirectPurchase =
    selection?.kind === "direct-purchase"
      ? directPurchases.find((purchase) => purchase.id === selection.id)
      : undefined;
  const activeTicket =
    selection?.kind === "ticket"
      ? tickets.find((ticket) => ticket.id === selection.id)
      : undefined;
  const previewOrder = activeOrder ?? activeStandaloneOrder;
  const paymentHistory =
    activeTicket?.paymentTransactions ??
    activeDirectPurchase?.paymentTransactions ??
    previewOrder?.paymentTransactions ??
    [];
  const paymentTotal = activeTicket
    ? Number(activeTicket.totalAmount ?? 0)
    : activeDirectPurchase
      ? Number(activeDirectPurchase.totalAmount)
      : Math.round(
          (previewOrder?.items ?? []).reduce(
            (sum, item) => sum + item.totalPrice,
            0,
          ) *
            (previewOrder?.includeTax ? 1.11 : 1) *
            100,
        ) / 100;
  const paidAmount = paymentHistory.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const remainingAmount = Math.max(
    0,
    Math.round((paymentTotal - paidAmount) * 100) / 100,
  );
  const remainingBalance =
    Math.round((paymentTotal - paidAmount) * 100) / 100;
  const isPaymentSettled = remainingBalance <= 0;
  const paymentStatusLabel = isPaymentSettled
    ? "LUNAS"
    : paidAmount > 0
      ? "DIBAYAR SEBAGIAN"
      : "BELUM DIBAYAR";
  const paymentRows: FinancePaymentRow[] = [
    ...tickets.map((ticket) => ({
      id: ticket.id,
      kind: "ticket" as const,
      reference: ticket.ticketNumber,
      title: ticket.title,
      grandTotal: Number(ticket.totalAmount ?? 0),
      paidAmount: ticket.paymentTransactions.reduce(
        (total, payment) => total + payment.amount,
        0,
      ),
      transferDestination:
        ticket.transferDestination ??
        (ticket.vendorBankName && ticket.vendorAccountNumber
          ? `Ditransfer ke: ${ticket.vendorBankName}, ${ticket.vendorAccountNumber}, a.n. ${ticket.vendorAccountName ?? ""}`
          : ""),
    })),
    ...standalonePayments.map((order) => ({
      id: order.publicCode,
      kind: "standalone-po" as const,
      reference: order.poNumber,
      title: `Pembelian PO · ${order.vendorName}`,
      grandTotal:
        Math.round(
          order.items.reduce((total, item) => total + item.totalPrice, 0) *
            (order.includeTax ? 1.11 : 1) *
            100,
        ) / 100,
      paidAmount: (order.paymentTransactions ?? []).reduce(
        (total, payment) => total + payment.amount,
        0,
      ),
      transferDestination:
        order.paymentBankName && order.paymentAccountNumber
          ? `Ditransfer ke: ${order.paymentBankName}, ${order.paymentAccountNumber}, a.n. ${order.paymentAccountName ?? order.vendorName}`
          : "",
    })),
    ...directPurchases.map((purchase) => ({
      id: purchase.id,
      kind: "direct-purchase" as const,
      reference: purchase.purchaseNumber,
      title: `Pembelian Langsung · ${purchase.vendorName}`,
      grandTotal: Number(purchase.totalAmount),
      paidAmount: purchase.paymentTransactions.reduce(
        (total, payment) => total + payment.amount,
        0,
      ),
      transferDestination:
        purchase.paymentBankName && purchase.paymentAccountNumber
          ? `Ditransfer ke: ${purchase.paymentBankName}, ${purchase.paymentAccountNumber}, a.n. ${purchase.paymentAccountName ?? purchase.vendorName}`
          : "",
    })),
  ].filter((row) => Number.isFinite(row.grandTotal) && row.grandTotal > 0);
  const pendingPaymentCount = paymentRows.filter(
    (row) => row.grandTotal - row.paidAmount > 0.005,
  ).length;
  const pendingPaymentRows = paymentRows.filter(
    (row) => row.grandTotal - row.paidAmount > 0.005,
  );
  const paymentHistoryRows: FinanceHistoryTransaction[] = [
    ...standalonePayments.flatMap((order) =>
      (order.paymentTransactions ?? []).map((payment) => ({
        ...payment,
        reference: order.poNumber,
        title: `PO · ${order.vendorName}`,
        targetKind: "standalone-po" as const,
        targetId: order.publicCode,
      })),
    ),
    ...directPurchases.flatMap((purchase) =>
      purchase.paymentTransactions.map((payment) => ({
        ...payment,
        reference: purchase.purchaseNumber,
        title: `Pembelian langsung · ${purchase.vendorName}`,
        targetKind: "direct-purchase" as const,
        targetId: purchase.id,
      })),
    ),
    ...tickets.flatMap((ticket) =>
      ticket.paymentTransactions.map((payment) => ({
        ...payment,
        reference: ticket.ticketNumber,
        title: ticket.title,
        targetKind: "ticket" as const,
        targetId: ticket.id,
      })),
    ),
  ].sort(
    (a, b) =>
      (b.paidAt ? new Date(b.paidAt).getTime() : 0) -
      (a.paidAt ? new Date(a.paidAt).getTime() : 0),
  );
  const selectedPaymentRow = paymentModalSelection
    ? paymentRows.find(
        (row) =>
          row.kind === paymentModalSelection.kind &&
          row.id === paymentModalSelection.id,
      ) ?? null
    : null;

  const openPaymentHistory = (row: FinancePaymentRow) => {
    setSelection(
      row.kind === "ticket"
        ? { kind: "ticket", id: row.id }
        : row.kind === "standalone-po"
          ? { kind: "standalone-po", id: row.id }
          : { kind: "direct-purchase", id: row.id },
    );
  };

  const runReview = (publicCode: string) => {
    setMessage("");
    startTransition(async () => {
      try {
        const result = await reviewPurchaseOrder(publicCode);
        setMessage(result.message);
        if (result.success) router.refresh();
      } catch (error) {
        console.error("Finance PO review failed:", error);
        setMessage("Pemeriksaan PO gagal. Silakan coba kembali.");
      }
    });
  };

  const submitFuelRequestDecision = (
    event: FormEvent<HTMLFormElement>,
    requestId: string,
  ) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const approve =
      submitter instanceof HTMLButtonElement &&
      submitter.value === "approve";
    const disbursementMethod =
      data.get("disbursementMethod") === POPaymentMethod.TRANSFER
        ? POPaymentMethod.TRANSFER
        : POPaymentMethod.CASH;
    const transferProof = data.get("transferProof");
    const input = {
      disbursementMethod,
      transferDestination: String(data.get("transferDestination") ?? ""),
      financeNote: String(data.get("financeNote") ?? ""),
      ...(transferProof instanceof File && transferProof.size > 0
        ? { transferProof }
        : {}),
    };
    if (
      approve &&
      disbursementMethod === POPaymentMethod.TRANSFER &&
      !input.transferProof
    ) {
      setMessage("Bukti transfer wajib diunggah sebelum pencairan dicatat.");
      return;
    }

    setMessage("");
    startTransition(async () => {
      try {
        const result = await processVehicleFuelRequest(
          requestId,
          approve,
          approve ? input : { financeNote: input.financeNote },
        );
        setMessage(result.message);
        if (result.success) router.refresh();
      } catch (error) {
        console.error("Finance fuel request decision failed:", error);
        setMessage("Request BBM gagal diproses. Silakan coba kembali.");
      }
    });
  };

  const submitFuelReconciliation = (
    event: FormEvent<HTMLFormElement>,
    requestId: string,
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const financeNote = String(formData.get("reconciliationNote") ?? "");
    setMessage("");
    startTransition(async () => {
      try {
        const result = await completeVehicleFuelRequestReview(
          requestId,
          financeNote,
        );
        setMessage(result.message);
        if (result.success) router.refresh();
      } catch (error) {
        console.error("Finance fuel reconciliation failed:", error);
        setMessage("Rekonsiliasi BBM gagal ditutup. Silakan coba kembali.");
      }
    });
  };

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      (!activeTicket && !activeStandaloneOrder && !activeDirectPurchase) ||
      !receiptUrl
    ) {
      setMessage("Pilih PO/tiket dan unggah bukti pembayaran terlebih dahulu.");
      return;
    }
    const transferDestination = String(
      new FormData(event.currentTarget).get("transferDestination") ?? "",
    );
    const amount = paymentAmount ? Number(paymentAmount) : undefined;
    setMessage("");
    startTransition(async () => {
      try {
        const target = activeTicket
          ? { kind: "ticket" as const, id: activeTicket.id }
          : activeStandaloneOrder
            ? {
                kind: "purchase-order" as const,
                id: activeStandaloneOrder.publicCode,
              }
            : activeDirectPurchase
              ? { kind: "direct-purchase" as const, id: activeDirectPurchase.id }
              : null;
        if (!target) return;
        const result: TicketActionResult = await submitPaymentRecord({
          target,
          proofOfTransferUrl: receiptUrl,
          transferDestination,
          paymentType,
          amount,
        });
        setMessage(result.message);
        if (result.success) {
          setReceiptUrl(null);
          setPaymentAmount("");
          setPaymentType(PaymentType.FULL_PAYMENT);
          router.refresh();
        }
      } catch (error) {
        console.error("Finance ticket payment failed:", error);
        setMessage("Pembayaran gagal diproses. Silakan coba kembali.");
      }
    });
  };

  const submitModalPayment = async (
    proofOfTransferUrl: string,
    transferDestination: string,
    type: PaymentType,
    amount: number,
  ): Promise<TicketActionResult> => {
    if (!selectedPaymentRow) {
      return { success: false, message: "Tagihan tidak ditemukan." };
    }
    const target =
      selectedPaymentRow.kind === "ticket"
        ? { kind: "ticket" as const, id: selectedPaymentRow.id }
        : selectedPaymentRow.kind === "standalone-po"
          ? { kind: "purchase-order" as const, id: selectedPaymentRow.id }
          : { kind: "direct-purchase" as const, id: selectedPaymentRow.id };
    return submitPaymentRecord({
      target,
      proofOfTransferUrl,
      transferDestination,
      paymentType: type,
      amount,
    });
  };

  const submitTermynPayment = (
    event: FormEvent<HTMLFormElement>,
    termynId: string,
  ) => {
    event.preventDefault();
    const file = termynReceipts[termynId];
    if (!file) {
      setMessage("Pilih bukti transfer termin terlebih dahulu.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await paySubkonTermyn(termynId, file);
        setMessage(result.message);
        if (result.success) {
          setTermynReceipts((current) => {
            const next = { ...current };
            delete next[termynId];
            return next;
          });
          router.refresh();
        }
      } catch (error) {
        console.error("Subcontract termyn payment failed:", error);
        setMessage("Pembayaran termin gagal. Silakan coba kembali.");
      }
    });
  };

  const submitRetentionRelease = (
    event: FormEvent<HTMLFormElement>,
    contractId: string,
  ) => {
    event.preventDefault();
    const file = retentionReceipts[contractId];
    if (!file) {
      setMessage("Pilih bukti transfer retensi terlebih dahulu.");
      return;
    }
    startTransition(async () => {
      try {
        const result = await releaseSubkonRetention(contractId, file);
        setMessage(result.message);
        if (result.success) router.refresh();
      } catch (error) {
        console.error("Subcontract retention release failed:", error);
        setMessage("Pencairan retensi gagal. Silakan coba kembali.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <ErpHubBrand
        title="Finance Command Hub"
        description="Workspace terpadu untuk pemeriksaan PO, pencairan, bukti transfer, dan kendali biaya."
      />

      <FinanceDashboard
        reviewCount={purchaseOrders.length}
        pendingPaymentCount={pendingPaymentCount}
        outstandingAmount={pendingPaymentRows.reduce(
          (total, row) =>
            total + Math.max(0, row.grandTotal - row.paidAmount),
          0,
        )}
        months={dashboardMonths}
        categories={dashboardCategories}
        onNavigate={setActiveTab}
      />

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-5"
      >
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-lg border bg-white p-2">
          <TabsTrigger value="check" className="gap-2">
            <FileCheck2 className="size-4" />
            1. Perlu Diperiksa (PO & Tiket)
            <Badge variant="secondary">{purchaseOrders.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="payment" className="gap-2">
            <ReceiptText className="size-4" />
            2. Antrean Pembayaran
            <Badge variant="secondary">{pendingPaymentCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="size-4" />
            3. Riwayat & Bukti Transfer
            <Badge variant="secondary">{paymentHistoryRows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="operations" className="gap-2">
            <Fuel className="size-4" />
            Operasional Lainnya
            <Badge variant="secondary">
              {termyns.length + vehicleTripLogs.length + vehicleFuelRequests.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="check">
          <Card>
            <CardHeader>
              <CardTitle>PO Menunggu Checked By Finance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {purchaseOrders.length === 0 ? (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Tidak ada PO draft yang menunggu pemeriksaan.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nomor Ref</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.map((order) => (
                        <TableRow
                          key={order.publicCode}
                          className="cursor-pointer"
                          tabIndex={0}
                          onClick={() => {
                            setMessage("");
                            setSelection({ kind: "po", id: order.publicCode });
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelection({ kind: "po", id: order.publicCode });
                            }
                          }}
                        >
                          <TableCell className="font-semibold">
                            {order.poNumber}
                          </TableCell>
                          <TableCell>{order.vendorName}</TableCell>
                          <TableCell>
                            {new Date(order.createdAt).toLocaleDateString("id-ID")}
                          </TableCell>
                          <TableCell>{order.items.length}</TableCell>
                          <TableCell className="text-right">
                            {role === UserRole.FINANCE && !order.paidAt && (
                              <Button
                                disabled={isPending}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  runReview(order.publicCode);
                                }}
                              >
                                Tandai Diperiksa
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Pembelian langsung menunggu persetujuan eksekutif terlebih dahulu;
                setelah disetujui, tagihan masuk ke antrean pembayaran.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Tagihan & Pembelian Disetujui</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nomor Ref</TableHead>
                      <TableHead>Tagihan (Grand Total)</TableHead>
                      <TableHead>Total Terbayar</TableHead>
                      <TableHead>Sisa Hutang</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingPaymentRows.map((row) => {
                      const balance =
                        Math.round((row.grandTotal - row.paidAmount) * 100) /
                        100;
                      const outstanding = Math.max(0, balance);
                      return (
                        <TableRow
                          key={`${row.kind}:${row.id}`}
                          className="cursor-pointer"
                          tabIndex={0}
                          onClick={() => openPaymentHistory(row)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              openPaymentHistory(row);
                            }
                          }}
                        >
                          <TableCell>
                            <span className="font-semibold">{row.reference}</span>
                            <span className="block text-xs text-muted-foreground">
                              {row.title}
                            </span>
                          </TableCell>
                          <TableCell>{currency(row.grandTotal)}</TableCell>
                          <TableCell>{currency(row.paidAmount)}</TableCell>
                          <TableCell className="font-medium">
                            {currency(outstanding)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                balance <= 0
                                  ? "success"
                                  : row.paidAmount > 0
                                    ? "warning"
                                    : "error"
                              }
                            >
                              {balance <= 0
                                ? "LUNAS"
                                : row.paidAmount > 0
                                  ? "DIBAYAR SEBAGIAN"
                                  : "BELUM DIBAYAR"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-wrap justify-end gap-2">
                              {row.paidAmount > 0 && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isPending}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openPaymentHistory(row);
                                  }}
                                >
                                  <Eye className="mr-2 size-4" aria-hidden="true" />
                                  Lihat Bukti
                                </Button>
                              )}
                              {outstanding > 0 && (
                                <Button
                                  type="button"
                                  disabled={
                                    isPending || role !== UserRole.FINANCE
                                  }
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setPaymentModalSelection({
                                      kind: row.kind,
                                      id: row.id,
                                    });
                                  }}
                                >
                                  Bayar / Transfer
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {pendingPaymentRows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-muted-foreground"
                        >
                          Tidak ada tagihan yang menunggu pembayaran.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat & Bukti Transfer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Nomor Ref</TableHead>
                      <TableHead>Transaksi</TableHead>
                      <TableHead>Jenis</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Bukti Transfer</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistoryRows.map((payment) => (
                      <TableRow
                        key={payment.id}
                        className="cursor-pointer"
                        tabIndex={0}
                        onClick={() =>
                          setSelection(
                            payment.targetKind === "ticket"
                              ? { kind: "ticket", id: payment.targetId }
                              : payment.targetKind === "standalone-po"
                                ? { kind: "standalone-po", id: payment.targetId }
                                : { kind: "direct-purchase", id: payment.targetId },
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelection(
                              payment.targetKind === "ticket"
                                ? { kind: "ticket", id: payment.targetId }
                                : payment.targetKind === "standalone-po"
                                  ? { kind: "standalone-po", id: payment.targetId }
                                  : {
                                      kind: "direct-purchase",
                                      id: payment.targetId,
                                    },
                            );
                          }
                        }}
                      >
                        <TableCell>
                          {payment.paidAt
                            ? new Date(payment.paidAt).toLocaleString("id-ID")
                            : "—"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {payment.reference}
                        </TableCell>
                        <TableCell>{payment.title}</TableCell>
                        <TableCell>
                          {payment.paymentType === PaymentType.DOWN_PAYMENT
                            ? "DP"
                            : payment.paymentType === PaymentType.PROGRESS_PAYMENT
                              ? "Termin"
                              : "Pelunasan"}
                        </TableCell>
                        <TableCell>{currency(payment.amount)}</TableCell>
                        <TableCell>
                          {payment.proofOfTransferUrl ? (
                            <Button asChild size="sm" variant="outline">
                              <a
                                href={paymentReceiptHref(
                                  payment.proofOfTransferUrl,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <ReceiptText
                                  className="mr-2 size-4"
                                  aria-hidden="true"
                                />
                                Lihat Bukti Transfer
                              </a>
                            </Button>
                          ) : (
                            <span className="text-muted-foreground">
                              Tidak ada bukti
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {paymentHistoryRows.length === 0 && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-muted-foreground"
                        >
                          Belum ada transaksi pembayaran berhasil.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations">
          <Tabs
            value={operationsTab}
            onValueChange={setOperationsTab}
            className="space-y-4"
          >
            <TabsList className="flex h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="subcontract">
                Termin & Retensi ({termyns.length})
              </TabsTrigger>
              <TabsTrigger value="fuel-logs">
                Log BBM Mover ({vehicleTripLogs.length})
              </TabsTrigger>
              <TabsTrigger value="fuel-requests">
                Reimbursement BBM (
                {
                  vehicleFuelRequests.filter(
                    (request) =>
                      request.status === "PENDING_FINANCE" ||
                      request.status === "PROOF_SUBMITTED",
                  ).length
                }
                )
              </TabsTrigger>
            </TabsList>
        <TabsContent value="subcontract">
          <Card>
            <CardHeader>
              <CardTitle>Termin Subkon & Retensi 5%</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {termyns.map((termyn) => (
                <article className="rounded-lg border p-4" key={termyn.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-primary">
                        {termyn.contractNumber} · {termyn.subkonName}
                      </p>
                      <p className="text-sm text-muted-foreground">{termyn.projectName}</p>
                      <p className="mt-2 text-sm">
                        Termin {termyn.termynNumber} · Klaim kumulatif {termyn.claimedPercent}%
                      </p>
                    </div>
                    <Badge variant="outline">{termyn.status}</Badge>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                    <p>Nilai kotor: <strong>{currency(termyn.grossAmount)}</strong></p>
                    <p>Retensi (5%): <strong>{currency(termyn.retentionAmount)}</strong></p>
                    <p>Nilai bersih: <strong>{currency(termyn.netAmount)}</strong></p>
                  </div>
                  {termyn.status === "FIELD_VERIFIED" && role === UserRole.FINANCE && (
                    <Button
                      className="mt-3"
                      disabled={isPending}
                      onClick={async () => {
                        const result = await reviewSubkonTermynFinance(termyn.id);
                        setMessage(result.message);
                        if (result.success) router.refresh();
                      }}
                    >
                      Checked By Finance
                    </Button>
                  )}
                  {termyn.status === "APPROVED" && role === UserRole.FINANCE && (
                    <form
                      className="mt-3 flex flex-wrap items-end gap-3"
                      onSubmit={(event) => submitTermynPayment(event, termyn.id)}
                    >
                      <label className="space-y-1 text-sm">
                        Bukti pembayaran (PDF/JPG/PNG/WEBP, maks. 5 MB)
                        <Input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          required
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setTermynReceipts((current) => ({
                                ...current,
                                [termyn.id]: file,
                              }));
                            }
                          }}
                        />
                      </label>
                      <Button disabled={!termynReceipts[termyn.id] || isPending}>
                        Bayar Termin Bersih
                      </Button>
                    </form>
                  )}
                </article>
              ))}
              {termyns.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Tidak ada termin yang menunggu pemeriksaan atau pembayaran.
                </p>
              )}
              <h3 className="pt-4 font-semibold text-primary">
                Pencairan Retensi setelah Masa Pemeliharaan
              </h3>
              {retentionContracts.map((contract) => (
                <article className="rounded-lg border p-4" key={contract.id}>
                  <p className="font-semibold">
                    {contract.contractNumber} · {contract.subkonName}
                  </p>
                  <p className="text-sm text-muted-foreground">{contract.projectName}</p>
                  <p className="mt-1 text-sm">
                    Total retensi tertahan: <strong>{currency(contract.retainedAmount)}</strong>
                  </p>
                  {contract.eligible && role === UserRole.FINANCE ? (
                    <form
                      className="mt-3 flex flex-wrap items-end gap-3"
                      onSubmit={(event) => submitRetentionRelease(event, contract.id)}
                    >
                      <label className="space-y-1 text-sm">
                        Bukti transfer retensi
                        <Input
                          type="file"
                          accept="application/pdf,image/jpeg,image/png,image/webp"
                          required
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              setRetentionReceipts((current) => ({
                                ...current,
                                [contract.id]: file,
                              }));
                            }
                          }}
                        />
                      </label>
                      <Button
                        disabled={!retentionReceipts[contract.id] || isPending}
                      >
                        Catat Pencairan Retensi
                      </Button>
                    </form>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Menunggu semua termin dibayar dan masa pemeliharaan PHO selesai.
                    </p>
                  )}
                </article>
              ))}
              {retentionContracts.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Belum ada retensi subkon yang tercatat.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel-logs">
          <Card>
            <CardHeader>
              <CardTitle>Log Perjalanan & Estimasi BBM Mover</CardTitle>
              <p className="text-sm text-muted-foreground">
                Data odometer dan estimasi liter untuk ditindaklanjuti dalam proses reimburse di luar aplikasi.
              </p>
            </CardHeader>
            <CardContent>
              <VehicleTripLogTable
                logs={vehicleTripLogs}
                emptyMessage="Belum ada log perjalanan atau BBM untuk ditinjau."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fuel-requests">
          <Card>
            <CardHeader>
              <CardTitle>Reimbursement BBM Kendaraan</CardTitle>
              <p className="text-sm text-muted-foreground">
                Plafon dihitung dari ODO berangkat–pulang pada rasio 12 km/L. Persetujuan dan pencatatan pencairan menutup request.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {vehicleFuelRequests.map((request) => (
                <article className="space-y-3 rounded-lg border p-4" key={request.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-primary">
                        {request.doNumber} · {request.plateNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {request.vehicleType} · {request.projectName} · Mover: {request.requestedByName}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {{
                        PENDING_FINANCE: "Menunggu Keuangan",
                        FUNDED: "Dana Diserahkan · Menunggu Bukti",
                        REJECTED: "Ditolak",
                        PROOF_SUBMITTED: "Bukti masuk · menunggu penutupan Finance",
                        COMPLETED: "Selesai · reimbursement disalurkan",
                      }[request.status]}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-4">
                    <p>Jenis BBM: <strong>{request.source === "SPBU" ? "SPBU" : "Eceran"}</strong></p>
                    <p>Plafon reimbursement: <strong>{currency(request.requestedAmount)}</strong></p>
                    <p>Estimasi liter: <strong>{request.estimatedFuelLiter} L</strong></p>
                    <p>Harga: <strong>Rp{Number(request.unitPrice).toLocaleString("id-ID")}/L</strong></p>
                    <p>Jarak ODO aktual: <strong>{request.tripDistanceKm ?? "—"} km</strong></p>
                    <p>Jarak untuk hitung: <strong>{request.estimatedDistanceKm} km</strong></p>
                    {Number(request.exceptionDistanceKm) > 0 && (
                      <p>
                        Toleransi kondisi khusus:{" "}
                        <strong>+{request.exceptionDistanceKm} km</strong>
                        {request.exceptionReason
                          ? ` · ${request.exceptionReason}`
                          : ""}
                      </p>
                    )}
                  </div>
                  {request.disbursementMethod && (
                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                      <p>
                        Pencairan:{" "}
                        <strong>
                          {request.disbursementMethod === POPaymentMethod.CASH
                            ? "Tunai"
                            : "Transfer"}
                        </strong>
                      </p>
                      <p>Tujuan / penerima: {request.transferDestination}</p>
                      {request.transferProofUrl && (
                        <a
                          className="font-medium text-primary underline"
                          href={`${request.transferProofUrl}?preview=1`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Lihat bukti transfer
                        </a>
                      )}
                    </div>
                  )}
                  {request.financeNote && (
                    <p className="text-sm text-muted-foreground">
                      Catatan Keuangan: {request.financeNote}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 text-sm">
                    <a
                      className="font-medium text-primary underline"
                      href={`${request.beforeFillingPhotoUrl}?preview=1`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Foto speedometer sebelum isi
                    </a>
                    {request.afterFillingPhotoUrl && (
                      <a
                        className="font-medium text-primary underline"
                        href={`${request.afterFillingPhotoUrl}?preview=1`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Foto speedometer setelah isi
                      </a>
                    )}
                    {request.receiptPhotoUrl && (
                      <a
                        className="font-medium text-primary underline"
                        href={`${request.receiptPhotoUrl}?preview=1`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Bon BBM
                      </a>
                    )}
                  </div>
                  {request.status === "PENDING_FINANCE" && role === UserRole.FINANCE && (
                    <form
                      className="grid gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-2"
                      onSubmit={(event) =>
                        submitFuelRequestDecision(event, request.id)
                      }
                    >
                      <label className="grid gap-1 text-sm">
                        Metode penyaluran dana
                        <select
                          name="disbursementMethod"
                          value={
                            fuelDisbursementMethods[request.id] ??
                            POPaymentMethod.CASH
                          }
                          onChange={(event) =>
                            setFuelDisbursementMethods((current) => ({
                              ...current,
                              [request.id]:
                                event.target.value === POPaymentMethod.TRANSFER
                                  ? POPaymentMethod.TRANSFER
                                  : POPaymentMethod.CASH,
                            }))
                          }
                          className="h-10 rounded-md border bg-background px-3"
                          disabled={isPending}
                        >
                          <option value={POPaymentMethod.CASH}>Tunai / Cash</option>
                          <option value={POPaymentMethod.TRANSFER}>Transfer</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-sm">
                        {fuelDisbursementMethods[request.id] === POPaymentMethod.TRANSFER
                          ? "Tujuan transfer (bank, no. rekening, nama penerima)"
                          : "Nama penerima dana tunai"}
                        <Input
                          key={`${request.id}:${fuelDisbursementMethods[request.id] ?? POPaymentMethod.CASH}`}
                          name="transferDestination"
                          required
                          maxLength={300}
                          defaultValue={
                            fuelDisbursementMethods[request.id] ===
                            POPaymentMethod.TRANSFER
                              ? ""
                              : request.requestedByName
                          }
                          placeholder={
                            fuelDisbursementMethods[request.id] ===
                            POPaymentMethod.TRANSFER
                              ? "Contoh: Bank, nomor rekening, nama pemilik"
                              : "Nama Mover penerima"
                          }
                          disabled={isPending}
                        />
                      </label>
                      {fuelDisbursementMethods[request.id] ===
                        POPaymentMethod.TRANSFER && (
                        <label className="grid gap-1 text-sm md:col-span-2">
                          Bukti transfer (wajib)
                          <Input
                            name="transferProof"
                            type="file"
                            accept="image/jpeg,image/png,image/webp,application/pdf"
                            required
                            disabled={isPending}
                          />
                          <span className="text-xs text-muted-foreground">
                            PDF/JPG/PNG/WEBP, maksimal 5 MB.
                          </span>
                        </label>
                      )}
                      <label className="grid gap-1 text-sm md:col-span-2">
                        Catatan Keuangan (opsional)
                        <Input
                          name="financeNote"
                          maxLength={1000}
                          disabled={isPending}
                        />
                      </label>
                      <div className="flex flex-wrap gap-2 md:col-span-2">
                        <Button
                          type="submit"
                          name="decision"
                          value="approve"
                          disabled={isPending}
                        >
                          {isPending ? "Memproses..." : "Setujui & Catat Pencairan"}
                        </Button>
                        <Button
                          type="submit"
                          name="decision"
                          value="reject"
                          variant="outline"
                          formNoValidate
                          disabled={isPending}
                        >
                          Tolak Request
                        </Button>
                      </div>
                    </form>
                  )}
                  {request.status === "PROOF_SUBMITTED" &&
                    role === UserRole.FINANCE && (
                      <form
                        className="grid gap-3 rounded-md border border-amber-200 bg-amber-50/50 p-3 md:grid-cols-[1fr_auto]"
                        onSubmit={(event) =>
                          submitFuelReconciliation(event, request.id)
                        }
                      >
                        <label className="grid gap-1 text-sm">
                          Catatan rekonsiliasi (opsional)
                          <Input
                            name="reconciliationNote"
                            maxLength={1000}
                            disabled={isPending}
                            placeholder="Contoh: ODO dan bukti pengisian sudah sesuai"
                          />
                        </label>
                        <Button
                          type="submit"
                          className="self-end"
                          disabled={isPending}
                        >
                          {isPending
                            ? "Menutup..."
                            : "Tandai selesai & tutup"}
                        </Button>
                      </form>
                    )}
                </article>
              ))}
              {vehicleFuelRequests.length === 0 && (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Belum ada request dana BBM dari Mover.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {message && (
        <p className="rounded-md border bg-white p-3 text-sm" role="status">
          {message}
        </p>
      )}

      <Sheet
        open={selection !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelection(null);
            setReceiptUrl(null);
            setPaymentAmount("");
            setPaymentType(PaymentType.FULL_PAYMENT);
            setMessage("");
            if (initialOpenSheet) {
              router.replace(`/apps/finance?tab=${activeTab}`, { scroll: false });
            }
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader className="pr-8">
            <SheetTitle>
              {previewOrder?.poNumber ??
                activeDirectPurchase?.purchaseNumber ??
                activeTicket?.ticketNumber ??
                "Detail Finance"}
            </SheetTitle>
            <SheetDescription>
              Pemeriksaan dokumen dan transaksi tersimpan di satu panel.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {previewOrder && (
              <>
                <p className="text-sm">
                  Vendor: <strong>{previewOrder.vendorName}</strong>
                </p>
                <DocumentPdfGenerator
                  key={`PO:${previewOrder.id}`}
                  recordType="PO"
                  recordId={previewOrder.id}
                  documentNumber={previewOrder.poNumber}
                  templates={documentTemplates}
                />
                <div className="max-h-[65vh] overflow-auto rounded-lg border bg-slate-100 p-3">
                  <PurchaseOrderTemplate
                    poNumber={previewOrder.poNumber}
                    date={new Date(previewOrder.createdAt).toLocaleDateString("id-ID")}
                    vendorName={previewOrder.vendorName}
                    vendorAddress={previewOrder.vendorAddress}
                    vendorContact={previewOrder.vendorContact}
                    vendorPhone={previewOrder.vendorPhone}
                    paymentMethod={previewOrder.paymentMethod}
                    paymentBankName={previewOrder.paymentBankName ?? ""}
                    paymentAccountNumber={previewOrder.paymentAccountNumber ?? ""}
                    paymentAccountName={previewOrder.paymentAccountName ?? ""}
                    paymentTerms={previewOrder.paymentTerms ?? ""}
                    includeTax={previewOrder.includeTax}
                    items={previewOrder.items}
                  />
                </div>
              </>
            )}
            {activeStandaloneOrder && isPaymentSettled && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
                {activeStandaloneOrder.paidAt
                  ? `PO ini sudah lunas pada ${new Date(activeStandaloneOrder.paidAt).toLocaleDateString("id-ID")}.`
                  : "PO ini sudah lunas."}
                {activeStandaloneOrder.paymentReceiptUrl && (
                  <a
                    href={activeStandaloneOrder.paymentReceiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 underline"
                  >
                    Lihat bukti pelunasan
                  </a>
                )}
              </div>
            )}
            {activeStandaloneOrder && role === UserRole.FINANCE && !isPaymentSettled && (
              <form className="space-y-3" onSubmit={submitPayment}>
                <section className="space-y-2 rounded-lg border p-3 text-sm">
                  <p>
                    Total tagihan: <strong>{currency(paymentTotal)}</strong>
                  </p>
                  <p>
                    Sudah dibayar: <strong>{currency(paidAmount)}</strong> · Sisa:{" "}
                    <strong>{currency(remainingAmount)}</strong>
                  </p>
                  <div className="space-y-2 pt-1">
                    <Label>Jenis pembayaran</Label>
                    <label className="flex items-center gap-2 font-normal">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={paymentType === PaymentType.FULL_PAYMENT}
                        onChange={() => setPaymentType(PaymentType.FULL_PAYMENT)}
                      />
                      Bayar Lunas (Full Payment)
                    </label>
                    <label className="flex items-center gap-2 font-normal">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={paymentType === PaymentType.DOWN_PAYMENT}
                        onChange={() => setPaymentType(PaymentType.DOWN_PAYMENT)}
                      />
                      Bayar Uang Muka (DP) / Sebagian
                    </label>
                    <label className="flex items-center gap-2 font-normal">
                      <input
                        type="radio"
                        name="paymentType"
                        checked={paymentType === PaymentType.PROGRESS_PAYMENT}
                        onChange={() => setPaymentType(PaymentType.PROGRESS_PAYMENT)}
                      />
                      Pembayaran Termin
                    </label>
                    {paymentType !== PaymentType.FULL_PAYMENT && (
                      <div className="space-y-2">
                        <Label htmlFor="standalone-payment-amount">
                          Nominal Transfer (Rp)
                        </Label>
                        <Input
                          id="standalone-payment-amount"
                          type="number"
                          min="0.01"
                          max={Math.max(0, remainingAmount - 0.01)}
                          step="0.01"
                          required
                          value={paymentAmount}
                          onChange={(event) => setPaymentAmount(event.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </section>
                <div className="space-y-2">
                  <Label htmlFor="standalone-po-transfer-destination">
                    Keterangan tujuan transfer
                  </Label>
                  <Input
                    key={activeStandaloneOrder.publicCode}
                    id="standalone-po-transfer-destination"
                    name="transferDestination"
                    defaultValue={
                      activeStandaloneOrder.paymentBankName &&
                      activeStandaloneOrder.paymentAccountNumber
                        ? `Ditransfer ke: ${activeStandaloneOrder.paymentBankName} & ${activeStandaloneOrder.paymentAccountNumber}`
                        : "Pembayaran cash untuk restock gudang"
                    }
                    maxLength={300}
                    required
                    disabled={isPending}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bukti pembayaran</Label>
                  <FinancePaymentProofUpload
                    value={receiptUrl}
                    onChange={setReceiptUrl}
                    cloudinaryCloudName={cloudinaryCloudName}
                    cloudinaryApiKey={cloudinaryApiKey}
                    disabled={isPending}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={
                    !receiptUrl ||
                    isPending ||
                    (paymentType !== PaymentType.FULL_PAYMENT &&
                      (!paymentAmount || Number(paymentAmount) <= 0))
                  }
                >
                  {isPending
                    ? "Memproses..."
                    : paymentType === PaymentType.FULL_PAYMENT
                      ? "Bayar & Terima ke Gudang"
                        : paymentType === PaymentType.DOWN_PAYMENT
                          ? "Catat Pembayaran DP"
                          : "Catat Pembayaran Termin"}
                </Button>
              </form>
            )}
            {activeDirectPurchase && (
              <section className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{activeDirectPurchase.vendorName}</p>
                    <p className="text-sm text-muted-foreground">
                      Dibuat {new Date(activeDirectPurchase.createdAt).toLocaleDateString("id-ID")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      isPaymentSettled
                        ? "success"
                        : paidAmount > 0
                          ? "warning"
                          : "error"
                    }
                  >
                    {paymentStatusLabel}
                  </Badge>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-3">Barang</th>
                        <th className="py-2 pr-3">Jumlah</th>
                        <th className="py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeDirectPurchase.items.map((item, index) => (
                        <tr key={`${item.itemName}-${index}`} className="border-b last:border-0">
                          <td className="py-2 pr-3">{item.itemName}</td>
                          <td className="py-2 pr-3">{item.quantity} {item.unit}</td>
                          <td className="py-2">{currency(item.totalPrice)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm">
                  Total tagihan: <strong>{currency(paymentTotal)}</strong> · Dibayar:{" "}
                  <strong>{currency(paidAmount)}</strong> · Sisa:{" "}
                  <strong>{currency(remainingAmount)}</strong>
                </p>
                {role === UserRole.FINANCE && remainingAmount > 0 && (
                  <form className="space-y-3 border-t pt-3" onSubmit={submitPayment}>
                    <section className="space-y-2 text-sm">
                      <Label>Jenis pembayaran</Label>
                      <label className="flex items-center gap-2 font-normal">
                        <input
                          type="radio"
                          name="direct-purchase-payment-type"
                          checked={paymentType === PaymentType.FULL_PAYMENT}
                          onChange={() => setPaymentType(PaymentType.FULL_PAYMENT)}
                        />
                        Bayar Lunas
                      </label>
                      <label className="flex items-center gap-2 font-normal">
                        <input
                          type="radio"
                          name="direct-purchase-payment-type"
                          checked={paymentType === PaymentType.DOWN_PAYMENT}
                          onChange={() => setPaymentType(PaymentType.DOWN_PAYMENT)}
                        />
                        Uang Muka (DP)
                      </label>
                      <label className="flex items-center gap-2 font-normal">
                        <input
                          type="radio"
                          name="direct-purchase-payment-type"
                          checked={paymentType === PaymentType.PROGRESS_PAYMENT}
                          onChange={() => setPaymentType(PaymentType.PROGRESS_PAYMENT)}
                        />
                        Pembayaran Termin
                      </label>
                      {paymentType !== PaymentType.FULL_PAYMENT && (
                        <div className="space-y-2">
                          <Label htmlFor="direct-purchase-payment-amount">
                            Nominal Transfer (Rp)
                          </Label>
                          <Input
                            id="direct-purchase-payment-amount"
                            type="number"
                            min="0.01"
                            max={Math.max(0, remainingAmount - 0.01)}
                            step="0.01"
                            required
                            value={paymentAmount}
                            onChange={(event) => setPaymentAmount(event.target.value)}
                          />
                        </div>
                      )}
                    </section>
                    <div className="space-y-2">
                      <Label htmlFor="direct-purchase-transfer-destination">
                        Tujuan Transfer (Bank, No Rekening, Atas Nama)
                      </Label>
                      <Input
                        key={activeDirectPurchase.id}
                        id="direct-purchase-transfer-destination"
                        name="transferDestination"
                        defaultValue={
                          activeDirectPurchase.paymentBankName &&
                          activeDirectPurchase.paymentAccountNumber
                            ? `Ditransfer ke: ${activeDirectPurchase.paymentBankName}, ${activeDirectPurchase.paymentAccountNumber}, a.n. ${activeDirectPurchase.paymentAccountName ?? activeDirectPurchase.vendorName}`
                            : ""
                        }
                        placeholder="Bank, nomor rekening, atas nama penerima"
                        maxLength={300}
                        required
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bukti pembayaran</Label>
                      <FinancePaymentProofUpload
                        value={receiptUrl}
                        onChange={setReceiptUrl}
                        cloudinaryCloudName={cloudinaryCloudName}
                        cloudinaryApiKey={cloudinaryApiKey}
                        disabled={isPending}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        !receiptUrl ||
                        isPending ||
                        (paymentType !== PaymentType.FULL_PAYMENT &&
                          (!paymentAmount || Number(paymentAmount) <= 0))
                      }
                    >
                      {isPending
                        ? "Memproses..."
                        : paymentType === PaymentType.FULL_PAYMENT
                          ? "Selesaikan Pembayaran"
                          : paymentType === PaymentType.DOWN_PAYMENT
                            ? "Catat Uang Muka"
                            : "Catat Pembayaran Termin"}
                    </Button>
                  </form>
                )}
              </section>
            )}
            {activeTicket && (
              <>
                <div className="space-y-1 rounded-lg border p-4 text-sm">
                  <p>
                    Nilai: <strong>{currency(activeTicket.totalAmount)}</strong>
                  </p>
                  <p>Penerima: {activeTicket.recipientName ?? "Tidak dicantumkan"}</p>
                  <p>Bank: {activeTicket.bankName ?? "Tidak dicantumkan"}</p>
                  <p>Rekening: {activeTicket.accountNumber ?? "Tidak dicantumkan"}</p>
                  <p>Rekening PO: {activeTicket.vendorBankName ?? "Tidak dicantumkan"} · {activeTicket.vendorAccountNumber ?? "—"} · {activeTicket.vendorAccountName ?? "—"}</p>
                  <p>
                    Total dibayar: <strong>{currency(paidAmount)}</strong> ·
                    Sisa tagihan: <strong>{currency(remainingAmount)}</strong>
                  </p>
                </div>
                <DocumentPdfGenerator
                  key={`TICKET:${activeTicket.id}`}
                  recordType="TICKET"
                  recordId={activeTicket.id}
                  documentNumber={activeTicket.ticketNumber}
                  templates={documentTemplates}
                />
                {role === UserRole.FINANCE && (
                  <form className="space-y-3" onSubmit={submitPayment}>
                    <section className="space-y-2 rounded-lg border p-3 text-sm">
                      <Label>Jenis pembayaran</Label>
                      <label className="flex items-center gap-2 font-normal">
                        <input
                          type="radio"
                          name="paymentType"
                          checked={paymentType === PaymentType.FULL_PAYMENT}
                          onChange={() => setPaymentType(PaymentType.FULL_PAYMENT)}
                        />
                        Bayar Lunas (Full Payment)
                      </label>
                      <label className="flex items-center gap-2 font-normal">
                        <input
                          type="radio"
                          name="paymentType"
                          checked={paymentType === PaymentType.DOWN_PAYMENT}
                          onChange={() => setPaymentType(PaymentType.DOWN_PAYMENT)}
                        />
                        Bayar Uang Muka (DP) / Sebagian
                      </label>
                      <label className="flex items-center gap-2 font-normal">
                        <input
                          type="radio"
                          name="paymentType"
                          checked={paymentType === PaymentType.PROGRESS_PAYMENT}
                          onChange={() => setPaymentType(PaymentType.PROGRESS_PAYMENT)}
                        />
                        Pembayaran Termin
                      </label>
                      {paymentType !== PaymentType.FULL_PAYMENT && (
                        <div className="space-y-2">
                          <Label htmlFor="ticket-payment-amount">Nominal Transfer (Rp)</Label>
                          <Input
                            id="ticket-payment-amount"
                            type="number"
                            min="0.01"
                            max={Math.max(0, remainingAmount - 0.01)}
                            step="0.01"
                            required
                            value={paymentAmount}
                            onChange={(event) => setPaymentAmount(event.target.value)}
                          />
                        </div>
                      )}
                    </section>
                    <div className="space-y-2">
                      <Label htmlFor="transfer-destination">Keterangan tujuan transfer</Label>
                      <Input
                        key={activeTicket.id}
                        id="transfer-destination"
                        name="transferDestination"
                        defaultValue={
                          activeTicket.transferDestination ??
                          (activeTicket.vendorBankName &&
                          activeTicket.vendorAccountNumber
                            ? `Ditransfer ke: ${activeTicket.vendorBankName} & ${activeTicket.vendorAccountNumber}`
                            : "")
                        }
                        placeholder="Ditransfer ke: [Nama Bank] & [Nomor Rekening Vendor]"
                        maxLength={300}
                        required
                        disabled={isPending}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bukti transfer</Label>
                      <FinancePaymentProofUpload
                        value={receiptUrl}
                        onChange={setReceiptUrl}
                        cloudinaryCloudName={cloudinaryCloudName}
                        cloudinaryApiKey={cloudinaryApiKey}
                        disabled={isPending}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={
                        !receiptUrl ||
                        isPending ||
                        (paymentType !== PaymentType.FULL_PAYMENT &&
                          (!paymentAmount || Number(paymentAmount) <= 0))
                      }
                    >
                      {isPending
                        ? "Memproses..."
                        : paymentType === PaymentType.FULL_PAYMENT
                          ? "Selesaikan Pembayaran"
                          : paymentType === PaymentType.DOWN_PAYMENT
                            ? "Catat Pembayaran DP"
                            : "Catat Pembayaran Termin"}
                    </Button>
                  </form>
                )}
              </>
            )}
            {paymentHistory.length > 0 && (
              <section className="space-y-2 rounded-lg border p-4">
                <h3 className="font-semibold">Riwayat Pembayaran</h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[540px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-2 pr-3">Tanggal</th>
                        <th className="py-2 pr-3">Jenis</th>
                        <th className="py-2 pr-3">Jumlah</th>
                        <th className="py-2 pr-3">Tujuan Transfer</th>
                        <th className="py-2">Bukti</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
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
                          <td className="py-2 pr-3">{currency(payment.amount)}</td>
                          <td className="py-2 pr-3">{payment.transferDestination}</td>
                          <td className="py-2">
                            {payment.proofOfTransferUrl ? (
                              <Button asChild size="sm" variant="outline">
                                <a
                                  href={paymentReceiptHref(
                                    payment.proofOfTransferUrl,
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <ReceiptText
                                    className="mr-2 size-4"
                                    aria-hidden="true"
                                  />
                                  Lihat Bukti Transfer
                                </a>
                              </Button>
                            ) : (
                              "—"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Badge
                  variant={
                    isPaymentSettled
                      ? "success"
                      : paidAmount > 0
                        ? "warning"
                        : "error"
                  }
                >
                  {paymentStatusLabel}
                </Badge>
              </section>
            )}
            {message && (
              <p className="text-sm" role="status">
                {message}
              </p>
            )}
          </div>
          <SheetFooter className="mt-6">
            <SheetClose asChild>
              <Button variant="outline" type="button">Tutup</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <PaymentModal
        key={
          selectedPaymentRow
            ? `${selectedPaymentRow.kind}:${selectedPaymentRow.id}:${selectedPaymentRow.grandTotal}:${selectedPaymentRow.paidAmount}`
            : "closed"
        }
        open={paymentModalSelection !== null}
        onOpenChange={(open) => {
          if (!open) setPaymentModalSelection(null);
        }}
        target={selectedPaymentRow}
        onPay={submitModalPayment}
        cloudinaryCloudName={cloudinaryCloudName}
        cloudinaryApiKey={cloudinaryApiKey}
      />
    </div>
  );
}
