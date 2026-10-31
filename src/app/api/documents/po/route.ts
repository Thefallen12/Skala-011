import { existsSync } from "node:fs";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { TicketType, DocType, UserRole } from "@/generated/prisma/enums";
import { isValidPublicCode } from "@/lib/documents/random-code";
import { auth } from "../../../../../auth";
import { canManageUsers } from "@/lib/user-access";
import { prisma } from "@/lib/prisma";
import {
  generateDocument,
  type DocumentLineItem,
} from "@/lib/documents/generate-document";
import {
  createBrandedQrDataUrl,
  getDocumentHeaderLogoDataUrl,
} from "@/lib/documents/qr-code";
import { resolvePublicAppUrl } from "@/lib/documents/public-app-url";
import { projectSiteName } from "@/lib/documents/project-site-name";
import { renderPdf } from "@/lib/documents/render-pdf";

export const runtime = "nodejs";

function localChromePath(): string | null {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  if (process.platform !== "win32") return null;

  const candidates = [
    join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
  ];
  return candidates.find(existsSync) ?? null;
}
async function launchBrowser() {
  const localExecutable = localChromePath();
  if (localExecutable) {
    return puppeteer.launch({
      executablePath: localExecutable,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      headless: true,
    });
  }

  if (process.platform === "win32") {
    throw new Error(
      "Browser PDF lokal tidak ditemukan. Set CHROME_PATH ke Chrome atau Edge yang terpasang.",
    );
  }

  return puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });
}

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
      { message: "Kode Purchase Order tidak valid." },
      { status: 400 },
    );
  }
  const purchaseOrder = await prisma.purchaseOrder.findUnique({
    where: { publicCode },
    select: {
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
      status: true,
      createdAt: true,
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
      reviewedAt: true,
      approvedBy: { select: { name: true } },
      approvedAt: true,
      ticket: {
        select: {
          project: {
            select: {
              kelompokTani: true,
              location: true,
            },
          },
        },
      },
      items: {
        select: {
          itemName: true,
          quantity: true,
          unit: true,
          unitPrice: true,
          totalPrice: true,
        },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!purchaseOrder) {
    return NextResponse.json(
      { message: "Purchase Order tidak ditemukan." },
      { status: 404 },
    );
  }
  const vendor =
    purchaseOrder.vendor ??
    (await prisma.vendor.findFirst({
      where: { name: { equals: purchaseOrder.vendorName, mode: "insensitive" } },
      select: {
        address: true,
        phone: true,
        email: true,
        bankName: true,
        bankAccount: true,
        bankHolder: true,
      },
    }));
  const publicAppUrl = resolvePublicAppUrl();
  if (!publicAppUrl) {
    return NextResponse.json(
      {
        message:
          "Atur NEXT_PUBLIC_APP_URL ke URL HTTPS publik aplikasi agar QR verifikasi dapat dipindai.",
      },
      { status: 500 },
    );
  }

  try {
    const [qrDataUrl, headerLogoDataUrl] = await Promise.all([
      createBrandedQrDataUrl(
        new URL(
          `/verify/po/${encodeURIComponent(publicCode)}`,
          publicAppUrl,
        ).toString(),
        320,
      ),
      getDocumentHeaderLogoDataUrl(),
    ]);
    const currency = (amount: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);
    const subtotal = purchaseOrder.items.reduce(
      (total, item) => total + item.totalPrice,
      0,
    );
    const rows = purchaseOrder.items
      .map(
        (item, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td class="center">-</td>
            <td>${escapeHtml(item.itemName)}</td>
            <td class="center">${item.quantity}</td>
            <td class="center">${escapeHtml(item.unit)}</td>
            <td class="money">${currency(item.unitPrice)}</td>
            <td class="money">${currency(item.totalPrice)}</td>
          </tr>`,
      )
      .join("");
    const html = `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>${escapeHtml(purchaseOrder.poNumber)}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            * { box-sizing: border-box; }
            body { color: #1e293b; font: 10pt Arial, sans-serif; }
            header { display: flex; align-items: flex-start; justify-content: space-between; padding-bottom: 4px; }
            h2 { color: #102a4d; margin: 0; }
            h2 { font-size: 18pt; text-align: right; }
            .company-logo { display: block; width: 48%; max-width: 330px; height: auto; object-fit: contain; object-position: left top; }
            .document-heading { width: 48%; display: flex; flex-direction: column; align-items: flex-end; text-align: right; }
            .title-row { display: flex; width: 100%; align-items: center; justify-content: flex-end; gap: 8px; }
            .title-rule { position: relative; flex: 0 0 42%; height: 12px; }
            .title-rule::before, .title-rule::after { content: ""; position: absolute; right: 0; height: 5px; }
            .title-rule::before { top: 0; left: 0; background: #e67e22; }
            .title-rule::after { top: 7px; width: 62%; background: #102a4d; }
            .number-box { margin-top: 8px; border: 2px solid transparent; background: linear-gradient(#fff,#fff) padding-box, linear-gradient(90deg,#e67e22 0 48%,#102a4d 48% 100%) border-box; padding: 5px 10px; }
            .orange { color: #e67e22; font-weight: bold; }
            .meta { background: #f1f5f9; border: 2px solid #102a4d; border-radius: 10px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); column-gap: 16px; row-gap: 4px; margin: 10px 0 6px; padding: 8px; }
            .meta-column { display: grid; align-content: start; gap: 3px; min-width: 0; }
            .meta-row { display: grid; grid-template-columns: minmax(0, 0.9fr) 8px minmax(0, 1.1fr); gap: 4px; align-items: start; margin: 0; font-size: 9pt; line-height: 1.2; }
            .meta-row-wide { grid-column: 1 / -1; grid-template-columns: minmax(0, 0.45fr) 8px minmax(0, 1.55fr); }
            .meta-row > * { min-width: 0; overflow-wrap: anywhere; }
            table { border-collapse: collapse; width: 100%; }
            th { background: #102a4d; color: white; }
            th, td { border: 1px solid #94a3b8; padding: 4px 6px; }
            .center { text-align: center; }
            .money { text-align: right; white-space: nowrap; }
            .summary { margin: 0 0 0 auto; border: 1px solid #cbd5e1; border-top: 0; padding: 5px 8px; width: 42%; font-size: 9pt; }
            .summary p { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
            .summary-total { border-top: 1px solid #94a3b8; padding-top: 4px; color: #102a4d; font-weight: bold; }
            .terms { margin-top: 8px; font-size: 9pt; }
            .terms ol { margin: 5px 0; padding-left: 18px; }
            .signatures { margin-top: 18px; break-inside: avoid; page-break-inside: avoid; text-align: center; }
            .signature-headings, .signature-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
            .signature-headings { color: #102a4d; font-size: 10pt; font-weight: bold; }
            .signature-row { height: 120px; margin-top: 6px; align-items: end; font-size: 9pt; }
            .signature-column { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; min-width: 0; }
            .signature-name { width: 100%; padding-top: 4px; }
            .signature-name strong { color: #102a4d; }
            .review-stamp { align-self: center; border: 1px solid #102a4d; color: #102a4d; font-size: 10px; font-weight: 700; letter-spacing: .08em; padding: 5px 10px; }
            .reviewer-name small { color: #475569; font-size: 8px; }
            .qr { height: 64px; width: 64px; object-fit: contain; margin: 0 auto 4px; }
            .footer { display: flex; align-items: center; gap: 12px; color: #e67e22; font-weight: 900; letter-spacing: 2px; margin-top: 16px; }
            .footer-rule { flex: 1; height: 5px; background: #e67e22; }
          </style>
        </head>
        <body>
          <header>
            <img class="company-logo" src="${headerLogoDataUrl}" alt="SKALA PRIORITAS ENGINEERING — Takengon">
            <div class="document-heading">
              <h2>PURCHASE ORDER</h2>
              <div class="title-row"><span class="title-rule"></span><p class="orange">PESANAN PEMBELIAN</p></div>
              <div class="number-box"><strong>NO. PO: ${escapeHtml(purchaseOrder.poNumber)}</strong></div>
            </div>
          </header>
          <section class="meta">
            <div class="meta-column">
              <p class="meta-row"><strong>Kepada / To (Vendor)</strong><span>:</span><span>${escapeHtml(purchaseOrder.vendorName)}</span></p>
              <p class="meta-row"><strong>Alamat / Address</strong><span>:</span><span>${escapeHtml(vendor?.address ?? "-")}</span></p>
              <p class="meta-row"><strong>Kontak / Contact</strong><span>:</span><span>${escapeHtml(vendor?.email ?? "-")}</span></p>
              <p class="meta-row"><strong>No. Telp / Phone No.</strong><span>:</span><span>${escapeHtml(vendor?.phone ?? "-")}</span></p>
            </div>
            <div class="meta-column">
              <p class="meta-row"><strong>Tanggal / PO Date</strong><span>:</span><span>${purchaseOrder.createdAt.toLocaleDateString("id-ID")}</span></p>
              <p class="meta-row"><strong>Tanggal Kirim / Delivery Date</strong><span>:</span><span>...................................</span></p>
              <p class="meta-row"><strong>Metode Pembayaran</strong><span>:</span><span>${purchaseOrder.paymentMethod === "TRANSFER" ? "Transfer" : "Cash"}</span></p>
              ${purchaseOrder.paymentMethod === "TRANSFER" ? `
                <p class="meta-row"><strong>Bank Tujuan</strong><span>:</span><span>${escapeHtml(purchaseOrder.paymentBankName ?? vendor?.bankName ?? "-")}</span></p>
                <p class="meta-row"><strong>No. Rekening</strong><span>:</span><span>${escapeHtml(purchaseOrder.paymentAccountNumber ?? vendor?.bankAccount ?? "-")}</span></p>
                <p class="meta-row"><strong>Nama Pemilik Rekening</strong><span>:</span><span>${escapeHtml(purchaseOrder.paymentAccountName ?? vendor?.bankHolder ?? "-")}</span></p>
              ` : ""}
              <p class="meta-row"><strong>Proyek / Site Project</strong><span>:</span><span>${escapeHtml(projectSiteName(purchaseOrder.ticket?.project?.kelompokTani, purchaseOrder.ticket?.project?.location))}</span></p>
            </div>
            <p class="meta-row meta-row-wide"><strong>Syarat Bayar / Payment Terms</strong><span>:</span><span>${escapeHtml(purchaseOrder.paymentTerms ?? "-")}</span></p>
          </section>
          <table>
            <thead><tr><th>No</th><th>Kode Barang / Item Code</th><th>Deskripsi Barang / Material</th><th>Qty</th><th>Satuan / Unit</th><th>Harga Satuan / Unit Price</th><th>Total / Amount</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <section class="summary">
            <p><strong>SUB TOTAL:</strong><span>${currency(subtotal)}</span></p>
            <p><strong>PPN 11% / VAT${purchaseOrder.includeTax ? "" : " (tidak dikenakan)"}:</strong><span>${purchaseOrder.includeTax ? currency(subtotal * 0.11) : "-"}</span></p>
            <p class="summary-total"><strong>TOTAL:</strong><span>${currency(subtotal + (purchaseOrder.includeTax ? subtotal * 0.11 : 0))}</span></p>
          </section>
          <section class="terms">
            <strong>SYARAT &amp; KETENTUAN / TERMS &amp; CONDITIONS</strong>
            <ol>
              <li>Harap cantumkan nomor PO ini pada semua dokumen pengiriman dan invoice.</li>
              <li>Barang harus dikirim sesuai spesifikasi dan tanggal yang disepakati.</li>
              <li>Invoice harus disertai Surat Jalan (DO) asli dan copy PO ini.</li>
            </ol>
          </section>
          <section class="signatures">
            <div class="signature-headings">
              <div>Dibuat Oleh / Prepared By</div>
              <div>Diperiksa Oleh / Checked By</div>
              <div>Disetujui Oleh / Approved By</div>
            </div>
            <div class="signature-row">
              <div class="signature-column">
                <div class="signature-name">
                  <strong>${escapeHtml(purchaseOrder.createdBy?.name ?? "........................")}</strong><br>
                  Staf Logistik / Procurement
                </div>
              </div>
              <div class="signature-column">
                ${purchaseOrder.reviewedBy ? '<div class="review-stamp">CHECKED BY</div>' : ""}
                <div class="signature-name reviewer-name">
                  <strong>${escapeHtml(purchaseOrder.reviewedBy?.name ?? "........................")}</strong><br>
                  Manager Keuangan<br>
                  <small>${purchaseOrder.reviewedAt ? `Diperiksa ${escapeHtml(purchaseOrder.reviewedAt.toLocaleString("id-ID"))}` : "Belum diperiksa"}</small>
                </div>
              </div>
              <div class="signature-column">
                <img class="qr" src="${qrDataUrl}" alt="QR verifikasi PO">
                <div class="signature-name">
                  <strong>${escapeHtml(purchaseOrder.approvedBy?.name ?? "........................")}</strong><br>
                  Direktur / Wakil Direktur<br>
                  ${purchaseOrder.approvedAt?.toLocaleDateString("id-ID") ?? ""}
                </div>
              </div>
            </div>
          </section>
          <div class="footer"><span class="footer-rule"></span><span>ADAPT, IMPROVISE AND FINISH</span></div>
        </body>
      </html>`;
    const pdf = await renderPdf(html);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${request.nextUrl.searchParams.get("download") === "1" ? "attachment" : "inline"}; filename="${encodeURIComponent(purchaseOrder.poNumber)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Purchase Order PDF preview failed:", error);
    return NextResponse.json(
      { message: "PDF PO gagal dibuat. Periksa konfigurasi browser PDF." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !role) {
    return NextResponse.json(
      { message: "Silakan masuk terlebih dahulu." },
      { status: 401 },
    );
  }
  if (role !== UserRole.LOGISTICS && !canManageUsers(role)) {
    return NextResponse.json(
      { message: "Hanya Logistik, Direktur, atau Administrasi yang dapat mencetak PO." },
      { status: 403 },
    );
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Isi permintaan cetak PO tidak valid." },
      { status: 400 },
    );
  }
  const ticketId =
    typeof requestBody === "object" &&
    requestBody !== null &&
    "ticketId" in requestBody &&
    typeof requestBody.ticketId === "string"
      ? requestBody.ticketId
      : "";
  if (!ticketId) {
    return NextResponse.json(
      { message: "ID request material wajib diberikan." },
      { status: 400 },
    );
  }

  const ticket = await prisma.ticket.findFirst({
    where: { id: ticketId, type: TicketType.MATERIAL },
    select: {
      ticketNumber: true,
      title: true,
      createdAt: true,
      totalAmount: true,
      requester: { select: { name: true } },
      project: {
        select: { title: true, vendor: true, clientName: true, location: true },
      },
      items: {
        select: {
          itemName: true,
          quantity: true,
          unit: true,
          estimatedCost: true,
        },
      },
    },
  });
  if (!ticket) {
    return NextResponse.json(
      { message: "Request material tidak ditemukan." },
      { status: 404 },
    );
  }

  const template = await prisma.documentTemplate.findFirst({
    where: { type: DocType.PURCHASE_ORDER },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  });
  if (!template) {
    return NextResponse.json(
      { message: "Template Purchase Order belum tersedia. Buat template terlebih dahulu." },
      { status: 404 },
    );
  }

  const configuredBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL;
  const verificationBaseUrl =
    configuredBaseUrl ??
    (process.env.NODE_ENV === "development"
      ? request.nextUrl.origin
      : undefined);
  if (!verificationBaseUrl) {
    return NextResponse.json(
      {
        message:
          "Atur NEXT_PUBLIC_APP_URL pada environment produksi untuk membuat tautan verifikasi dokumen.",
      },
      { status: 500 },
    );
  }

  let browser: Awaited<ReturnType<typeof launchBrowser>> | undefined;
  let issuedDocumentId: string | undefined;
  try {
    const currency = (amount: number) =>
      new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(amount);
    const generated = await generateDocument(template.id, {
      nomor_request: ticket.ticketNumber,
      judul_request: ticket.title,
      nama_requester: ticket.requester.name,
      nama_proyek: ticket.project?.title ?? "—",
      nama_klien: ticket.project?.clientName ?? "—",
      total_biaya: ticket.totalAmount ? currency(Number(ticket.totalAmount)) : "—",
      diskon: "—",
      pajak: "—",
      tanggal: ticket.createdAt,
      tanggal_spk: ticket.createdAt,
      due_date: "—",
      nama_vendor: ticket.project?.vendor ?? "Belum ditentukan",
      alamat_vendor: "—",
      kontak_vendor: "—",
      lokasi_pengiriman:
        ticket.project?.location ??
        ticket.project?.title ??
        "Sesuai koordinasi proyek",
      catatan: ticket.title,
      items: ticket.items.map((item): DocumentLineItem => {
        const unitPrice = Number(item.estimatedCost ?? 0);
        return {
          description: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.estimatedCost ? currency(unitPrice) : "—",
          amount: item.estimatedCost
            ? currency(unitPrice * item.quantity)
            : "—",
        };
      }),
    }, {
      issuedById: session.user.id,
      relatedRecordId: ticketId,
      verificationBaseUrl,
    });
    issuedDocumentId = generated.issuedDocumentId;

    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(
      `<!doctype html>
      <html lang="id">
        <head>
          <meta charset="utf-8">
          <title>Purchase Order</title>
          <style>
            @page { size: A4; margin: ${generated.pageMargins.top}mm ${generated.pageMargins.right}mm ${generated.pageMargins.bottom}mm ${generated.pageMargins.left}mm; }
            body { color: #1f2937; font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; }
            h1, h2, h3 { line-height: 1.25; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #a3a3a3; padding: 7px; text-align: left; }
            th { background: #f1f1f1; letter-spacing: .04em; text-transform: uppercase; }
            .po-header { margin: 0 0 16px; }
            .po-header td, .po-summary > tbody > tr > td, .po-verification td { border: 0; }
            .po-title { font: bold 28pt Georgia, serif; margin: 0 0 20px; }
            .po-logo { display: flex; width: 78px; height: 78px; align-items: center; justify-content: center; margin-left: auto; border: 4px solid #1f2937; border-radius: 12px; font-size: 16pt; font-weight: 800; }
            .po-meta { margin: 0 0 16px; }
            .po-meta td { border: 0; background: #f1f1f1; font-size: 9pt; font-weight: bold; white-space: nowrap; }
            .po-parties { margin: 0 0 16px; }
            .po-items { margin: 0 0 12px; }
            .po-items th { text-align: center; }
            .po-items td:nth-child(n+2) { text-align: right; }
            .number { text-align: center; }
            .money { text-align: right; white-space: nowrap; }
            .po-summary { margin: 0; }
            .po-notes { min-height: 90px; width: 58%; padding: 8px; border: 1px solid #a3a3a3; }
            .po-totals { margin: 0; }
            .po-totals th { background: #f1f1f1; text-align: center; }
            .po-totals th, .po-totals td { border: 1px solid #a3a3a3; }
            .po-footer { margin-top: 20px; text-align: center; font: 11pt Georgia, serif; }
            .po-verification { margin-top: 8px; font-size: 9pt; }
            .verification-qr { margin-top: 16px; text-align: right; }
            img { max-width: 100%; }
          </style>
        </head>
        <body>${generated.html}</body>
      </html>`,
      { waitUntil: "load" },
    );
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: `${generated.pageMargins.top}mm`,
        right: `${generated.pageMargins.right}mm`,
        bottom: `${generated.pageMargins.bottom}mm`,
        left: `${generated.pageMargins.left}mm`,
      },
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(generated.documentNumber)}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Purchase order PDF generation failed:", error);
    if (issuedDocumentId) {
      try {
        await prisma.issuedDocument.update({
          where: { id: issuedDocumentId },
          data: { status: "REVOKED" },
        });
      } catch (revocationError) {
        console.error(
          "Failed to revoke issued document after PDF generation failure:",
          revocationError,
        );
      }
    }
    return NextResponse.json(
      { message: "PDF PO gagal dibuat. Periksa konfigurasi Chrome server dan coba kembali." },
      { status: 500 },
    );
  } finally {
    if (browser) {
      await browser.close().catch((error: unknown) => {
        console.error("PDF browser shutdown failed:", error);
      });
    }
  }
}
