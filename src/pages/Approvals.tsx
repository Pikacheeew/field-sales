import { useMemo, useState } from "react";
import { useAuth } from "../lib/auth";
import { db } from "../lib/store";
import { formatRupiah, formatWIB } from "../lib/format";
import { DISCOUNT_GUARDRAIL_PCT, type Visit } from "../lib/types";
import { Button, Card, Chip, PageHeader, Textarea } from "../components/ui";

// The Price Analyst's queue: requests waiting on a decision, and the full history of past
// decisions with their reasons — "so we can know and learn of why" a price was rejected.
export default function Approvals() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [tick, setTick] = useState(0);

  const pending = useMemo(() => db.pendingApprovals(), [tick]);
  const history = useMemo(() => db.approvalHistory(), [tick]);

  if (!user) return null;
  const canDecide = user.role === "analyst";

  return (
    <div className="pb-6">
      <PageHeader
        title="Persetujuan Harga"
        subtitle={`Batas diskon rep: ${DISCOUNT_GUARDRAIL_PCT}% dari harga list`}
        right={
          <button onClick={logout} className="tap-target text-xs font-medium text-gray-400">
            Keluar
          </button>
        }
      />
      <div className="px-4 space-y-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("pending")}
            className={`tap-target rounded-full px-3 text-sm border ${
              tab === "pending" ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 text-gray-600"
            }`}
          >
            Menunggu ({pending.length})
          </button>
          <button
            onClick={() => setTab("history")}
            className={`tap-target rounded-full px-3 text-sm border ${
              tab === "history" ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 text-gray-600"
            }`}
          >
            Riwayat ({history.length})
          </button>
        </div>

        {tab === "pending" ? (
          pending.length === 0 ? (
            <Card className="text-center text-gray-400 text-sm py-8">Tidak ada permintaan menunggu.</Card>
          ) : (
            <div className="space-y-2">
              {pending.map((v) => (
                <RequestCard
                  key={v.id}
                  visit={v}
                  canDecide={canDecide}
                  analystId={user.id}
                  onDecided={() => setTick((t) => t + 1)}
                />
              ))}
            </div>
          )
        ) : history.length === 0 ? (
          <Card className="text-center text-gray-400 text-sm py-8">Belum ada keputusan tercatat.</Card>
        ) : (
          <div className="space-y-2">
            {history.map((v) => (
              <HistoryCard key={v.id} visit={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestCard({
  visit,
  canDecide,
  analystId,
  onDecided
}: {
  visit: Visit;
  canDecide: boolean;
  analystId: string;
  onDecided: () => void;
}) {
  const customer = db.customerById(visit.customerId);
  const rep = db.userById(visit.repId);
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  function approve() {
    db.decideApproval(visit.id, "approved", reason || "Sesuai guardrail regional.", analystId);
    onDecided();
  }
  function reject() {
    if (!reason.trim()) return;
    db.decideApproval(visit.id, "rejected", reason.trim(), analystId);
    onDecided();
  }

  return (
    <Card className="!p-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold text-gray-900 text-sm">{customer?.name ?? "Pelanggan"}</div>
          <div className="text-xs text-gray-500">
            {rep?.name} · {formatWIB(visit.timestamp)}
          </div>
        </div>
        <Chip tone="amber">{visit.discountPct}% diskon</Chip>
      </div>
      <div className="mt-2 text-sm text-gray-700">{visit.skus?.[0]}</div>
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>Harga List: {formatRupiah(visit.listPrice ?? 0)}/kg</span>
        <span className="font-semibold text-gray-800">Diminta: {formatRupiah(visit.priceQuoted ?? 0)}/kg</span>
      </div>
      {visit.quantity !== undefined && <div className="text-xs text-gray-500 mt-0.5">Jumlah: {visit.quantity} kg</div>}
      {visit.photos && visit.photos.length > 0 && (
        <div className="flex gap-1.5 mt-2">
          {visit.photos.map((p, i) => (
            <img key={i} src={p} alt="Bukti dari rep" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
          ))}
        </div>
      )}

      {canDecide && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <Textarea
            rows={2}
            placeholder="Alasan (wajib jika ditolak) — cth. Di bawah COGS, sebaiknya jual di Rp8.100/kg"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mb-2"
          />
          {rejecting ? (
            <div className="flex gap-2">
              <Button variant="danger" className="flex-1" disabled={!reason.trim()} onClick={reject}>
                Konfirmasi Tolak
              </Button>
              <Button variant="ghost" className="flex-1" onClick={() => setRejecting(false)}>
                Batal
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button className="flex-1" onClick={approve}>
                Setujui
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => setRejecting(true)}>
                Tolak
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function HistoryCard({ visit }: { visit: Visit }) {
  const customer = db.customerById(visit.customerId);
  const rep = db.userById(visit.repId);
  const analyst = visit.approvedBy ? db.userById(visit.approvedBy) : null;
  const approved = visit.approvalStatus === "approved";

  return (
    <Card className="!p-3">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-semibold text-gray-900 text-sm">{customer?.name ?? "Pelanggan"}</div>
          <div className="text-xs text-gray-500">
            {rep?.name} · {visit.decidedAt ? formatWIB(visit.decidedAt) : ""}
          </div>
        </div>
        <Chip tone={approved ? "green" : "red"}>{approved ? "Disetujui" : "Ditolak"}</Chip>
      </div>
      <div className="mt-2 text-sm text-gray-700">
        {visit.skus?.[0]} · {visit.discountPct}% diskon · {formatRupiah(visit.priceQuoted ?? 0)}/kg
      </div>
      {visit.photos && visit.photos.length > 0 && (
        <div className="flex gap-1.5 mt-2">
          {visit.photos.map((p, i) => (
            <img key={i} src={p} alt="Bukti dari rep" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
          ))}
        </div>
      )}
      {visit.approvalReason && (
        <div className={`text-xs mt-1.5 rounded-lg px-2.5 py-1.5 ${approved ? "bg-brand-50 text-brand-700" : "bg-red-50 text-red-600"}`}>
          {visit.approvalReason}
        </div>
      )}
      <div className="text-[11px] text-gray-400 mt-1.5">Diputuskan oleh {analyst?.name ?? "-"}</div>
    </Card>
  );
}
