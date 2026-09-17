import { db } from "./store";
import { orderTotal } from "./types";
import type { Visit } from "./types";

export function filterVisits(repId: string | "all") {
  const visits = db.visits();
  return repId === "all" ? visits : visits.filter((v) => v.repId === repId);
}

// Mission-tracker style target vs. actual per rep — mirrors the real targets.csv logic:
// a flat weekday/Saturday visit target for everyone, plus a per-rep GMV target (real sheet
// varies this by region/book size via classA+psp+agrochem_gmv_tgt summed per pic).
export const VISIT_TARGET_WEEKDAY = 5;
export const VISIT_TARGET_SATURDAY = 3;
// No Sunday target in the real sheet either — offline visit group runs Mon-Sat.
function visitTargetForDay(day: number): number {
  return day === 0 ? 0 : day === 6 ? VISIT_TARGET_SATURDAY : VISIT_TARGET_WEEKDAY;
}

// Per-rep GMV target, varied like the real per-pic target column — calibrated to this app's
// own bulk-order pricing (10-40 ton orders run into the hundreds of millions), not real figures.
const REP_GMV_TARGET_PER_WEEK: Record<string, number> = {
  rep_budi: 350_000_000,
  rep_siti: 500_000_000,
  rep_hendra: 450_000_000
};
const DEFAULT_GMV_TARGET_PER_WEEK = 400_000_000;

export interface RepMissionRow {
  repId: string;
  repName: string;
  visitsActual: number;
  visitsTarget: number;
  visitAchievementPct: number;
  gmvActual: number;
  gmvTarget: number;
  gmvAchievementPct: number;
}

// Mon-Sat days elapsed from the 1st of the month through `asOf` (inclusive) — used to scale
// the Monthly view to days-loaded-so-far instead of a fixed full-month number, same as the
// real tracker's MTD behavior.
function elapsedWorkdaysInMonth(asOf: Date): { weekdays: number; saturdays: number } {
  let weekdays = 0;
  let saturdays = 0;
  const d = new Date(asOf.getFullYear(), asOf.getMonth(), 1);
  while (d <= asOf) {
    const day = d.getDay();
    if (day === 6) saturdays += 1;
    else if (day !== 0) weekdays += 1;
    d.setDate(d.getDate() + 1);
  }
  return { weekdays, saturdays };
}

export function missionTracker(period: "today" | "week" | "month"): RepMissionRow[] {
  const reps = db.users().filter((u) => u.role === "rep");
  const now = new Date();
  let cutoff: number;
  let visitsTargetForPeriod: number;
  let workdaysForGmv: number; // number of daily-rate units the GMV target is scaled by

  if (period === "today") {
    cutoff = new Date().setHours(0, 0, 0, 0);
    visitsTargetForPeriod = visitTargetForDay(now.getDay());
    workdaysForGmv = 1;
  } else if (period === "week") {
    cutoff = Date.now() - 7 * 86400000;
    // Sums each Mon-Sat day's actual target (5 weekday + 3 Saturday = 28/week), not a flat
    // daily rate times 6 — matches how the real sheet's weekday/Saturday split works.
    visitsTargetForPeriod = VISIT_TARGET_WEEKDAY * 5 + VISIT_TARGET_SATURDAY;
    workdaysForGmv = 6;
  } else {
    cutoff = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const { weekdays, saturdays } = elapsedWorkdaysInMonth(now);
    visitsTargetForPeriod = weekdays * VISIT_TARGET_WEEKDAY + saturdays * VISIT_TARGET_SATURDAY;
    workdaysForGmv = weekdays + saturdays;
  }

  return reps.map((rep) => {
    const visitsActual = db
      .visitsForRep(rep.id)
      .filter((v) => v.kind === "offline" && new Date(v.timestamp).getTime() >= cutoff).length;
    const gmvActual = db
      .orders()
      .filter((o) => o.repId === rep.id && new Date(o.timestamp).getTime() >= cutoff)
      .reduce((sum, o) => sum + orderTotal(o.items), 0);
    const gmvTargetPerWeek = REP_GMV_TARGET_PER_WEEK[rep.id] ?? DEFAULT_GMV_TARGET_PER_WEEK;
    const visitsTarget = visitsTargetForPeriod;
    const gmvTarget = Math.round((gmvTargetPerWeek / 6) * workdaysForGmv);

    return {
      repId: rep.id,
      repName: rep.name,
      visitsActual,
      visitsTarget,
      visitAchievementPct: visitsTarget ? Math.round((visitsActual / visitsTarget) * 100) : 0,
      gmvActual,
      gmvTarget,
      gmvAchievementPct: gmvTarget ? Math.round((gmvActual / gmvTarget) * 100) : 0
    };
  });
}

export interface MissionComparisonRow {
  label: string;
  visitsActual: number;
  visitsTarget: number;
  gmvActual: number;
  gmvTarget: number;
  achievementPct: number;
}

// Whole-team trend, not per-rep — this week vs. last week, so the desktop report can show a
// delta the same way the real tracker's Comparison tab does.
export function weekOverWeekComparison(): [MissionComparisonRow, MissionComparisonRow] {
  const reps = db.users().filter((u) => u.role === "rep");
  const visitsTargetPerRep = VISIT_TARGET_WEEKDAY * 5 + VISIT_TARGET_SATURDAY;
  const visitsTargetTotal = visitsTargetPerRep * reps.length;
  const gmvTargetTotal = reps.reduce((sum, r) => sum + (REP_GMV_TARGET_PER_WEEK[r.id] ?? DEFAULT_GMV_TARGET_PER_WEEK), 0);

  function rowFor(daysAgoStart: number, daysAgoEnd: number, label: string): MissionComparisonRow {
    const start = Date.now() - daysAgoStart * 86400000;
    const end = Date.now() - daysAgoEnd * 86400000;
    const visitsActual = db
      .visits()
      .filter((v) => v.kind === "offline" && new Date(v.timestamp).getTime() >= start && new Date(v.timestamp).getTime() < end).length;
    const gmvActual = db
      .orders()
      .filter((o) => new Date(o.timestamp).getTime() >= start && new Date(o.timestamp).getTime() < end)
      .reduce((sum, o) => sum + orderTotal(o.items), 0);
    const visitPct = visitsTargetTotal ? (visitsActual / visitsTargetTotal) * 100 : 0;
    const gmvPct = gmvTargetTotal ? (gmvActual / gmvTargetTotal) * 100 : 0;
    return {
      label,
      visitsActual,
      visitsTarget: visitsTargetTotal,
      gmvActual,
      gmvTarget: gmvTargetTotal,
      achievementPct: Math.round((visitPct + gmvPct) / 2)
    };
  }

  return [rowFor(14, 7, "Minggu Lalu"), rowFor(7, 0, "Minggu Ini")];
}

// Offline visits and online engagements now share one report format (SKU, outcome, rejection),
// so funnel/SKU stats cover both kinds. Only GPS-based stats (heatmap, coverage) stay offline-only.
export function offeringRejectionStats(visits: Visit[]) {
  const offered = visits.filter((v) => v.outcome === "offered");
  const rejected = visits.filter((v) => v.outcome && v.outcome !== "offered" && v.rejectionType);
  return {
    total: visits.length,
    offeringRate: visits.length ? Math.round((offered.length / visits.length) * 100) : 0,
    rejectionRate: offered.length + rejected.length ? Math.round((rejected.length / (offered.length + rejected.length || 1)) * 100) : 0,
    offered: offered.length,
    rejected: rejected.length
  };
}

export function rejectionReasonBreakdown(visits: Visit[]) {
  const counts = new Map<string, number>();
  visits
    .filter((v) => v.rejectionReasons)
    .forEach((v) => v.rejectionReasons!.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1)));
  return Array.from(counts.entries())
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count);
}

export function skuPerformance(visits: Visit[]) {
  const map = new Map<string, { discussed: number; offered: number; priceSum: number; priceCount: number; orders: number }>();
  visits
    .filter((v) => v.skus)
    .forEach((v) => {
      v.skus!.forEach((sku) => {
        const row = map.get(sku) ?? { discussed: 0, offered: 0, priceSum: 0, priceCount: 0, orders: 0 };
        row.discussed += 1;
        if (v.outcome === "offered") {
          row.offered += 1;
          if (v.priceQuoted) {
            row.priceSum += v.priceQuoted;
            row.priceCount += 1;
          }
        }
        map.set(sku, row);
      });
    });
  return Array.from(map.entries()).map(([sku, r]) => ({
    sku,
    discussed: r.discussed,
    offeringRate: r.discussed ? Math.round((r.offered / r.discussed) * 100) : 0,
    avgPriceQuoted: r.priceCount ? Math.round(r.priceSum / r.priceCount) : 0
  }));
}

export function hourHeatmap(visits: Visit[]) {
  const buckets = Array.from({ length: 12 }, (_, i) => ({ hour: `${(i + 7).toString().padStart(2, "0")}:00`, count: 0 }));
  visits
    .filter((v) => v.kind === "offline")
    .forEach((v) => {
      const wibHour = new Date(new Date(v.timestamp).getTime() + 7 * 3600 * 1000).getUTCHours();
      const idx = wibHour - 7;
      if (idx >= 0 && idx < buckets.length) buckets[idx].count += 1;
    });
  return buckets;
}

export function coverageByKecamatan(repId: string | "all") {
  const customers = repId === "all" ? db.customers() : db.customersForRep(repId);
  const visits = filterVisits(repId).filter((v) => v.kind === "offline");
  const map = new Map<string, { total: number; visited: Set<string> }>();
  customers.forEach((c) => {
    const row = map.get(c.kecamatan) ?? { total: 0, visited: new Set<string>() };
    row.total += 1;
    map.set(c.kecamatan, row);
  });
  visits.forEach((v) => {
    const c = db.customerById(v.customerId);
    if (!c) return;
    const row = map.get(c.kecamatan);
    if (row) row.visited.add(c.id);
  });
  return Array.from(map.entries()).map(([kecamatan, r]) => ({
    kecamatan,
    customers: r.total,
    visited: r.visited.size,
    coveragePct: r.total ? Math.round((r.visited.size / r.total) * 100) : 0
  }));
}
