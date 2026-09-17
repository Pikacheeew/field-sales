import { db } from "../lib/store";
import { Button, Card, PageHeader } from "../components/ui";

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
