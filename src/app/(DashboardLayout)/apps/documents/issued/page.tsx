import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "../../../../../../auth";
import { prisma } from "@/lib/prisma";
import {
  OperationalDocumentStatus,
  POStatus,
} from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CardBox from "@/app/components/shared/CardBox";
import BreadcrumbComp from "../../../layout/shared/breadcrumb/BreadcrumbComp";
import DocumentWorkspace from "@/app/components/apps/documents/DocumentWorkspace";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Dokumen Terbit",
};

export default async function IssuedDocumentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/login");

  const [documents, purchaseOrders, deliveryOrders] = await Promise.all([
    prisma.operationalDocument.findMany({
      where: {
        status: OperationalDocumentStatus.ISSUED,
        OR: [
          { kind: "CUSTOM" },
          {
            kind: "PURCHASE_ORDER",
            ticket: {
              is: {
                purchaseOrders: { some: { status: POStatus.APPROVED } },
              },
            },
          },
          {
            kind: "DELIVERY_ORDER",
            ticket: { is: { isApprovedByDirector: true } },
          },
        ],
      },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        documentNumber: true,
        kind: true,
        status: true,
        title: true,
        content: true,
        signerName: true,
        signedAt: true,
        issuedAt: true,
        createdAt: true,
        ticket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
          },
        },
        signedBy: { select: { name: true } },
        issuedBy: { select: { name: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { status: POStatus.APPROVED },
      orderBy: { updatedAt: "desc" },
      select: {
        publicCode: true,
        poNumber: true,
        vendorName: true,
        status: true,
        updatedAt: true,
        approvedAt: true,
        approvedBy: { select: { name: true } },
      },
    }),
    prisma.deliveryOrder.findMany({
      where: {
        OR: [
          { ticket: { is: { isApprovedByDirector: true } } },
          { po: { is: { status: POStatus.APPROVED } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        publicCode: true,
        doNumber: true,
        status: true,
        createdAt: true,
        ticket: {
          select: {
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
          },
        },
        po: {
          select: {
            poNumber: true,
            status: true,
            approvedAt: true,
            approvedBy: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return (
    <>
      <BreadcrumbComp
        title="Dokumen Terbit"
        items={[
          { to: "/", title: "Beranda" },
          { title: "Dokumen Terbit" },
        ]}
      />
      <DocumentWorkspace
        templates={[]}
        tickets={[]}
        documents={documents.map((document) => ({
          ...document,
          signedAt: document.signedAt.toISOString(),
          issuedAt: document.issuedAt?.toISOString() ?? null,
          createdAt: document.createdAt.toISOString(),
        }))}
        readOnly
      />
      <CardBox>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Dokumen Digital &amp; Verifikasi QR</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Purchase Order yang sudah disetujui, diambil langsung dari daftar Purchase Orders.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor PO</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Persetujuan Eksekutif</TableHead>
                <TableHead>Tanggal disetujui</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchaseOrders.map((order) => (
                <TableRow key={order.publicCode}>
                  <TableCell className="font-medium">{order.poNumber}</TableCell>
                  <TableCell>{order.vendorName}</TableCell>
                  <TableCell>
                    <Badge variant="lightSuccess">
                      {order.approvedBy?.name ?? "Disetujui Direksi"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {order.approvedAt
                      ? new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                        }).format(order.approvedAt)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/d/${order.publicCode}`}>Review</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {purchaseOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada Purchase Order yang disetujui.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardBox>
      <CardBox>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Surat Jalan dengan Persetujuan Eksekutif</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Setiap DO menampilkan persetujuan tiket material atau PO yang menjadi sumber pengadaannya.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor DO</TableHead>
                <TableHead>Status DO</TableHead>
                <TableHead>Persetujuan terkait</TableHead>
                <TableHead>Disetujui pada</TableHead>
                <TableHead>Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveryOrders.map((order) => {
                const approvedByPo = order.po?.status === POStatus.APPROVED;
                const ticketApproval = order.ticket?.auditLogs[0];
                const approvalName = approvedByPo
                  ? order.po?.approvedBy?.name ?? "Direktur/Wakil Direktur"
                  : ticketApproval?.user.name ?? "Direktur/Wakil Direktur";
                const approvalDate = approvedByPo
                  ? order.po?.approvedAt
                  : ticketApproval?.createdAt;
                return (
                  <TableRow key={order.publicCode}>
                    <TableCell className="font-medium">{order.doNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{approvalName}</div>
                      <div className="text-xs text-muted-foreground">
                        {approvedByPo
                          ? `PO ${order.po?.poNumber}`
                          : "Persetujuan tiket material"}
                      </div>
                    </TableCell>
                    <TableCell>
                      {approvalDate
                        ? new Intl.DateTimeFormat("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                            timeZone: "Asia/Jakarta",
                          }).format(approvalDate)
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/d/${order.publicCode}`}>Review</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {deliveryOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Belum ada Surat Jalan dengan persetujuan eksekutif.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardBox>
    </>
  );
}
