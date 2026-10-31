import Image from "next/image";
import { POPaymentMethod } from "@/generated/prisma/enums";

export interface PurchaseOrderTemplateItem {
  itemName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrderTemplateProps {
  poNumber: string;
  date: string;
  vendorName: string;
  vendorAddress?: string | null;
  vendorContact?: string | null;
  vendorPhone?: string | null;
  paymentMethod?: POPaymentMethod;
  paymentBankName?: string;
  paymentAccountNumber?: string;
  paymentAccountName?: string;
  paymentTerms: string;
  includeTax?: boolean;
  projectSiteName?: string;
  items: PurchaseOrderTemplateItem[];
  logisticsStaffName?: string;
  financeReviewerName?: string;
  financeReviewedAt?: string;
  approvedByName?: string;
  approvedAt?: string;
  qrDataUrl?: string | null;
}

const currency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);

function PurchaseOrderMetaRow({
  label,
  value,
  wide = false,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <p
      className={`grid ${
        wide
          ? "grid-cols-[minmax(0,0.45fr)_8px_minmax(0,1.55fr)]"
          : "grid-cols-[minmax(0,0.9fr)_8px_minmax(0,1.1fr)]"
      } items-start gap-x-1 leading-snug`}
    >
      <strong>{label}</strong>
      <span>:</span>
      <span className="min-w-0 break-words">{value}</span>
    </p>
  );
}

export default function PurchaseOrderTemplate({
  poNumber,
  date,
  vendorName,
  vendorAddress,
  vendorContact,
  vendorPhone,
  paymentMethod = POPaymentMethod.CASH,
  paymentBankName,
  paymentAccountNumber,
  paymentAccountName,
  paymentTerms,
  includeTax = false,
  projectSiteName,
  items,
  logisticsStaffName,
  financeReviewerName,
  financeReviewedAt,
  approvedByName,
  approvedAt,
  qrDataUrl,
}: PurchaseOrderTemplateProps) {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = includeTax ? subtotal * 0.11 : 0;

  return (
    <article className="mx-auto w-full max-w-[210mm] border bg-white p-3 font-sans text-xs text-slate-800 shadow-md print:border-0 print:p-0 print:shadow-none md:p-4">
      <div>
        <header className="mb-2 flex items-start justify-between gap-4">
          <Image
            src="/images/logos/cop-surat.png"
            alt="SKALA PRIORITAS ENGINEERING — Takengon"
            width={400}
            height={90}
            className="h-auto w-[48%] max-w-[330px] object-contain object-left"
            priority
          />
          <div className="flex w-[48%] flex-col items-end text-right">
            <h2 className="text-xl font-black tracking-wide text-[#102A4D]">
              PURCHASE ORDER
            </h2>
            <div className="mt-1 flex w-full items-center justify-end gap-2">
              <div className="relative h-3 w-[42%] shrink-0">
                <span className="absolute left-0 top-0 h-[5px] w-full bg-[#E67E22]" />
                <span className="absolute right-0 top-[7px] h-[5px] w-[62%] bg-[#102A4D]" />
              </div>
              <p className="whitespace-nowrap text-xs font-bold text-[#E67E22]">
                PESANAN PEMBELIAN
              </p>
            </div>
            <div
              className="relative mt-3 inline-block border-2 border-transparent px-3 py-1"
              style={{
                background:
                  "linear-gradient(white, white) padding-box, linear-gradient(90deg, #E67E22 0 48%, #102A4D 48% 100%) border-box",
              }}
            >
              <span className="font-bold text-[#102A4D]">NO. PO: {poNumber || "........................"}</span>
            </div>
          </div>
        </header>

        <section className="mb-2 grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border-2 border-[#102A4D] bg-slate-100 p-2 text-sm leading-tight print:text-[9px]">
          <div className="space-y-0.5">
            <PurchaseOrderMetaRow
              label="Kepada / To (Vendor)"
              value={vendorName || "..................................."}
            />
            <PurchaseOrderMetaRow label="Alamat / Address" value={vendorAddress || "-"} />
            <PurchaseOrderMetaRow label="Kontak / Contact" value={vendorContact || "-"} />
            <PurchaseOrderMetaRow
              label="No. Telp / Phone No."
              value={vendorPhone || "-"}
            />
          </div>
          <div className="space-y-0.5">
            <PurchaseOrderMetaRow
              label="Tanggal / PO Date"
              value={date || "..................................."}
            />
            <PurchaseOrderMetaRow
              label="Tanggal Kirim / Delivery Date"
              value="..................................."
            />
            <PurchaseOrderMetaRow
              label="Metode Pembayaran"
              value={paymentMethod === POPaymentMethod.TRANSFER ? "Transfer" : "Cash"}
            />
            {paymentMethod === POPaymentMethod.TRANSFER && (
              <>
                <PurchaseOrderMetaRow
                  label="Bank Tujuan"
                  value={paymentBankName || "-"}
                />
                <PurchaseOrderMetaRow
                  label="No. Rekening"
                  value={paymentAccountNumber || "-"}
                />
                <PurchaseOrderMetaRow
                  label="Nama Pemilik Rekening"
                  value={paymentAccountName || "-"}
                />
              </>
            )}
            <PurchaseOrderMetaRow
              label="Proyek / Site Project"
              value={projectSiteName || "Gudang (tanpa proyek)"}
            />
          </div>
          <div className="col-span-2">
            <PurchaseOrderMetaRow
              label="Syarat Bayar / Payment Terms"
              value={paymentTerms || "..................................."}
              wide
            />
          </div>
        </section>

        <table className="w-full border-collapse border border-[#102A4D] text-[10px]">
          <thead>
            <tr className="bg-[#102A4D] text-center font-bold uppercase text-white">
              <th className="w-10 border border-[#102A4D] px-1.5 py-1">No</th>
              <th className="w-24 border border-[#102A4D] px-1.5 py-1">Kode Barang / Item Code</th>
              <th className="border border-[#102A4D] px-1.5 py-1 text-left">Deskripsi Barang / Material</th>
              <th className="w-16 border border-[#102A4D] px-1.5 py-1">Qty</th>
              <th className="w-20 border border-[#102A4D] px-1.5 py-1">Satuan</th>
              <th className="w-28 border border-[#102A4D] px-1.5 py-1">Harga Satuan</th>
              <th className="w-28 border border-[#102A4D] px-1.5 py-1">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${item.itemName}-${index}`} className="break-inside-avoid odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-1.5 py-0.5 text-center">{index + 1}</td>
                <td className="border border-slate-300 px-1.5 py-0.5 text-center font-mono">-</td>
                <td className="border border-slate-300 px-1.5 py-0.5 font-medium">{item.itemName}</td>
                <td className="border border-slate-300 px-1.5 py-0.5 text-center">{item.quantity}</td>
                <td className="border border-slate-300 px-1.5 py-0.5 text-center">{item.unit}</td>
                <td className="border border-slate-300 px-1.5 py-0.5 text-right">{currency(item.unitPrice)}</td>
                <td className="border border-slate-300 px-1.5 py-0.5 text-right">{currency(item.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="ml-auto grid max-w-sm break-inside-avoid grid-cols-2 gap-x-4 gap-y-0 border border-slate-300 p-1.5 text-[10px]">
          <span className="font-semibold">SUB TOTAL</span><span className="text-right">Rp {currency(subtotal)}</span>
          <span className="font-semibold">PPN 11% / VAT {includeTax ? "" : "(tidak dikenakan)"}</span><span className="text-right">{includeTax ? `Rp ${currency(tax)}` : "—"}</span>
          <strong className="border-t border-slate-300 pt-1 text-[#102A4D]">TOTAL</strong>
          <strong className="border-t border-slate-300 pt-1 text-right text-[#102A4D]">Rp {currency(subtotal + tax)}</strong>
        </div>

        <section className="mt-2 text-[10px]">
          <h3 className="font-bold">SYARAT &amp; KETENTUAN / TERMS &amp; CONDITIONS</h3>
          <ol className="mt-1 list-inside list-decimal space-y-0.5">
            <li>Harap cantumkan nomor PO ini pada semua dokumen pengiriman dan invoice.</li>
            <li>Barang harus dikirim sesuai spesifikasi dan tanggal yang disepakati.</li>
            <li>Invoice harus disertai Surat Jalan (DO) asli dan copy PO ini.</li>
          </ol>
        </section>

        <section className="mt-5 w-full break-inside-avoid">
          <div className="grid grid-cols-3 gap-3 text-center text-sm font-bold text-[#102A4D] print:text-[10px]">
            <div>Dibuat Oleh / Prepared By</div>
            <div>Diperiksa Oleh / Checked By</div>
            <div>Disetujui Oleh / Approved By</div>
          </div>
          <div className="mt-2 grid h-[120px] grid-cols-3 items-end gap-3 text-center text-xs">
            <div className="flex h-full flex-col items-center justify-end">
              <div className="mt-auto">
                <p className="font-bold text-[#102A4D] underline">
                  {logisticsStaffName || "................................"}
                </p>
                <p className="font-normal text-slate-600">
                  Staf Logistik / Procurement
                </p>
              </div>
            </div>
            <div className="flex h-full flex-col items-center justify-end">
              {financeReviewerName && (
                <div className="mb-2 inline-block border-2 border-[#102A4D] px-3 py-1 text-[9px] font-bold text-[#102A4D]">
                  CHECKED BY
                </div>
              )}
              <div className="mt-auto w-full border-t border-[#102A4D] pt-1">
                <p className="font-bold text-[#102A4D]">
                  {financeReviewerName || "................................"}
                </p>
                <p className="font-normal text-slate-600">Manager Keuangan</p>
                {financeReviewedAt && (
                  <p className="text-[9px] font-normal text-slate-500">
                    Diperiksa {financeReviewedAt}
                  </p>
                )}
              </div>
            </div>
            <div className="flex h-full flex-col items-center justify-end">
              {qrDataUrl && (
                <Image
                  src={qrDataUrl}
                  alt="QR verifikasi persetujuan Purchase Order"
                  width={64}
                  height={64}
                  unoptimized
                  className="mb-1 size-16 object-contain"
                />
              )}
              <div className="mt-auto">
                <p className="font-bold text-[#102A4D]">
                  {approvedByName || "................................"}
                </p>
                <p className="font-normal text-slate-600">
                  Direktur / Wakil Direktur
                </p>
                {approvedAt && (
                  <p className="text-[9px] font-normal text-slate-500">
                    {approvedAt}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-3 flex items-center gap-3 pt-1">
        <span className="h-[5px] flex-1 bg-[#E67E22]" />
        <p className="whitespace-nowrap text-sm font-black tracking-widest text-[#E67E22]">
          ADAPT, IMPROVISE AND FINISH
        </p>
      </footer>
    </article>
  );
}
