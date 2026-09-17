import { useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { db, id } from "../lib/store";
import { formatRupiah, formatWIB, haversineMeters, todayKey } from "../lib/format";
import { useGeo } from "../lib/useGeo";
import {
  EXTERNAL_REASONS,
  INTERNAL_PICS,
  INTERNAL_REASONS,
  SKU_CATALOGUE,
  listPriceFor,
  type OfferingOutcome,
  type OnlineChannel,
  type RejectionType,
  type Visit,
  type VisitPurpose
} from "../lib/types";
import { Button, Card, Chip, Field, Input, PageHeader, Select, Sheet, Textarea } from "../components/ui";
import { PriceIntelForm } from "../components/PriceIntelForm";

export default function Today() {
  const { user, checkedInToday, checkInTime, checkIn } = useAuth();
  const [formKind, setFormKind] = useState<"offline" | "online" | null>(null);
  const [editingVisit, setEditingVisit] = useState<Visit | null>(null);
  const [priceIntelOpen, setPriceIntelOpen] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const myVisitsToday = useMemo(() => {
    if (!user) return [];
    return db
      .visitsForRep(user.id)
      .filter((v) => v.timestamp.slice(0, 10) === todayKey())
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, refreshTick]);

  const customers = user ? db.customersForRep(user.id) : [];

  if (!user) return null;

  if (!checkedInToday) {
    return (
      <div>
        <PageHeader title={`Halo, ${user.name.split(" ")[0]}`} subtitle={formatWIB(new Date().toISOString())} />
        <div className="px-4">
          <Card className="bg-gradient-to-br from-brand-500 to-brand-600 text-white">
            <h2 className="font-bold text-lg mb-1">Belum Check-In</h2>
            <p className="text-brand-50/90 text-sm mb-4">
              Mulai hari kerja Anda untuk bisa mengisi laporan kunjungan hari ini.
            </p>
            <Button
              variant="secondary"
              className="w-full bg-white text-brand-600"
              onClick={checkIn}
            >
              + Mulai Hari (Check-In)
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  const offlineCount = myVisitsToday.filter((v) => v.kind === "offline").length;
  const onlineCount = myVisitsToday.filter((v) => v.kind === "online").length;

  return (
    <div>
      <PageHeader
        title={`Halo, ${user.name.split(" ")[0]}`}
        subtitle={`Check-in ${checkInTime ? formatWIB(checkInTime) : ""}`}
        right={<Chip tone="green">Aktif</Chip>}
      />

      <div className="px-4 space-y-3">
        <Card>
          <div className="flex justify-between text-center">
            <div className="flex-1">
              <div className="text-2xl font-bold text-brand-600">{offlineCount}</div>
              <div className="text-xs text-gray-500">Kunjungan Offline</div>
            </div>
            <div className="flex-1 border-x border-gray-100">
              <div className="text-2xl font-bold text-brand-600">{onlineCount}</div>
              <div className="text-xs text-gray-500">Engagement Online</div>
            </div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-brand-600">{customers.length}</div>
              <div className="text-xs text-gray-500">Pelanggan Saya</div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => setFormKind("offline")}
            className="tap-target rounded-2xl bg-white shadow-card p-3 text-left active:bg-gray-50"
          >
            <div className="text-brand-500 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M12 21s-7-5.4-7-11a7 7 0 1 1 14 0c0 5.6-7 11-7 11z" />
                <circle cx="12" cy="10" r="2.4" />
              </svg>
            </div>
            <div className="font-semibold text-gray-900 text-xs leading-tight">Kunjungan Offline</div>
            <div className="text-[11px] text-gray-500 leading-tight mt-0.5">Isi laporan visit</div>
          </button>
          <button
            onClick={() => setFormKind("online")}
            className="tap-target rounded-2xl bg-white shadow-card p-3 text-left active:bg-gray-50"
          >
            <div className="text-brand-500 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M4 5h16v11H7l-3 3z" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="font-semibold text-gray-900 text-xs leading-tight">Engagement Online</div>
            <div className="text-[11px] text-gray-500 leading-tight mt-0.5">WhatsApp / Telepon</div>
          </button>
          <button
            onClick={() => setPriceIntelOpen(true)}
            className="tap-target rounded-2xl bg-white shadow-card p-3 text-left active:bg-gray-50"
          >
            <div className="text-accent-500 mb-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
            </div>
            <div className="font-semibold text-gray-900 text-xs leading-tight">Info Harga</div>
            <div className="text-[11px] text-gray-500 leading-tight mt-0.5">Price intel + list harga</div>
          </button>
        </div>

        <div>
          <h3 className="font-semibold text-gray-800 mb-2 mt-4">Aktivitas Hari Ini</h3>
          {myVisitsToday.length === 0 ? (
            <Card className="text-center text-gray-400 text-sm py-8">Belum ada aktivitas tercatat.</Card>
          ) : (
            <div className="space-y-2">
              {myVisitsToday.map((v) => (
                <VisitRow key={v.id} visit={v} onClick={() => setEditingVisit(v)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {formKind && (
        <VisitForm
          kind={formKind}
          onClose={() => setFormKind(null)}
          onSaved={() => {
            setFormKind(null);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}

      {editingVisit && (
        <VisitForm
          kind={editingVisit.kind}
          existing={editingVisit}
          onClose={() => setEditingVisit(null)}
          onSaved={() => {
            setEditingVisit(null);
            setRefreshTick((t) => t + 1);
          }}
        />
      )}

      <Sheet open={priceIntelOpen} onClose={() => setPriceIntelOpen(false)} title="Info Harga Kompetitor">
        <PriceIntelForm onSaved={() => setPriceIntelOpen(false)} />
      </Sheet>
    </div>
  );
}

function VisitRow({ visit, onClick }: { visit: Visit; onClick: () => void }) {
  const customer = db.customerById(visit.customerId);
  return (
    <Card className="!p-3 tap-target text-left w-full" onClick={onClick}>
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900 text-sm">{customer?.name ?? "Pelanggan"}</div>
          <div className="text-xs text-gray-500 mt-0.5">{formatWIB(visit.timestamp)}</div>
        </div>
        <div className="flex items-center gap-1.5">
          {visit.history && visit.history.length > 0 && <Chip tone="amber">Diedit</Chip>}
          <Chip tone={visit.kind === "offline" ? "green" : "gray"}>{visit.kind === "offline" ? "Offline" : "Online"}</Chip>
        </div>
      </div>
      {visit.outcome && (
        <div className="mt-2">
          <Chip tone={visit.outcome === "offered" ? "green" : visit.outcome === "not_offered" ? "amber" : "gray"}>
            {visit.outcome === "offered" ? "Ditawarkan" : visit.outcome === "not_offered" ? "Tidak ditawarkan" : "Pelanggan tidak ada"}
          </Chip>
        </div>
      )}
      {visit.gpsFlagged && (
        <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M12 9v4M12 17h.01M10.3 3.9 2.7 18a1.5 1.5 0 0 0 1.3 2.2h16a1.5 1.5 0 0 0 1.3-2.2L13.7 3.9a1.5 1.5 0 0 0-2.6 0Z" />
          </svg>
          Lokasi &gt;500m dari alamat terdaftar
        </div>
      )}
    </Card>
  );
}

// Offline and online reports use the identical field set below (SKU/pricing, outcome,
// rejection, conclusion, next action) — only the top block differs: purpose+GPS for
// offline visits, channel for online engagements. Passing `existing` switches the form to
// edit mode: the save button patches that record via db.updateVisit, which snapshots the
// pre-edit version into history instead of overwriting it (PRD's immutable-with-audit-trail rule).
function VisitForm({
  kind,
  existing,
  onClose,
  onSaved
}: {
  kind: "offline" | "online";
  existing?: Visit;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const geo = useGeo();
  const customers = user ? db.customersForRep(user.id) : [];

  const [customerId, setCustomerId] = useState(existing?.customerId ?? customers[0]?.id ?? "");
  const customer = db.customerById(customerId);
  // kind-specific
  const [purpose, setPurpose] = useState<VisitPurpose>(existing?.purpose ?? "routine");
  const [channel, setChannel] = useState<OnlineChannel>(existing?.channel ?? "whatsapp");
  // shared
  const [sku, setSku] = useState<string>(existing?.skus?.[0] ?? SKU_CATALOGUE[0].sku);
  const [outcome, setOutcome] = useState<OfferingOutcome>(existing?.outcome ?? "offered");
  const priceTier = customer?.priceTier ?? "Retail";
  const listPrice = listPriceFor(sku, priceTier);
  // Rep types the actual price quoted (Rp/kg); the discount % is derived from it, not the other way round.
  const [offeredPrice, setOfferedPrice] = useState(String(existing?.priceQuoted ?? listPrice));
  const [quantity, setQuantity] = useState(existing?.quantity ? String(existing.quantity) : "");
  const discountPct = listPrice ? Math.round((1 - (Number(offeredPrice) || 0) / listPrice) * 1000) / 10 : 0;
  const [rejectionType, setRejectionType] = useState<RejectionType>(existing?.rejectionType ?? "external");
  const [rejectionReasons, setRejectionReasons] = useState<string[]>(existing?.rejectionReasons ?? []);
  const [internalPIC, setInternalPIC] = useState(existing?.internalPIC ?? INTERNAL_PICS[0]);
  const [conclusion, setConclusion] = useState(existing?.meetingConclusion ?? "");
  const [nextAction, setNextAction] = useState(existing?.nextAction ?? "");
  const [followUpDate, setFollowUpDate] = useState(existing?.followUpDate ?? "");

  const [submitting, setSubmitting] = useState(false);
  // Loss/rejection capture is required whenever the report did not result in an accepted offer.
  const requireRejection = outcome !== "offered";

  function onSkuChange(newSku: string) {
    setSku(newSku);
    // Default the price field to the new SKU's list price until the rep overrides it.
    setOfferedPrice(String(listPriceFor(newSku, priceTier)));
  }

  function toggleReason(r: string) {
    setRejectionReasons((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  async function submit() {
    if (!user || !customerId) return;
    setSubmitting(true);
    // Editing doesn't require being back on-site — keep the original GPS capture as-is.
    const coords = !existing && kind === "offline" ? await geo.capture() : (existing?.gps ?? null);
    const flagged = !existing && kind === "offline" && coords && customer
      ? haversineMeters(coords, { lat: customer.lat, lng: customer.lng }) > 500
      : (existing?.gpsFlagged ?? false);
    const quotedPrice = Math.round(Number(offeredPrice) || 0);

    const fields: Partial<Visit> = {
      kind,
      customerId,
      gps: coords,
      gpsFlagged: flagged,
      purpose: kind === "offline" ? purpose : undefined,
      channel: kind === "online" ? channel : undefined,
      skus: [sku],
      outcome,
      listPrice: outcome === "offered" ? listPrice : undefined,
      discountPct: outcome === "offered" ? discountPct : undefined,
      priceQuoted: outcome === "offered" ? quotedPrice : undefined,
      quantity: outcome === "offered" ? Number(quantity) || 0 : undefined,
      rejectionType: requireRejection ? rejectionType : undefined,
      rejectionReasons: requireRejection ? rejectionReasons : undefined,
      internalPIC: requireRejection && rejectionType === "internal" ? internalPIC : undefined,
      meetingConclusion: conclusion,
      nextAction,
      followUpDate: followUpDate || undefined
    };

    if (existing) {
      db.updateVisit(existing.id, fields, user.id);
    } else {
      db.addVisit({
        id: id("visit"),
        repId: user.id,
        timestamp: new Date().toISOString(),
        synced: navigator.onLine,
        ...fields
      } as Visit);
    }
    setSubmitting(false);
    onSaved();
  }

  const canSubmit = !!customerId && (outcome !== "offered" || !!quantity);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 pt-12 pb-3 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-900">
          {existing ? "Edit Laporan" : kind === "offline" ? "Laporan Kunjungan Offline" : "Engagement Online"}
        </h2>
        <button onClick={onClose} className="tap-target px-2 text-gray-400 text-2xl leading-none">
          &times;
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <Field label="Pelanggan" required>
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.kecamatan}
              </option>
            ))}
          </Select>
        </Field>

        {kind === "offline" ? (
          <Field label="Tujuan Kunjungan">
            <Select value={purpose} onChange={(e) => setPurpose(e.target.value as VisitPurpose)}>
              <option value="prospecting">Prospecting</option>
              <option value="routine">Kunjungan Rutin</option>
              <option value="follow_up">Follow-up</option>
              <option value="complaint">Penanganan Komplain</option>
            </Select>
          </Field>
        ) : (
          <Field label="Kanal">
            <Select value={channel} onChange={(e) => setChannel(e.target.value as OnlineChannel)}>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Telepon</option>
              <option value="video">Video Call</option>
              <option value="other">Lainnya</option>
            </Select>
          </Field>
        )}

        <Field label="SKU yang Dibahas" required>
          <Select value={sku} onChange={(e) => onSkuChange(e.target.value)}>
            {SKU_CATALOGUE.map((s) => (
              <option key={s.sku} value={s.sku}>
                {s.sku}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Hasil Penawaran" required>
          <Select value={outcome} onChange={(e) => setOutcome(e.target.value as OfferingOutcome)}>
            <option value="offered">Ditawarkan</option>
            <option value="not_offered">Tidak Ditawarkan</option>
            <option value="not_present">Pelanggan Tidak Ada</option>
          </Select>
        </Field>

        {outcome === "offered" && (
          <Card className="bg-brand-50/60 !p-3 mb-3">
            <div className="flex justify-between text-sm mb-3">
              <span className="text-gray-500">Harga List ({priceTier})</span>
              <span className="font-semibold text-gray-900">{formatRupiah(listPrice)} / kg</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Harga Ditawarkan (Rp/kg)">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={offeredPrice}
                  onChange={(e) => setOfferedPrice(e.target.value)}
                />
              </Field>
              <Field label="Jumlah (kg)">
                <Input type="number" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </Field>
            </div>
            <div className="flex justify-between text-sm pt-1 border-t border-brand-100">
              <span className="text-gray-500">{discountPct >= 0 ? "Diskon dari List" : "Markup dari List"}</span>
              <span className={`font-bold ${discountPct >= 0 ? "text-brand-600" : "text-amber-600"}`}>
                {Math.abs(discountPct)}%
              </span>
            </div>
          </Card>
        )}

        {requireRejection && (
          <Card className="bg-amber-50/60 mb-3">
            <Field label="Jenis Kegagalan" required>
              <Select value={rejectionType} onChange={(e) => { setRejectionType(e.target.value as RejectionType); setRejectionReasons([]); }}>
                <option value="external">External (keputusan pasar/pelanggan)</option>
                <option value="internal">Internal (isu dari SawitPRO)</option>
              </Select>
            </Field>
            <Field label="Alasan" required>
              <div className="flex flex-wrap gap-2">
                {(rejectionType === "external" ? EXTERNAL_REASONS : INTERNAL_REASONS).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleReason(r)}
                    className={`tap-target rounded-full px-3 text-sm border ${
                      rejectionReasons.includes(r) ? "bg-amber-500 text-white border-amber-500" : "border-gray-300 text-gray-600"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Field>
            {rejectionType === "internal" && (
              <Field label="PIC di Kantor" required>
                <Select value={internalPIC} onChange={(e) => setInternalPIC(e.target.value)}>
                  {INTERNAL_PICS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-amber-700 mt-1">Tugas follow-up otomatis dibuat untuk tim ops.</p>
              </Field>
            )}
          </Card>
        )}

        <Field label="Kesimpulan Pertemuan">
          <Textarea rows={2} maxLength={500} value={conclusion} onChange={(e) => setConclusion(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tindak Lanjut">
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="cth. Kirim penawaran" />
          </Field>
          <Field label="Tanggal Follow-up">
            <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </Field>
        </div>

        {!navigator.onLine && (
          <p className="text-xs text-amber-600 mb-2">Anda sedang offline — laporan akan disinkronkan otomatis saat online kembali.</p>
        )}
      </div>
      <div className="p-4 border-t border-gray-100">
        <Button className="w-full" disabled={!canSubmit || submitting} onClick={submit}>
          {submitting ? "Menyimpan..." : existing ? "Simpan Perubahan" : "Simpan Laporan"}
        </Button>
      </div>
    </div>
  );
}
