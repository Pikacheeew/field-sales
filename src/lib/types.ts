export type Role = "rep" | "ops";

export interface User {
  id: string;
  name: string;
  phone: string;
  role: Role;
}

export type Tier = "A" | "B" | "C";
export type SspTier = "Bronze" | "Silver" | "Gold" | "-";
export type CustomerType = "new" | "existing";

export interface Customer {
  id: string;
  name: string;
  address: string;
  kabupaten: string;
  kecamatan: string;
  tier: Tier; // GMV-based value segment (A/B/C) — separate from priceTier below
  priceTier: PriceTier; // which SawitPRO price list this customer buys on
  customerType: CustomerType; // new prospect vs an already-established customer
  assignedRepId: string;
  phone: string;
  lat: number;
  lng: number;
  gmv3mo: number;
  lastVisitDate: string | null;
  lastVisitRepId: string | null;
  lastOrderDate: string | null;
  lastOrderValue: number | null;
  visitFrequencyPlanned: number;
  visitFrequencyActual: number;
  openNotes: string;
  sspTier: SspTier;
  sspPoints: number;
  pendingApproval?: boolean;
}

export type VisitKind = "offline" | "online";
export type VisitPurpose = "prospecting" | "routine" | "follow_up" | "complaint";
export type OfferingOutcome = "offered" | "not_offered" | "not_present";
export type RejectionType = "external" | "internal";
export type OnlineChannel = "whatsapp" | "phone" | "video" | "other";

// Offline and online reports share one format (SKU, pricing, outcome, rejection, conclusion,
// next action, proof photos) — only purpose+GPS (offline) vs channel (online) differ.
export interface Visit {
  id: string;
  kind: VisitKind;
  customerId: string;
  repId: string;
  timestamp: string;
  gps: { lat: number; lng: number } | null;
  gpsFlagged?: boolean;
  // offline-only
  purpose?: VisitPurpose;
  // online-only
  channel?: OnlineChannel;
  // shared
  photos?: string[]; // proof photos, max 3, data URLs
  skus?: string[];
  outcome?: OfferingOutcome;
  listPrice?: number;
  discountPct?: number;
  priceQuoted?: number;
  quantity?: number;
  rejectionType?: RejectionType;
  rejectionReasons?: string[];
  rejectionOther?: string;
  internalPIC?: string;
  meetingConclusion?: string;
  nextAction?: string;
  followUpDate?: string;
  synced: boolean;
  // Immutable-with-audit-trail per PRD: an edit snapshots the pre-edit record here rather
  // than overwriting it silently.
  history?: VisitHistoryEntry[];
}

export interface VisitHistoryEntry {
  editedAt: string;
  editedBy: string;
  snapshot: Omit<Visit, "history">;
}

export type OrderStatus = "pending" | "confirmed" | "delivered" | "cancelled";
export type DeliveryTerm = "loco" | "franco";

export interface OrderItem {
  sku: string;
  tons: number; // always a multiple of TON_STEP, minimum MIN_ORDER_TONS
  pricePerKg: number;
}

export interface Order {
  id: string;
  customerId: string;
  repId: string | null;
  timestamp: string;
  items: OrderItem[];
  deliveryTerm: DeliveryTerm;
  deliveryAddress?: string; // franco: delivered to this address
  locoLocation?: string; // loco: picked up from this SawitPRO location
  status: OrderStatus;
}

export type PriceType = "do_price" | "retail_price" | "special_deal";
export type PriceSource = "direct" | "customer_told" | "distributor_told";

export interface PriceIntel {
  id: string;
  repId: string;
  timestamp: string;
  gps: { lat: number; lng: number } | null;
  competitorName: string;
  skus: string[];
  competitorPrice: number;
  priceType: PriceType;
  source: PriceSource;
  photo?: string;
  notes?: string;
}

export interface PlanEntry {
  id: string;
  repId: string;
  date: string; // yyyy-mm-dd
  customerId: string;
  done: boolean;
}

// Rp/kg, derived from real 50kg-bag prices on toko.sawitpro.id (checked 2026-09-17).
export const SKU_CATALOGUE = [
  { sku: "MOP/KCL Canada Cap Mahkota", price: { Retail: 8640, Grosir: 8280, "Khusus Petani": 8256 } },
  { sku: "NPK Mahkota 13-8-27-4", price: { Retail: 11130, Grosir: 10868, "Khusus Petani": 10836 } },
  { sku: "Urea Nitrea 46% N", price: { Retail: 9558, Grosir: 9160, "Khusus Petani": 9133 } },
  { sku: "RP Mahkota - Egypt", price: { Retail: 2321, Grosir: 2194, "Khusus Petani": 2178 } },
  { sku: "ZA Cap Daun", price: { Retail: 6912, Grosir: 6624, "Khusus Petani": 6605 } }
] as const;

export type PriceTier = keyof (typeof SKU_CATALOGUE)[number]["price"];
export const PRICE_TIERS: PriceTier[] = ["Retail", "Grosir", "Khusus Petani"];

// Price is always per kg — SKU_CATALOGUE values are Rp/kg at the minimum bracket.
export function listPriceFor(sku: string, priceTier: PriceTier): number {
  return SKU_CATALOGUE.find((s) => s.sku === sku)?.price[priceTier] ?? 0;
}

// Bulk ordering (Toko Tani catalogue): locked at a 10-ton minimum, priced per kg,
// cheaper per additional 10-ton bracket up to a floor — the SKU_CATALOGUE price is the per-kg
// rate at the minimum bracket (10 ton).
export const MIN_ORDER_TONS = 10;
export const TON_STEP = 10;
const BULK_STEP_DISCOUNT_PCT = 2; // cheaper per additional 10-ton bracket
const BULK_MAX_BRACKETS = 5; // discount stops compounding past 50 ton (i.e. capped at 8%)

export function pricePerKgForTons(sku: string, priceTier: PriceTier, tons: number): number {
  const basePricePerKg = listPriceFor(sku, priceTier);
  const brackets = Math.min(BULK_MAX_BRACKETS - 1, Math.max(0, Math.floor(tons / TON_STEP) - 1));
  const factor = 1 - (brackets * BULK_STEP_DISCOUNT_PCT) / 100;
  return Math.round(basePricePerKg * factor);
}

// Mock "SawitPRO database" of pickup warehouses for loco (buyer picks up) orders.
export const SAWITPRO_LOCO_LOCATIONS = [
  "Gudang SawitPRO Pekanbaru",
  "Gudang SawitPRO Dumai",
  "Gudang SawitPRO Bangkinang",
  "Gudang SawitPRO Duri"
];

export function orderItemTotal(item: OrderItem): number {
  return item.tons * 1000 * item.pricePerKg;
}

export function orderTotal(items: OrderItem[]): number {
  return items.reduce((sum, it) => sum + orderItemTotal(it), 0);
}

export const EXTERNAL_REASONS = [
  "Harga terlalu tinggi",
  "Pilih kompetitor",
  "Belum tertarik siklus ini",
  "Masalah kredit",
  "Timing",
  "Lainnya"
];

export const INTERNAL_REASONS = [
  "Stok habis",
  "Pengiriman terlambat",
  "Approval harga tertunda",
  "Komplain kualitas produk",
  "Masalah admin",
  "Lainnya"
];

export const INTERNAL_PICS = [
  "Tim Ops",
  "Tim Supply Chain",
  "Tim Kredit",
  "Tim Admin"
];
