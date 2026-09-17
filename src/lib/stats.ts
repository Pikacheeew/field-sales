import { db } from "./store";
import { orderTotal } from "./types";
import type { Visit } from "./types";

export function filterVisits(repId: string | "all") {
  const visits = db.visits();
  return repId === "all" ? visits : visits.filter((v) => v.repId === repId);
}

// Mission-tracker style target vs. actual per rep — same shape as the daily/weekly rollup
// used for real field-ops reporting: visit compliance and GMV against a flat per-rep target.
// ponytail: one flat target for every rep, not a per-region target table — add one if targets
// ever need to vary by rep/region.
export const VISIT_TARGET_PER_DAY = 5;
// Calibrated against this app's own bulk-order pricing (10-40 ton orders at real per-kg
// prices run into the hundreds of millions fast) — not a real regional target.
export const GMV_TARGET_PER_WEEK = 400_000_000;

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

export function missionTracker(period: "today" | "week"): RepMissionRow[] {
  const reps = db.users().filter((u) => u.role === "rep");
  const cutoff = period === "today" ? new Date().setHours(0, 0, 0, 0) : Date.now() - 7 * 86400000;
  const workdays = period === "today" ? 1 : 6; // Mon-Sat, matching the real tracker's weekday+Saturday targets

  return reps.map((rep) => {
    const visitsActual = db
      .visitsForRep(rep.id)
      .filter((v) => v.kind === "offline" && new Date(v.timestamp).getTime() >= cutoff).length;
    const gmvActual = db
      .orders()
      .filter((o) => o.repId === rep.id && new Date(o.timestamp).getTime() >= cutoff)
      .reduce((sum, o) => sum + orderTotal(o.items), 0);
    const visitsTarget = VISIT_TARGET_PER_DAY * workdays;
    const gmvTarget = period === "today" ? Math.round(GMV_TARGET_PER_WEEK / 6) : GMV_TARGET_PER_WEEK;

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
