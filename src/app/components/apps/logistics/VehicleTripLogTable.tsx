import type { VehicleTripLogRow } from "@/lib/vehicle-trip-types";

export default function VehicleTripLogTable({
  logs,
  emptyMessage = "Belum ada log perjalanan kendaraan.",
}: {
  logs: VehicleTripLogRow[];
  emptyMessage?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="app-data-table w-full min-w-[900px] text-sm">
        <thead className="bg-[#102A4D] text-left text-white">
          <tr>
            <th className="p-3">Tanggal / Proyek</th>
            <th className="p-3">Kendaraan</th>
            <th className="p-3">No. DO</th>
            <th className="p-3">KM Awal–Akhir</th>
            <th className="p-3">Jarak</th>
            <th className="p-3">Estimasi BBM</th>
            <th className="p-3">Dicatat oleh</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr className="border-b" key={log.id}>
              <td className="p-3">
                {new Date(log.createdAt).toLocaleDateString("id-ID")}
                <span className="block text-xs text-muted-foreground">
                  {log.projectName}
                </span>
              </td>
              <td className="p-3">
                {log.plateNumber}
                <span className="block text-xs text-muted-foreground">
                  {log.vehicleType}
                </span>
              </td>
              <td className="p-3">{log.doNumber ?? "—"}</td>
              <td className="p-3">
                {Number(log.kilometerStart).toLocaleString("id-ID")}–
                {Number(log.kilometerEnd).toLocaleString("id-ID")}
              </td>
              <td className="p-3">
                {Number(log.distanceKm).toLocaleString("id-ID")} km
              </td>
              <td className="p-3 font-medium">
                {Number(log.fuelLiter).toLocaleString("id-ID", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                L
              </td>
              <td className="p-3">{log.createdByName}</td>
            </tr>
          ))}
          {logs.length === 0 && (
            <tr>
              <td className="p-5 text-center text-muted-foreground" colSpan={7}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
