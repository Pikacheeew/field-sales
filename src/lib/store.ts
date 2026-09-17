import type { Customer, Order, PlanEntry, PriceIntel, User, Visit } from "./types";
import { orderTotal } from "./types";
import { seedCustomers, seedOrders, seedPlan, seedPriceIntel, seedUsers, seedVisits } from "./seed";

const KEY = "fieldsales_v1";

interface DB {
  users: User[];
  customers: Customer[];
  visits: Visit[];
  orders: Order[];
  priceIntel: PriceIntel[];
  plan: PlanEntry[];
  session: { userId: string } | null;
}

function emptyDb(): DB {
  return {
    users: seedUsers,
    customers: seedCustomers,
    visits: seedVisits,
    orders: seedOrders,
    priceIntel: seedPriceIntel,
    plan: seedPlan,
    session: null
  };
}

function load(): DB {
  const raw = localStorage.getItem(KEY);
  if (!raw) {
    const db = emptyDb();
    save(db);
    return db;
  }
  try {
    return { ...emptyDb(), ...JSON.parse(raw) };
  } catch {
    return emptyDb();
  }
}

function save(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
}

export function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export const db = {
  getSession: () => load().session,
  setSession: (userId: string | null) => {
    const state = load();
    state.session = userId ? { userId } : null;
    save(state);
  },
  users: () => load().users,
  userById: (uid: string) => load().users.find((u) => u.id === uid) || null,
  userByPhone: (phone: string) => load().users.find((u) => u.phone === phone) || null,

  customers: () => load().customers,
  customersForRep: (repId: string) => load().customers.filter((c) => c.assignedRepId === repId),
  customerById: (cid: string) => load().customers.find((c) => c.id === cid) || null,
  addCustomer: (c: Customer) => {
    const state = load();
    state.customers.push(c);
    save(state);
  },
  updateCustomer: (cid: string, patch: Partial<Customer>) => {
    const state = load();
    const cust = state.customers.find((c) => c.id === cid);
    if (cust) Object.assign(cust, patch);
    save(state);
  },

  visits: () => load().visits,
  visitsForRep: (repId: string) => load().visits.filter((v) => v.repId === repId),
  visitsForCustomer: (cid: string) =>
    load()
      .visits.filter((v) => v.customerId === cid)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  addVisit: (v: Visit) => {
    const state = load();
    state.visits.push(v);
    const cust = state.customers.find((c) => c.id === v.customerId);
    if (cust && v.kind === "offline") {
      cust.lastVisitDate = v.timestamp;
      cust.lastVisitRepId = v.repId;
      cust.visitFrequencyActual += 1;
    }
    save(state);
  },
  visitById: (vid: string) => load().visits.find((v) => v.id === vid) || null,
  // The pre-edit record is snapshotted into history, never overwritten silently — matches
  // the PRD's "edits create a new version, original preserved" audit requirement.
  updateVisit: (vid: string, patch: Partial<Visit>, editedBy: string) => {
    const state = load();
    const v = state.visits.find((x) => x.id === vid);
    if (!v) return;
    const { history, ...snapshot } = v;
    const entry = { editedAt: new Date().toISOString(), editedBy, snapshot };
    Object.assign(v, patch, { history: [...(history ?? []), entry] });
    save(state);
  },
  pendingApprovals: () =>
    load()
      .visits.filter((v) => v.approvalStatus === "pending")
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
  approvalHistory: () =>
    load()
      .visits.filter((v) => v.approvalStatus === "approved" || v.approvalStatus === "rejected")
      .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? "")),
  // Routes through updateVisit so the decision (and the reason behind it) lands in the same
  // audit history as any other edit — one trail, not a second parallel log to keep in sync.
  decideApproval: (vid: string, decision: "approved" | "rejected", reason: string, analystId: string) => {
    db.updateVisit(vid, { approvalStatus: decision, approvalReason: reason, approvedBy: analystId, decidedAt: new Date().toISOString() }, analystId);
  },

  orders: () => load().orders,
  addOrder: (o: Order) => {
    const state = load();
    state.orders.push(o);
    const cust = state.customers.find((c) => c.id === o.customerId);
    if (cust) {
      const total = orderTotal(o.items);
      cust.lastOrderDate = o.timestamp;
      cust.lastOrderValue = total;
      cust.gmv3mo += total;
    }
    save(state);
  },

  priceIntel: () => load().priceIntel,
  addPriceIntel: (p: PriceIntel) => {
    const state = load();
    state.priceIntel.push(p);
    save(state);
  },

  plan: () => load().plan,
  planForRepWeek: (repId: string, dates: string[]) =>
    load().plan.filter((p) => p.repId === repId && dates.includes(p.date)),
  addPlanEntry: (p: PlanEntry) => {
    const state = load();
    state.plan.push(p);
    save(state);
  },
  removePlanEntry: (pid: string) => {
    const state = load();
    state.plan = state.plan.filter((p) => p.id !== pid);
    save(state);
  },
  togglePlanDone: (pid: string) => {
    const state = load();
    const entry = state.plan.find((p) => p.id === pid);
    if (entry) entry.done = !entry.done;
    save(state);
  },

  reset: () => {
    localStorage.removeItem(KEY);
  }
};
