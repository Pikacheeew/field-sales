import type {
  Customer,
  DeliveryTerm,
  OfferingOutcome,
  Order,
  OrderStatus,
  PlanEntry,
  PriceIntel,
  PriceTier,
  RejectionType,
  User,
  Visit,
  VisitPurpose
} from "./types";
import {
  DISCOUNT_GUARDRAIL_PCT,
  EXTERNAL_REASONS,
  INTERNAL_PICS,
  INTERNAL_REASONS,
  MIN_ORDER_TONS,
  LOCO_LOCATIONS,
  SKU_CATALOGUE,
  TON_STEP,
  listPriceFor,
  pricePerKgForTons
} from "./types";

export const seedUsers: User[] = [
  { id: "rep_budi", name: "Budi Santoso", phone: "081234500001", role: "rep" },
  { id: "rep_siti", name: "Siti Rahayu", phone: "081234500002", role: "rep" },
  { id: "rep_hendra", name: "Hendra Wijaya", phone: "081234500003", role: "rep" },
  { id: "ops_aldy", name: "Aldy (Regional Manager)", phone: "081234599999", role: "ops" },
  { id: "analyst_dewi", name: "Dewi Anggraini (Price Analyst)", phone: "081234577777", role: "analyst" }
];

const REP_IDS = seedUsers.filter((u) => u.role === "rep").map((u) => u.id);
const ANALYST_ID = seedUsers.find((u) => u.role === "analyst")!.id;

const KAB = ["Kampar", "Rokan Hulu", "Siak", "Pelalawan"];
const KEC = ["Bangkinang", "Tapung", "Minas", "Kerinci Kanan", "Ujungbatu"];
const NAMES = [
  "Toko Tani Makmur", "UD Sawit Jaya", "Kios Pupuk Sejahtera", "Toko Tani Berkah",
  "UD Mitra Petani", "Kios Subur Tani", "Toko Tani Sentosa", "UD Bumi Hijau",
  "Kios Tani Mandiri", "Toko Pupuk Karya Tani", "UD Sawit Makmur", "Kios Tani Jaya Abadi"
];

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

// Builds an ISO timestamp for a WIB (UTC+7) wall-clock moment `daysAgo` days before today,
// at `hour`:`minute` WIB — the inverse of the +7h shift every display helper applies.
function wibTimestamp(daysAgo: number, hour: number, minute: number) {
  const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
  const wib = new Date(Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate() - daysAgo, hour, minute, 0));
  return new Date(wib.getTime() - 7 * 3600 * 1000).toISOString();
}

function wibDateKey(daysAgo: number) {
  const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
  const d = new Date(Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate() - daysAgo));
  return d.toISOString().slice(0, 10);
}

function currentWeekMondayToSunday(): string[] {
  const nowWib = new Date(Date.now() + 7 * 3600 * 1000);
  const dow = (nowWib.getUTCDay() + 6) % 7; // Monday = 0
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.UTC(nowWib.getUTCFullYear(), nowWib.getUTCMonth(), nowWib.getUTCDate() - dow + i));
    return d.toISOString().slice(0, 10);
  });
}

// Seeded customers are all resale shops/kiosks, so most buy on the wholesale (Grosir) price list.
const PRICE_TIER_WEIGHTS: PriceTier[] = ["Grosir", "Grosir", "Grosir", "Khusus Petani", "Retail"];

// "Last visit", "last order" and "new vs existing" are filled in below, once seedVisits and
// seedOrders actually exist — deriving them from the real generated activity instead of a second,
// independent random guess is what keeps the Customer 360 view from contradicting its own tables.
export const seedCustomers: Customer[] = NAMES.map((name, i) => {
  const reps = REP_IDS;
  const tier = rand(["A", "B", "C"] as const);
  return {
    id: `cust_${i + 1}`,
    name,
    address: `Jl. Raya ${rand(KEC)} No. ${10 + i}`,
    kabupaten: rand(KAB),
    kecamatan: rand(KEC),
    tier,
    priceTier: rand(PRICE_TIER_WEIGHTS),
    customerType: "new",
    assignedRepId: reps[i % reps.length],
    phone: `08${1000000000 + i * 137}`,
    lat: -0.3 + Math.random() * 0.6,
    lng: 101.0 + Math.random() * 0.8,
    // 3-month rolling GMV is a broader historical rollup than the ~2-week order log seeded
    // below, so it's kept as a tier-scaled estimate rather than derived from that shorter window.
    gmv3mo: tier === "A" ? 45000000 + Math.random() * 20000000 : tier === "B" ? 15000000 + Math.random() * 10000000 : 2000000 + Math.random() * 5000000,
    lastVisitDate: null,
    lastVisitRepId: null,
    lastOrderDate: null,
    lastOrderValue: null,
    visitFrequencyPlanned: 2,
    visitFrequencyActual: 0,
    openNotes: i % 4 === 0 ? "Minta follow-up harga NPK minggu depan." : "",
    sspTier: rand(["Bronze", "Silver", "Gold", "-"] as const),
    sspPoints: Math.floor(Math.random() * 5000)
  };
});

function customersOf(repId: string) {
  return seedCustomers.filter((c) => c.assignedRepId === repId);
}

const CONCLUSIONS_OFFERED = [
  "Pemilik toko tertarik, minta sample dulu.",
  "Sudah cocok harga, tinggal konfirmasi jumlah.",
  "Pemilik toko antusias, siap order bulan ini.",
  "Diskusi lancar, akan diteruskan ke pemilik modal."
];
const CONCLUSIONS_NOT_OFFERED = [
  "Toko masih pertimbangkan harga kompetitor.",
  "Belum ada budget bulan ini.",
  "Menunggu approval dari pemilik toko.",
  "Stok lama masih banyak, belum butuh restock."
];
const NEXT_ACTIONS = ["Kirim penawaran tertulis", "Follow-up telepon", "Kirim sample produk", "Kunjungan ulang minggu depan", ""];
const VISIT_PURPOSES: VisitPurpose[] = ["prospecting", "routine", "follow_up", "complaint"];
const COMPETITORS = ["Petro Sejahtera", "Meroke Tetap Jaya", "Pupuk Nusantara", "Sinar Tani", "Agro Makmur Bersama"];

// Styled after the real internal "REJECTED Reason: ... Please sell at X/kg" rejection log —
// an analyst's reason is almost always a counter-price plus the commercial reason for it.
function analystRejectionReason(listPrice: number): string {
  const counter = Math.round(listPrice * (0.97 + Math.random() * 0.02));
  return rand([
    `Di bawah COGS. Silakan jual di Rp${counter.toLocaleString("id-ID")}/kg.`,
    `Sudah ada order sebelumnya di harga lebih tinggi untuk wilayah ini — samakan ke Rp${counter.toLocaleString("id-ID")}/kg.`,
    `Margin terlalu tipis untuk kuantitas ini. Maksimal diskon ${DISCOUNT_GUARDRAIL_PCT}%, setara Rp${counter.toLocaleString("id-ID")}/kg.`,
    `Stok masih menumpuk di gudang, belum perlu diskon sebesar ini.`
  ]);
}

function makeReport(kind: "offline" | "online", repId: string, customer: Customer, daysAgo: number): Visit {
  const sku = rand(SKU_CATALOGUE).sku;
  const outcomeRoll = Math.random();
  const outcome: OfferingOutcome = outcomeRoll < 0.55 ? "offered" : outcomeRoll < 0.85 ? "not_offered" : "not_present";
  const hour = 8 + Math.floor(Math.random() * 8);
  const timestamp = wibTimestamp(daysAgo, hour, Math.floor(Math.random() * 60));
  const listPrice = listPriceFor(sku, customer.priceTier);
  const discountPct = outcome === "offered" ? Math.floor(Math.random() * 12) : undefined;
  const quantity = outcome === "offered" ? (2 + Math.floor(Math.random() * 8)) * 250 : undefined;

  const requireRejection = outcome !== "offered";
  const rejectionType: RejectionType | undefined = requireRejection ? (Math.random() < 0.6 ? "external" : "internal") : undefined;
  const reasonsPool = rejectionType === "internal" ? INTERNAL_REASONS : EXTERNAL_REASONS;
  const rejectionReasons = rejectionType
    ? Array.from(new Set([rand(reasonsPool), ...(Math.random() < 0.3 ? [rand(reasonsPool)] : [])]))
    : undefined;

  const ghostFlag = kind === "offline" && Math.random() < 0.06;
  const nextAction = rand(NEXT_ACTIONS);

  // Price approval gate: only kicks in above the guardrail, matching the live app's own rule.
  const needsApproval = outcome === "offered" && (discountPct ?? 0) > DISCOUNT_GUARDRAIL_PCT;
  const decisionRoll = Math.random();
  const approvalStatus = needsApproval ? (decisionRoll < 0.4 ? "pending" : decisionRoll < 0.75 ? "approved" : "rejected") : undefined;
  const decidedAt = approvalStatus && approvalStatus !== "pending" ? wibTimestamp(Math.max(0, daysAgo - 1), 9 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 60)) : undefined;

  return {
    id: genId("visit"),
    kind,
    customerId: customer.id,
    repId,
    timestamp,
    gps: kind === "offline" ? { lat: customer.lat + (ghostFlag ? 0.01 : 0.0006 * (Math.random() - 0.5)), lng: customer.lng + (ghostFlag ? 0.01 : 0.0006 * (Math.random() - 0.5)) } : null,
    gpsFlagged: ghostFlag,
    purpose: kind === "offline" ? rand(VISIT_PURPOSES) : undefined,
    channel: kind === "online" ? rand(["whatsapp", "phone", "video", "other"] as const) : undefined,
    skus: [sku],
    outcome,
    listPrice: outcome === "offered" ? listPrice : undefined,
    discountPct,
    priceQuoted: outcome === "offered" ? Math.round(listPrice * (1 - (discountPct ?? 0) / 100)) : undefined,
    quantity,
    rejectionType,
    rejectionReasons,
    internalPIC: rejectionType === "internal" ? rand(INTERNAL_PICS) : undefined,
    meetingConclusion: rand(outcome === "offered" ? CONCLUSIONS_OFFERED : CONCLUSIONS_NOT_OFFERED),
    nextAction,
    followUpDate: nextAction ? wibDateKey(-1 * (1 + Math.floor(Math.random() * 10))) : undefined,
    synced: true,
    approvalStatus,
    approvalReason: approvalStatus === "approved" ? "Sesuai guardrail regional, margin masih aman." : approvalStatus === "rejected" ? analystRejectionReason(listPrice) : undefined,
    approvedBy: approvalStatus && approvalStatus !== "pending" ? ANALYST_ID : undefined,
    decidedAt
  };
}

const HISTORY_DAYS = 9;

export const seedVisits: Visit[] = REP_IDS.flatMap((repId) => {
  const myCustomers = customersOf(repId);
  return Array.from({ length: HISTORY_DAYS }, (_, daysAgo) => {
    const offlineCount = 2 + Math.floor(Math.random() * 3); // 2-4 / day
    const onlineCount = 1 + Math.floor(Math.random() * 2); // 1-2 / day
    const offline = Array.from({ length: offlineCount }, () => makeReport("offline", repId, rand(myCustomers), daysAgo));
    const online = Array.from({ length: onlineCount }, () => makeReport("online", repId, rand(myCustomers), daysAgo));
    return [...offline, ...online];
  }).flat();
});

export const seedOrders: Order[] = Array.from({ length: 18 }, () => {
  const customer = rand(seedCustomers);
  const sku = rand(SKU_CATALOGUE).sku;
  const tons = TON_STEP * (1 + Math.floor(Math.random() * 4)); // 10-40 ton
  const pricePerKg = pricePerKgForTons(sku, customer.priceTier, Math.max(tons, MIN_ORDER_TONS));
  const deliveryTerm: DeliveryTerm = Math.random() < 0.5 ? "loco" : "franco";
  const daysAgo = Math.floor(Math.random() * 14);
  const status: OrderStatus = rand(["pending", "pending", "confirmed", "confirmed", "delivered", "cancelled"] as const);

  return {
    id: genId("order"),
    customerId: customer.id,
    repId: customer.assignedRepId,
    timestamp: wibTimestamp(daysAgo, 9 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 60)),
    items: [{ sku, tons, pricePerKg }],
    deliveryTerm,
    deliveryAddress: deliveryTerm === "franco" ? customer.address : undefined,
    locoLocation: deliveryTerm === "loco" ? rand(LOCO_LOCATIONS) : undefined,
    status
  };
});

// Ground the customer summary fields in the activity actually generated above, so the
// Customer 360 view's KPI tiles never contradict its own visit/order tables.
seedCustomers.forEach((c) => {
  const offlineVisits = seedVisits.filter((v) => v.customerId === c.id && v.kind === "offline");
  const lastVisit = [...offlineVisits].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  c.lastVisitDate = lastVisit?.timestamp ?? null;
  c.lastVisitRepId = lastVisit?.repId ?? null;
  c.visitFrequencyActual = offlineVisits.filter((v) => new Date(v.timestamp).getTime() >= Date.now() - 7 * 86400000).length;

  const customerOrders = seedOrders.filter((o) => o.customerId === c.id);
  const lastOrder = [...customerOrders].sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
  c.lastOrderDate = lastOrder?.timestamp ?? null;
  c.lastOrderValue = lastOrder ? lastOrder.items.reduce((sum, it) => sum + it.tons * 1000 * it.pricePerKg, 0) : null;
  c.customerType = customerOrders.length > 0 ? "existing" : "new";
});

export const seedPriceIntel: PriceIntel[] = Array.from({ length: 16 }, () => {
  const repId = rand(REP_IDS);
  const skuEntry = rand(SKU_CATALOGUE);
  const daysAgo = Math.floor(Math.random() * 14);
  const competitorPrice = Math.round((skuEntry.price.Retail * (0.9 + Math.random() * 0.16)) / 10) * 10;

  return {
    id: genId("pi"),
    repId,
    timestamp: wibTimestamp(daysAgo, 9 + Math.floor(Math.random() * 7), Math.floor(Math.random() * 60)),
    gps: null,
    competitorName: rand(COMPETITORS),
    skus: [skuEntry.sku],
    competitorPrice,
    priceType: rand(["do_price", "retail_price", "special_deal"] as const),
    source: rand(["direct", "customer_told", "distributor_told"] as const),
    notes: ""
  };
});

export const seedPlan: PlanEntry[] = (() => {
  const weekKeys = currentWeekMondayToSunday();
  const todayKeyVal = wibDateKey(0);
  return REP_IDS.flatMap((repId) => {
    const myCustomers = customersOf(repId);
    return weekKeys.slice(0, 5).flatMap((dateKeyVal) => {
      const isPast = dateKeyVal < todayKeyVal;
      const picks = [...myCustomers].sort(() => Math.random() - 0.5).slice(0, 1 + Math.floor(Math.random() * 2));
      return picks.map((c) => ({
        id: genId("plan"),
        repId,
        date: dateKeyVal,
        customerId: c.id,
        done: isPast ? Math.random() < 0.75 : false
      }));
    });
  });
})();
