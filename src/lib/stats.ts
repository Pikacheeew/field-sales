import { db } from "./store";
import type { Visit } from "./types";

export function filterVisits(repId: string | "all") {
  const visits = db.visits();
  return repId === "all" ? visits : visits.filter((v) => v.repId === repId);
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
