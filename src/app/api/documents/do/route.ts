import { NextRequest, NextResponse } from "next/server";
import { POStatus } from "@/generated/prisma/enums";
import { isValidPublicCode } from "@/lib/documents/random-code";
import { prisma } from "@/lib/prisma";
import {
  createBrandedQrDataUrl,
  getDocumentHeaderLogoDataUrl,
} from "@/lib/documents/qr-code";
import { projectSiteName as formatProjectSiteName } from "@/lib/documents/project-site-name";
import { resolvePublicAppUrl } from "@/lib/documents/public-app-url";
import { renderPdf } from "@/lib/documents/render-pdf";

export const runtime = "nodejs";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function GET(request: NextRequest) {
  const publicCode = request.nextUrl.searchParams.get("publicCode") ?? "";
  if (!isValidPublicCode(publicCode)) {
    return NextResponse.json(
      { message: "Kode Delivery Order tidak valid." },
      { status: 400 },
    );
  }

  const deliveryOrder = await prisma.deliveryOrder.findUnique({
    where: { publicCode },
    select: {
      doNumber: true,
      driverName: true,
      vehicleDocumentNumber: true,
      vehiclePlate: true,
      vehiclePlateNumber: true,
      driverIdentityNumber: true,
      driverPhone: true,
      deliveryMethod: true,
      receiverName: true,
      receivedAt: true,
      receivedBy: { select: { name: true } },
      createdAt: true,
      createdBy: { select: { name: true } },
      ticket: {
        select: {
          isApprovedByDirector: true,
          requester: { select: { name: true } },
          moverAssignee: { select: { name: true } },
          auditLogs: {
            where: { action: "APPROVED_BY_DIR" },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              createdAt: true,
              user: { select: { name: true } },
            },
          },
          project: {
            select: {
              kelompokTani: true,
              location: true,
              vendor: true,
            },
          },
        },
      },
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
      items: {
        select: {
          itemName: true,
          qtyOrdered: true,
          qtyDelivered: true,
          unit: true,
          remarks: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!deliveryOrder) {
    return NextResponse.json(
      { message: "Delivery Order tidak ditemukan." },
      { status: 404 },
    );
  }

  const publicAppUrl = resolvePublicAppUrl();
  if (!publicAppUrl) {
    return NextResponse.json(
      {
        message:
          "Atur NEXT_PUBLIC_APP_URL ke URL HTTPS publik aplikasi agar QR verifikasi DO dapat dipindai.",
      },
      { status: 500 },
    );
  }

  try {
    const [qrDataUrl, approvalQrDataUrl, headerLogoDataUrl] = await Promise.all([
      createBrandedQrDataUrl(
        new URL(
          `/verify/do/${encodeURIComponent(publicCode)}`,
          publicAppUrl,
        ).toString(),
        320,
      ),
      deliveryOrder.po?.status === POStatus.APPROVED &&
      deliveryOrder.po.publicCode
        ? createBrandedQrDataUrl(
            new URL(
              `/verify/po/${encodeURIComponent(deliveryOrder.po.publicCode)}`,
              publicAppUrl,
            ).toString(),
            240,
          )
        : Promise.resolve(null),
      getDocumentHeaderLogoDataUrl(),
    ]);
    const ticketApproval = deliveryOrder.ticket?.auditLogs[0];
    const executiveApprovalLabel =
      deliveryOrder.po?.status === POStatus.APPROVED
        ? `PO ${deliveryOrder.po.poNumber} disetujui ${deliveryOrder.po.approvedBy?.name ?? "Direksi"} pada ${deliveryOrder.po.approvedAt?.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) ?? "tanggal tidak tersedia"}`
        : deliveryOrder.ticket?.isApprovedByDirector
          ? `Tiket disetujui ${ticketApproval?.user.name ?? "Direktur/Wakil Direktur"} pada ${ticketApproval?.createdAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }) ?? "tanggal tidak tersedia"}`
          : "Persetujuan eksekutif belum tercatat";
    const projectName = formatProjectSiteName(
      deliveryOrder.ticket?.project?.kelompokTani,
      deliveryOrder.ticket?.project?.location,
    );
    const driverName =
      deliveryOrder.driverName ??
      deliveryOrder.ticket?.moverAssignee?.name ??
      "-";
    const rows =
      deliveryOrder.items
      .map(
        (item, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td class="center">-</td>
            <td>${escapeHtml(item.itemName)}</td>
            <td class="center">${item.qtyDelivered}</td>
            <td class="center">${escapeHtml(item.unit)}</td>
            <td>${escapeHtml(item.remarks ?? "-")}</td>
          </tr>`,
      )
      .join("") +
      Array.from({ length: Math.max(0, 11 - deliveryOrder.items.length) }, () =>
        "<tr class=\"empty-row\"><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>",
      ).join("");
    const html = `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(deliveryOrder.doNumber)}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            * { box-sizing: border-box; }
            body { color: #1e293b; font: 10pt Arial, sans-serif; }
            header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 4px; }
            h2 { color: #102a4d; font-size: 18pt; margin: 0; text-align: right; }
            .company-logo { display: block; width: 48%; max-width: 330px; height: auto; object-fit: contain; object-position: left top; }
            .document-heading { width: 48%; display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
            .title-row { display: flex; width: 100%; align-items: center; justify-content: flex-end; gap: 8px; }
            .title-rule { position: relative; flex: 0 0 42%; height: 12px; }
            .title-rule::before, .title-rule::after { content: ""; position: absolute; right: 0; height: 5px; }
            .title-rule::before { top: 0; left: 0; background: #e67e22; }
            .title-rule::after { top: 7px; width: 62%; background: #102a4d; }
            .number-box { margin-top: 8px; border: 2px solid transparent; background: linear-gradient(#fff,#fff) padding-box, linear-gradient(90deg,#e67e22 0 48%,#102a4d 48% 100%) border-box; padding: 5px 10px; }
            .orange { color: #e67e22; font-weight: bold; }
            .meta { background: #f1f5f9; border: 2px solid #102a4d; border-radius: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; padding: 12px; }
            .meta p { margin: 4px 0; }
            .meta-row { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: start; gap: 4px; line-height: 1.25; }
            .meta-row > span:last-child { min-width: 0; overflow-wrap: anywhere; }
            .approval { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin: 14px 0; padding: 10px 12px; border: 1px solid #94a3b8; border-left: 4px solid #102a4d; background: #f8fafc; }
            .approval-copy { min-width: 0; }
            .approval-label { color: #102a4d; font-weight: bold; margin-bottom: 4px; }
            .approval-qr { width: 64px; height: 64px; object-fit: contain; flex: 0 0 auto; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #102a4d; color: white; }
            th, td { border: 1px solid #94a3b8; padding: 7px; }
            .center { text-align: center; }
            .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 36px; text-align: center; }
            .signature { min-height: 140px; display: flex; flex-direction: column; justify-content: space-between; }
            .qr { height: 86px; width: 86px; object-fit: contain; margin: 0 auto; }
            .footer { display: flex; align-items: center; gap: 12px; color: #e67e22; font-weight: 900; letter-spacing: 2px; margin-top: 30px; }
            .footer-rule { flex: 1; height: 5px; background: #e67e22; }
          </style>
        </head>
        <body>
          <header>
            <img class="company-logo" src="${headerLogoDataUrl}" alt="SKALA PRIORITAS ENGINEERING — Takengon">
            <div class="document-heading">
              <h2>DELIVERY ORDER</h2>
              <div class="title-row"><span class="title-rule"></span><p class="orange">SURAT JALAN</p></div>
              <div class="number-box"><strong>NO. DO: ${escapeHtml(deliveryOrder.doNumber)}</strong></div>
            </div>
          </header>
          <section class="meta">
            <div>
              <p class="meta-row"><strong>Tanggal / Date</strong><span>:</span><span>${deliveryOrder.createdAt.toLocaleDateString("id-ID")}</span></p>
              <p class="meta-row"><strong>No. PO / Kontrak</strong><span>:</span><span>${escapeHtml(deliveryOrder.po?.poNumber ?? "-")}</span></p>
              <p class="meta-row"><strong>Lokasi Proyek / Site</strong><span>:</span><span>${escapeHtml(projectName)}</span></p>
            </div>
            <div>
              <p class="meta-row"><strong>Vendor / Tujuan</strong><span>:</span><span>${escapeHtml(deliveryOrder.po?.vendorName ?? deliveryOrder.ticket?.project?.vendor ?? deliveryOrder.receiverName ?? "-")}</span></p>
              <p class="meta-row"><strong>Nama Driver / Mover</strong><span>:</span><span>${escapeHtml(driverName)}</span></p>
              <p class="meta-row"><strong>No. Plat Kendaraan</strong><span>:</span><span>${escapeHtml(deliveryOrder.vehiclePlateNumber ?? deliveryOrder.vehiclePlate ?? "-")}</span></p>
              <p class="meta-row"><strong>No. STK</strong><span>:</span><span>${escapeHtml(deliveryOrder.vehicleDocumentNumber ?? "-")}</span></p>
              <p class="meta-row"><strong>NIK Driver</strong><span>:</span><span>${escapeHtml(deliveryOrder.driverIdentityNumber ?? "-")}</span></p>
              <p class="meta-row"><strong>No. HP Driver</strong><span>:</span><span>${escapeHtml(deliveryOrder.driverPhone ?? "-")}</span></p>
              ${deliveryOrder.receivedAt ? `<p class="meta-row"><strong>Penerima Material / Logistik</strong><span>:</span><span>${escapeHtml(deliveryOrder.receivedBy?.name ?? deliveryOrder.receiverName ?? "-")}</span></p><p class="meta-row"><strong>Waktu Material Tiba</strong><span>:</span><span>${escapeHtml(deliveryOrder.receivedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" }))}</span></p>` : ""}
            </div>
          </section>
          <section class="approval">
            <div class="approval-copy">
              <p class="approval-label">Korelasi Persetujuan Eksekutif</p>
              <p>${escapeHtml(executiveApprovalLabel)}</p>
              <p>${deliveryOrder.po?.status === POStatus.APPROVED ? "Persetujuan PO terverifikasi" : deliveryOrder.ticket?.isApprovedByDirector ? "Persetujuan tiket material terverifikasi" : "Status perlu diverifikasi"}</p>
            </div>
            ${approvalQrDataUrl ? `<img class="approval-qr" src="${approvalQrDataUrl}" alt="QR verifikasi persetujuan PO">` : ""}
          </section>
          <table>
            <thead><tr><th>No</th><th>Kode Barang / Code</th><th>Deskripsi Barang / Alat / Material</th><th>Qty</th><th>Satuan / Unit</th><th>Keterangan / Remarks</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <section class="signatures">
            <div class="signature">
              <strong>Dibuat Oleh / Dispatched By</strong>
              <img class="qr" src="${qrDataUrl}" alt="QR dokumen PDF">
              <div><strong>${escapeHtml(deliveryOrder.createdBy?.name ?? "Petugas Logistik")}</strong><br>Pengirim / Logistik</div>
            </div>
            <div class="signature">
              <strong>Dibawa Oleh / Carried By</strong><div></div>
              <div><strong>${escapeHtml(driverName)}</strong><br>Driver / Mover</div>
            </div>
            <div class="signature">
              <strong>${deliveryOrder.receivedAt ? "Diterima di Gudang / Received By" : "Diterima Oleh / Received By"}</strong><div></div>
              <div><strong>${escapeHtml(deliveryOrder.receivedBy?.name ?? deliveryOrder.receiverName ?? "........................")}</strong><br>${deliveryOrder.receivedAt ? "Penerima Material / Logistik" : "Vendor / Penerima"}</div>
            </div>
          </section>
          <div class="footer"><span class="footer-rule"></span><span>ADAPT, IMPROVISE AND FINISH</span></div>
        </body>
      </html>`;
    const pdf = await renderPdf(html);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(deliveryOrder.doNumber)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Delivery Order PDF preview failed:", error);
    return NextResponse.json(
      { message: "PDF DO gagal dibuat. Periksa konfigurasi browser PDF." },
      { status: 500 },
    );
  }
}
