import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "../lib/auth";
import { db } from "../lib/store";
import { todayKey } from "../lib/format";
import { coverageByKecamatan, filterVisits, hourHeatmap, offeringRejectionStats, rejectionReasonBreakdown, skuPerformance } from "../lib/stats";
import { Card, PageHeader, Select } from "../components/ui";

export default function Dashboard() {
  const { user } = useAuth();
  const [repFilter, setRepFilter] = useState<string>(user?.role === "ops" ? "all" : user!.id);
  const reps = db.users().filter((u) => u.role === "rep");

  const visits = useMemo(() => filterVisits(repFilter), [repFilter]);
  const today = visits.filter((v) => v.timestamp.slice(0, 10) === todayKey());
  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = visits.filter((v) => new Date(v.timestamp).getTime() >= weekAgo);
  const offlineCount = visits.filter((v) => v.kind === "offline").length;
  const onlineCount = visits.filter((v) => v.kind === "online").length;

  const funnel = offeringRejectionStats(visits);
  const rejections = rejectionReasonBreakdown(visits);
  const skus = skuPerformance(visits);
  const heat = hourHeatmap(visits);
  const coverage = coverageByKecamatan(repFilter);
  const priceIntel = db.priceIntel().filter((p) => repFilter === "all" || p.repId === repFilter);

  if (!user) return null;

  return (
    <div>
      <PageHeader
        title="Dashboard Funnel"
        subtitle={user.role === "ops" ? "Seluruh tim penjualan" : "Skor Anda"}
        right={
          user.role === "ops" ? (
            <Select value={repFilter} onChange={(e) => setRepFilter(e.target.value)} className="!py-1.5 !text-sm w-32">
              <option value="all">Semua Rep</option>
              {reps.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name.split(" ")[0]}
                </option>
              ))}
            </Select>
          ) : undefined
        }
      />

      <div className="px-4 space-y-3 pb-4">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Hari Ini" value={today.length} />
          <Stat label="7 Hari" value={thisWeek.length} />
          <Stat label="Total (MTD)" value={visits.length} />
        </div>

        <Card>
          <div className="text-sm font-semibold text-gray-800 mb-2">Offline vs Online</div>
          <div className="flex gap-4">
            <Bar2 label="Offline" value={offlineCount} total={offlineCount + onlineCount || 1} />
            <Bar2 label="Online" value={onlineCount} total={offlineCount + onlineCount || 1} tone="amber" />
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Card className="!p-3 text-center">
            <div className="text-2xl font-bold text-brand-600">{funnel.offeringRate}%</div>
            <div className="text-xs text-gray-500 mt-1">Offering Rate</div>
          </Card>
          <Card className="!p-3 text-center">
            <div className="text-2xl font-bold text-red-500">{funnel.rejectionRate}%</div>
            <div className="text-xs text-gray-500 mt-1">Rejection Rate</div>
          </Card>
        </div>

        <Card>
          <div className="text-sm font-semibold text-gray-800 mb-2">Alasan Kegagalan</div>
          {rejections.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Belum ada data.</p>
          ) : (
            <div style={{ width: "100%", height: 180 }}>
              <ResponsiveContainer>
                <BarChart data={rejections} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="reason" width={110} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1b7a3d" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <div className="text-sm font-semibold text-gray-800 mb-2">Performa SKU</div>
          {skus.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Belum ada data.</p>
          ) : (
            <div className="space-y-2">
              {skus.map((s) => (
                <div key={s.sku} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{s.sku}</span>
                  <span className="text-gray-500 text-xs">
                    {s.discussed}x dibahas · {s.offeringRate}% offered
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="text-sm font-semibold text-gray-800 mb-2">Volume Kunjungan per Jam</div>
          <div style={{ width: "100%", height: 140 }}>
            <ResponsiveContainer>
              <BarChart data={heat}>
                <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={1} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="count" fill="#f6a623" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="text-sm font-semibold text-gray-800 mb-2">Cakupan per Kecamatan</div>
          <div className="space-y-2">
            {coverage.map((c) => (
              <div key={c.kecamatan}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{c.kecamatan}</span>
                  <span>
                    {c.visited}/{c.customers} ({c.coveragePct}%)
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-brand-500" style={{ width: `${c.coveragePct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="!p-3 text-center">
          <div className="text-2xl font-bold text-brand-600">{priceIntel.length}</div>
          <div className="text-xs text-gray-500 mt-1">Submisi Info Harga (total)</div>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="!p-3 text-center">
      <div className="text-xl font-bold text-gray-900">{value}</div>
      <div className="text-[11px] text-gray-500 mt-1">{label}</div>
    </Card>
  );
}

function Bar2({ label, value, total, tone = "green" }: { label: string; value: number; total: number; tone?: "green" | "amber" }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex-1">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${tone === "green" ? "bg-brand-500" : "bg-accent-500"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
