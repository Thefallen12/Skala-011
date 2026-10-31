import Image from "next/image";

export interface DOItem {
  no: number;
  itemCode: string;
  description: string;
  qty: number;
  unit: string;
  remarks: string;
}

export interface DeliveryOrderProps {
  doNumber: string;
  date: string;
  projectName: string;
  poContractNumber: string;
  projectSiteLocation: string;
  vendorDestination: string;
  driverMoverName: string;
  vehiclePlateNumber: string;
  items: DOItem[];
  logisticsStaffName: string;
  qrDataUrl?: string | null;
  driverName: string;
  vehicleDocumentNumber?: string;
  receiverVendorName: string;
  driverIdentityNumber?: string;
  driverPhone?: string;
  receivedAt?: string;
  receivedByName?: string;
}

export default function DeliveryOrderTemplate({
  doNumber,
  date,
  projectName,
  poContractNumber,
  projectSiteLocation,
  vendorDestination,
  driverMoverName,
  vehiclePlateNumber,
  items,
  logisticsStaffName,
  qrDataUrl,
  driverName,
  vehicleDocumentNumber,
  receiverVendorName,
  driverIdentityNumber,
  driverPhone,
  receivedAt,
  receivedByName,
}: DeliveryOrderProps) {
  return (
    <article className="mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col justify-between border bg-white p-6 font-sans text-xs text-slate-800 shadow-md print:min-h-0 print:border-0 print:p-0 print:shadow-none md:p-10">
      <div>
        <header className="mb-4 flex items-start justify-between gap-4 pb-1">
          <Image
            src="/images/logos/cop-surat.png"
            alt="SKALA PRIORITAS ENGINEERING — Takengon"
            width={400}
            height={90}
            className="h-auto w-[48%] max-w-[330px] object-contain object-left"
            priority
          />
          <div className="flex w-[48%] flex-col items-end text-right">
            <h2 className="text-2xl md:text-3xl font-black tracking-wider text-[#102A4D]">
              DELIVERY ORDER
            </h2>
            <div className="mt-1 flex w-full items-center justify-end gap-2">
              <div className="relative h-3 w-[42%] shrink-0">
                <span className="absolute left-0 top-0 h-[5px] w-full bg-[#E67E22]" />
                <span className="absolute right-0 top-[7px] h-[5px] w-[62%] bg-[#102A4D]" />
              </div>
              <p className="whitespace-nowrap text-lg font-bold tracking-wide text-[#E67E22]">
                SURAT JALAN
              </p>
            </div>
            <div
              className="relative mt-3 border-2 border-transparent px-4 py-1"
              style={{
                background:
                  "linear-gradient(white, white) padding-box, linear-gradient(90deg, #E67E22 0 48%, #102A4D 48% 100%) border-box",
              }}
            >
              <span className="font-bold text-[#102A4D] text-xs">
                NO. DO :{" "}
                <span className="font-mono">
                  {doNumber || "....................."}
                </span>
              </span>
            </div>
          </div>
        </header>

        <section className="mb-4 grid grid-cols-2 gap-x-6 rounded-xl border-2 border-[#102A4D] bg-slate-100 p-3 text-[11px]">
          <div className="space-y-1">
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>Tanggal / Date</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {date || "..................................."}
              </span>
            </p>
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>No. PO / Kontrak</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {poContractNumber || "..................................."}
              </span>
            </p>
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>Lokasi Proyek / Site</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {projectName ||
                  projectSiteLocation ||
                  "..................................."}
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>Vendor / Tujuan</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {vendorDestination || "..................................."}
              </span>
            </p>
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>Nama Driver / Mover</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {driverMoverName || "..................................."}
              </span>
            </p>
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>No. Plat Kendaraan</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {vehiclePlateNumber || "..................................."}
              </span>
            </p>
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>No. STK</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {vehicleDocumentNumber || "..................................."}
              </span>
            </p>
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>NIK Driver</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {driverIdentityNumber || "..................................."}
              </span>
            </p>
            <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
              <strong>No. HP Driver</strong>
              <span>:</span>
              <span className="min-w-0 break-words">
                {driverPhone || "..................................."}
              </span>
            </p>
            {receivedAt && (
              <>
                <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
                  <strong>Penerima Material / Logistik</strong>
                  <span>:</span>
                  <span className="min-w-0 break-words">
                    {receivedByName || receiverVendorName || "-"}
                  </span>
                </p>
                <p className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-x-1 leading-snug">
                  <strong>Waktu Material Tiba</strong>
                  <span>:</span>
                  <span className="min-w-0 break-words">{receivedAt}</span>
                </p>
              </>
            )}
          </div>
        </section>

        <table className="mb-4 w-full border-collapse border border-[#102A4D] text-[10px]">
          <thead>
            <tr className="bg-[#102A4D] text-center font-bold uppercase text-white">
              <th className="w-8 border border-[#102A4D] p-2">No</th>
              <th className="w-24 border border-[#102A4D] p-2">
                Kode Barang / Code
              </th>
              <th className="border border-[#102A4D] p-2">
                Deskripsi Barang / Alat / Material
              </th>
              <th className="w-14 border border-[#102A4D] p-2">Qty</th>
              <th className="w-16 border border-[#102A4D] p-2">Satuan</th>
              <th className="w-32 border border-[#102A4D] p-2">
                Keterangan / Remarks
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr
                key={`${item.description}-${index}`}
                className="odd:bg-white even:bg-slate-50"
              >
                <td className="border border-slate-300 p-2 text-center">
                  {item.no || index + 1}
                </td>
                <td className="border border-slate-300 p-2 text-center font-mono">
                  {item.itemCode || "-"}
                </td>
                <td className="border border-slate-300 p-2 font-medium">
                  {item.description}
                </td>
                <td className="border border-slate-300 p-2 text-center font-bold">
                  {item.qty}
                </td>
                <td className="border border-slate-300 p-2 text-center">
                  {item.unit || "-"}
                </td>
                <td className="border border-slate-300 p-2 text-slate-600">
                  {item.remarks || "-"}
                </td>
              </tr>
            ))}
            {Array.from(
              { length: Math.max(0, 11 - items.length) },
              (_, index) => (
                <tr key={`empty-${index}`} className="h-8">
                  {Array.from({ length: 6 }, (_, cell) => (
                    <td key={cell} className="border border-slate-300 p-2" />
                  ))}
                </tr>
              ),
            )}
          </tbody>
        </table>

        <section className="mb-6 rounded border border-slate-300 bg-slate-50 p-3 text-[10px]">
          <p className="font-bold uppercase">Catatan / Notes</p>
          <ol className="mt-1 list-inside list-decimal space-y-0.5 text-slate-600">
            <li>Barang telah diperiksa dan diterima dalam kondisi baik.</li>
            <li>
              Komplain kekurangan/kerusakan maksimal 1x24 jam sejak barang
              diterima.
            </li>
          </ol>
        </section>

        <section className="mt-4 grid grid-cols-3 gap-4 text-center text-[10px]">
          <div className="flex min-h-32 flex-col justify-between">
            <strong>Dibuat Oleh / Dispatched By</strong>
            <div>
              {qrDataUrl ? (
                <Image
                  src={qrDataUrl}
                  alt={`QR verifikasi DO oleh ${logisticsStaffName || "petugas Logistik"}`}
                  width={64}
                  height={64}
                  unoptimized
                  className="mx-auto h-16 w-16"
                />
              ) : (
                <div className="h-16" />
              )}
              <p className="font-bold">
                {logisticsStaffName || "................................"}
              </p>
              <p>Pengirim / Logistik</p>
            </div>
          </div>
          <div className="flex min-h-32 flex-col justify-between">
            <strong>Dibawa Oleh / Carried By</strong>
            <div>
              <div className="h-16" />
              <p className="font-bold">
                {driverName || "................................"}
              </p>
              <p>Driver / Mover</p>
            </div>
          </div>
          <div className="flex min-h-32 flex-col justify-between">
            <strong>
              {receivedAt
                ? "Diterima di Gudang / Received By"
                : "Diterima Oleh / Received By"}
            </strong>
            <div>
              <div className="h-16" />
              <p className="font-bold">
                {receivedByName ||
                  receiverVendorName ||
                  "................................"}
              </p>
              <p>
                {receivedAt
                  ? "Penerima Material / Logistik"
                  : "Vendor / Penerima"}
              </p>
            </div>
          </div>
        </section>
      </div>

      <footer className="mt-6 flex items-center gap-3 pt-2 print:mt-3">
        <span className="h-[5px] flex-1 bg-[#E67E22]" />
        <p className="whitespace-nowrap text-sm font-black tracking-widest text-[#E67E22]">
          ADAPT, IMPROVISE AND FINISH
        </p>
      </footer>
    </article>
  );
}
