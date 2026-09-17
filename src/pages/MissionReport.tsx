import { useState } from "react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/store";
import {
  missionTracker,
  weekOverWeekComparison,
  offeringRejectionStats,
  rejectionReasonBreakdown,
  skuPerformance,
  filterVisits
} from "../lib/stats";
import { formatRupiah, formatRupiahCompact, formatDateShort } from "../lib/format";
import type { Visit } from "../lib/types";
import "./MissionReport.css";

const TABS = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "monthly", label: "Bulanan (MTD)" },
  { id: "comparison", label: "Perbandingan" },
  { id: "lost", label: "Peluang Hilang & Penolakan" }
] as const;
type TabId = (typeof TABS)[number]["id"];

const PERIOD_BY_TAB = { daily: "today", weekly: "week", monthly: "month" } as const;

// Continuous red -> amber -> green gradient rather than a flat pass/fail color, matching the
// real tracker's Achv% cells.
function achvColor(pct: number) {
  const clamped = Math.max(0, Math.min(150, pct));
  const hue = (clamped / 150) * 120;
  return `hsl(${hue}, 60%, 38%)`;
}

function AchvPill({ pct }: { pct: number }) {
  return (
    <span className="pill" style={{ background: achvColor(pct), color: "#fff" }}>
      {pct}%
    </span>
  );
}

// Desktop-only companion report — reads this same app's own localStorage data, no export/
// import step. Not part of the mobile bottom-nav shell; reached via /mission-report.
export default function MissionReport() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<TabId>("daily");
  const reps = db.users().filter((u) => u.role === "rep");
  const visits = filterVisits("all");

  return (
    <div className="mission-report">
      <div className="wrap">
        <header className="doc">
          <div className="doc-top">
            <div>
              <div className="eyebrow">Internal Report</div>
              <h1>Field Sales — Mission Tracker Report</h1>
              <p className="muted" style={{ marginTop: 6, marginBottom: 0 }}>
                Rollup kunjungan, pencapaian GMV, dan alasan peluang hilang di seluruh tim — dibaca langsung dari
                data demo aplikasi ini, tanpa proses export/import CSV.
              </p>
            </div>
            <button className="logout-btn" onClick={logout}>
              Keluar {user ? `(${user.name})` : ""}
            </button>
          </div>
          <div className="meta-row">
            <span>
              <b>Status:</b> Live (demo data)
            </span>
            <span>
              <b>Diperbarui:</b> {formatDateShort(new Date().toISOString())}
            </span>
            <span>
              <b>Tim:</b> {reps.length} rep aktif
            </span>
            <span>
              <b>Sumber data:</b> <code>fieldsales_v1</code> (localStorage browser ini)
            </span>
          </div>
        </header>

        <nav className="tabs">
          {TABS.map((t) => (
            <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "daily" || tab === "weekly" || tab === "monthly" ? (
          <MissionSection period={PERIOD_BY_TAB[tab]} label={TABS.find((t) => t.id === tab)!.label} />
        ) : tab === "comparison" ? (
          <ComparisonSection />
        ) : (
          <LostOpportunitiesSection visits={visits} reps={reps} />
        )}

        <footer>Field Sales · laporan internal prototipe · dihasilkan di sisi klien dari data demo, bukan ekspor perusahaan sungguhan</footer>
      </div>
    </div>
  );
}

function MissionSection({ period, label }: { period: "today" | "week" | "month"; label: string }) {
  const rows = missionTracker(period);
  const totalVisitsActual = rows.reduce((s, r) => s + r.visitsActual, 0);
  const totalVisitsTarget = rows.reduce((s, r) => s + r.visitsTarget, 0);
  const totalGmvActual = rows.reduce((s, r) => s + r.gmvActual, 0);
  const totalGmvTarget = rows.reduce((s, r) => s + r.gmvTarget, 0);
  const combinedAchv =
    totalVisitsTarget && totalGmvTarget
      ? Math.round(((totalVisitsActual / totalVisitsTarget) * 100 + (totalGmvActual / totalGmvTarget) * 100) / 2)
      : 0;

  return (
    <section>
      <div className="sec-head">
        <h2>{label} — Target vs. Aktual per Rep</h2>
      </div>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Kunjungan</h3>
          <div className="stat">
            {totalVisitsActual}/{totalVisitsTarget}
          </div>
          <p>Total tim, offline saja</p>
        </div>
        <div className="card">
          <h3>GMV</h3>
          <div className="stat">{formatRupiahCompact(totalGmvActual)}</div>
          <p>Target: {formatRupiahCompact(totalGmvTarget)}</p>
        </div>
        <div className="card">
          <h3>Achievement Gabungan</h3>
          <div className="stat">{combinedAchv}%</div>
          <p>Rata-rata kunjungan + GMV</p>
        </div>
      </div>
      {period === "month" && (
        <div className="callout warn">
          <span className="tag">MTD</span>
          Target bulan ini diskalakan mengikuti jumlah hari kerja (Senin-Sabtu) yang sudah berjalan bulan ini, bukan
          target bulan penuh — bertambah tiap hari, sama seperti tracker produksi.
        </div>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rep</th>
              <th>Kunjungan</th>
              <th>Achv. Kunjungan</th>
              <th>GMV</th>
              <th>Achv. GMV</th>
              <th>Achv. Gabungan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.repId}>
                <td>{r.repName}</td>
                <td>
                  {r.visitsActual}/{r.visitsTarget}
                </td>
                <td>
                  <AchvPill pct={r.visitAchievementPct} />
                </td>
                <td>
                  {formatRupiah(r.gmvActual)} / {formatRupiah(r.gmvTarget)}
                </td>
                <td>
                  <AchvPill pct={r.gmvAchievementPct} />
                </td>
                <td>
                  <AchvPill pct={Math.round((r.visitAchievementPct + r.gmvAchievementPct) / 2)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ComparisonSection() {
  const [prev, curr] = weekOverWeekComparison();
  const visitDelta = curr.visitsActual - prev.visitsActual;
  const gmvDelta = curr.gmvActual - prev.gmvActual;
  const achvDelta = curr.achievementPct - prev.achievementPct;

  return (
    <section>
      <div className="sec-head">
        <h2>Perbandingan Minggu Lalu vs Minggu Ini</h2>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Periode</th>
              <th>Kunjungan</th>
              <th>GMV</th>
              <th>Achv. Gabungan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{prev.label}</td>
              <td>
                {prev.visitsActual}/{prev.visitsTarget}
              </td>
              <td>{formatRupiahCompact(prev.gmvActual)}</td>
              <td>
                <AchvPill pct={prev.achievementPct} />
              </td>
            </tr>
            <tr>
              <td>{curr.label}</td>
              <td>
                {curr.visitsActual}/{curr.visitsTarget}
              </td>
              <td>{formatRupiahCompact(curr.gmvActual)}</td>
              <td>
                <AchvPill pct={curr.achievementPct} />
              </td>
            </tr>
            <tr>
              <td>
                <b>Delta</b>
              </td>
              <td className={`delta ${visitDelta >= 0 ? "up" : "down"}`}>
                {visitDelta >= 0 ? "▲" : "▼"} {Math.abs(visitDelta)} kunjungan
              </td>
              <td className={`delta ${gmvDelta >= 0 ? "up" : "down"}`}>
                {gmvDelta >= 0 ? "▲" : "▼"} {formatRupiahCompact(Math.abs(gmvDelta))}
              </td>
              <td className={`delta ${achvDelta >= 0 ? "up" : "down"}`}>
                {achvDelta >= 0 ? "▲" : "▼"} {Math.abs(achvDelta)}pp
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LostOpportunitiesSection({ visits, reps }: { visits: Visit[]; reps: { id: string; name: string }[] }) {
  const funnel = offeringRejectionStats(visits);
  const reasons = rejectionReasonBreakdown(visits);
  const skus = skuPerformance(visits);

  return (
    <section>
      <div className="sec-head">
        <h2>Peluang Hilang &amp; Penolakan</h2>
      </div>
      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="card">
          <h3>Total Kunjungan</h3>
          <div className="stat">{funnel.total}</div>
          <p>Offline + online, semua rep</p>
        </div>
        <div className="card">
          <h3>Offering Rate</h3>
          <div className="stat">{funnel.offeringRate}%</div>
          <p>
            {funnel.offered} dari {funnel.total} kunjungan menawarkan harga
          </p>
        </div>
        <div className="card">
          <h3>Rejection Rate</h3>
          <div className="stat">{funnel.rejectionRate}%</div>
          <p>{funnel.rejected} penawaran ditolak</p>
        </div>
      </div>

      <div className="callout warn">
        <span className="tag">Cara baca</span>
        Satu kunjungan bisa punya lebih dari satu alasan penolakan, jadi total persentase di bawah bisa lebih dari
        100% — ini jumlah kunjungan yang menyebut tiap alasan, bukan pembagian rata seperti tracker produksi.
      </div>

      <h3 style={{ margin: "20px 0 10px" }}>Alasan Penolakan</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Alasan</th>
              <th>Jumlah Kunjungan</th>
              <th>% dari Ditolak</th>
            </tr>
          </thead>
          <tbody>
            {reasons.map((r) => (
              <tr key={r.reason}>
                <td>{r.reason}</td>
                <td>{r.count}</td>
                <td>{funnel.rejected ? Math.round((r.count / funnel.rejected) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: "24px 0 10px" }}>Per Rep</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rep</th>
              <th>Kunjungan</th>
              <th>Offering Rate</th>
              <th>Rejection Rate</th>
            </tr>
          </thead>
          <tbody>
            {reps.map((rep) => {
              const repVisits = visits.filter((v) => v.repId === rep.id);
              const f = offeringRejectionStats(repVisits);
              return (
                <tr key={rep.id}>
                  <td>{rep.name}</td>
                  <td>{f.total}</td>
                  <td>{f.offeringRate}%</td>
                  <td>{f.rejectionRate}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: "24px 0 10px" }}>Per SKU</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Dibahas</th>
              <th>Offering Rate</th>
              <th>Rata-rata Harga Ditawarkan</th>
            </tr>
          </thead>
          <tbody>
            {skus.map((s) => (
              <tr key={s.sku}>
                <td>{s.sku}</td>
                <td>{s.discussed}</td>
                <td>{s.offeringRate}%</td>
                <td>{s.avgPriceQuoted ? formatRupiah(s.avgPriceQuoted) + "/kg" : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
