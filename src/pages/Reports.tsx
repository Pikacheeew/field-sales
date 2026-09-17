import { useState } from "react";
import { db } from "../lib/store";
import { missionTracker } from "../lib/stats";
import { formatRupiahCompact } from "../lib/format";
import { Button, Card, Chip, PageHeader } from "../components/ui";

function achvTone(pct: number): "green" | "amber" | "red" {
  return pct >= 100 ? "green" : pct >= 50 ? "amber" : "red";
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))];
  return lines.join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const visits = db.visits();
  const priceIntel = db.priceIntel();
  const customers = db.customers();
  const [period, setPeriod] = useState<"today" | "week">("today");
  const mission = missionTracker(period);

  function exportVisits() {
    download(
      "visit_log.csv",
      toCsv(
        visits.map((v) => ({
          id: v.id,
          kind: v.kind,
          customer: db.customerById(v.customerId)?.name ?? "",
          rep: db.userById(v.repId)?.name ?? "",
          timestamp: v.timestamp,
          purpose: v.purpose ?? "",
          channel: v.channel ?? "",
          skus: v.skus?.join("; ") ?? "",
          outcome: v.outcome ?? "",
          priceQuoted: v.priceQuoted ?? "",
          rejectionType: v.rejectionType ?? "",
          rejectionReasons: v.rejectionReasons?.join("; ") ?? "",
          gpsFlagged: v.gpsFlagged ?? false
        }))
      )
    );
  }

  function exportPriceIntel() {
    download(
      "price_intelligence.csv",
      toCsv(
        priceIntel.map((p) => ({
          id: p.id,
          rep: db.userById(p.repId)?.name ?? "",
          timestamp: p.timestamp,
          competitor: p.competitorName,
          skus: p.skus.join("; "),
          price: p.competitorPrice,
          priceType: p.priceType,
          source: p.source
        }))
      )
    );
  }

  function exportCustomers() {
    download(
      "customer_db.csv",
      toCsv(
        customers.map((c) => ({
          id: c.id,
          name: c.name,
          kabupaten: c.kabupaten,
          kecamatan: c.kecamatan,
          tier: c.tier,
          rep: db.userById(c.assignedRepId)?.name ?? "",
          gmv3mo: c.gmv3mo,
          lastVisitDate: c.lastVisitDate ?? ""
        }))
      )
    );
  }

  return (
    <div>
      <PageHeader title="Laporan & Export" subtitle="Unduh data untuk analisis lanjutan" />
      <div className="px-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-800">Mission Tracker</h3>
            <div className="flex gap-1.5">
              {(["today", "week"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`tap-target rounded-full px-3 text-xs border ${
                    period === p ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 text-gray-600"
                  }`}
                >
                  {p === "today" ? "Hari Ini" : "Minggu Ini"}
                </button>
              ))}
            </div>
          </div>
          <Card className="!p-0 overflow-hidden">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500">
                  <th className="font-medium py-2 pl-3 pr-2">Rep</th>
                  <th className="font-medium py-2 px-2 text-right">Kunjungan</th>
                  <th className="font-medium py-2 px-2 text-right">GMV</th>
                  <th className="font-medium py-2 pr-3 pl-2 text-right">Achv.</th>
                </tr>
              </thead>
              <tbody>
                {mission.map((r) => (
                  <tr key={r.repId} className="border-t border-gray-100">
                    <td className="py-2 pl-3 pr-2 text-gray-700">{r.repName}</td>
                    <td className="py-2 px-2 text-right text-gray-600 whitespace-nowrap">
                      {r.visitsActual}/{r.visitsTarget}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-600 whitespace-nowrap">
                      {formatRupiahCompact(r.gmvActual)}
                    </td>
                    <td className="py-2 pr-3 pl-2 text-right">
                      <Chip tone={achvTone(Math.max(r.visitAchievementPct, r.gmvAchievementPct))}>
                        {Math.round((r.visitAchievementPct + r.gmvAchievementPct) / 2)}%
                      </Chip>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Target: {period === "today" ? "5 kunjungan/hari" : "30 kunjungan/minggu"} · GMV flat per rep — ganti dengan target per wilayah bila tersedia.
          </p>
        </div>

        <Card className="flex items-center justify-between !p-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Visit Log</div>
            <div className="text-xs text-gray-500">{visits.length} baris</div>
          </div>
          <Button variant="secondary" onClick={exportVisits}>
            Export CSV
          </Button>
        </Card>
        <Card className="flex items-center justify-between !p-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Price Intelligence</div>
            <div className="text-xs text-gray-500">{priceIntel.length} baris</div>
          </div>
          <Button variant="secondary" onClick={exportPriceIntel}>
            Export CSV
          </Button>
        </Card>
        <Card className="flex items-center justify-between !p-4">
          <div>
            <div className="font-semibold text-gray-900 text-sm">Customer Database</div>
            <div className="text-xs text-gray-500">{customers.length} baris</div>
          </div>
          <Button variant="secondary" onClick={exportCustomers}>
            Export CSV
          </Button>
        </Card>
      </div>
    </div>
  );
}
