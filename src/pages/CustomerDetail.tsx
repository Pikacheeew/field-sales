import { useNavigate, useParams } from "react-router-dom";
import { db } from "../lib/store";
import { formatRupiah, formatRupiahCompact, formatWIB } from "../lib/format";
import { orderTotal } from "../lib/types";
import { Card, Chip } from "../components/ui";

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = id ? db.customerById(id) : null;

  if (!customer) return <div className="p-6 text-center text-gray-400">Pelanggan tidak ditemukan.</div>;

  const visits = db.visitsForCustomer(customer.id);
  const orders = db.orders().filter((o) => o.customerId === customer.id);
  const rep = db.userById(customer.assignedRepId);

  return (
    <div>
      <div className="px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="tap-target px-1 text-gray-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="w-6 h-6">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-gray-900">{customer.name}</h1>
      </div>

      <div className="px-4 space-y-3">
        <Card>
          <div className="flex justify-between items-start mb-2">
            <div>
              <div className="text-sm text-gray-500">{customer.address}</div>
              <div className="text-sm text-gray-500">
                {customer.kecamatan}, {customer.kabupaten}
              </div>
            </div>
            <Chip tone={customer.tier === "A" ? "green" : customer.tier === "B" ? "amber" : "gray"}>Tier {customer.tier}</Chip>
          </div>
          <div className="text-sm text-gray-500">Telp: {customer.phone}</div>
          <div className="text-sm text-gray-500">Rep: {rep?.name ?? "-"}</div>
          <div className="text-sm text-gray-500">Tier Harga: {customer.priceTier}</div>
          {customer.sspTier !== "-" && (
            <div className="mt-2">
              <Chip tone="amber">SSP {customer.sspTier} · {customer.sspPoints} poin</Chip>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-3 gap-3">
          <Card className="!p-3 text-center">
            <div className="text-lg font-bold text-brand-600">{formatRupiahCompact(customer.gmv3mo)}</div>
            <div className="text-[11px] text-gray-500 mt-1">GMV 3 Bulan</div>
          </Card>
          <Card className="!p-3 text-center">
            <div className="text-lg font-bold text-brand-600">
              {customer.visitFrequencyActual}/{customer.visitFrequencyPlanned}
            </div>
            <div className="text-[11px] text-gray-500 mt-1">Frek. Kunjungan</div>
          </Card>
          <Card className="!p-3 text-center">
            <div className="text-lg font-bold text-brand-600">{orders.length}</div>
            <div className="text-[11px] text-gray-500 mt-1">Total Order</div>
          </Card>
        </div>

        {customer.openNotes && (
          <Card className="bg-amber-50/60">
            <div className="text-xs font-semibold text-amber-700 mb-1">Catatan Terbuka</div>
            <div className="text-sm text-gray-700">{customer.openNotes}</div>
          </Card>
        )}

        <div>
          <h3 className="font-semibold text-gray-800 mb-2">Riwayat Kunjungan</h3>
          {visits.length === 0 ? (
            <Card className="text-center text-gray-400 text-sm py-6">Belum ada kunjungan tercatat.</Card>
          ) : (
            <div className="space-y-2">
              {visits.map((v) => (
                <Card key={v.id} className="!p-3">
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-gray-900">{formatWIB(v.timestamp)}</div>
                    <Chip tone={v.kind === "offline" ? "green" : "gray"}>{v.kind === "offline" ? "Offline" : "Online"}</Chip>
                  </div>
                  {v.skus && v.skus.length > 0 && <div className="text-xs text-gray-500 mt-1">SKU: {v.skus.join(", ")}</div>}
                  {v.priceQuoted !== undefined && (
                    <div className="text-xs text-gray-500 mt-0.5">Harga: {formatRupiah(v.priceQuoted)} / kg</div>
                  )}
                  {v.meetingConclusion && <div className="text-sm text-gray-600 mt-1">{v.meetingConclusion}</div>}
                  {v.rejectionType && (
                    <div className="text-xs text-red-500 mt-1">
                      Gagal ({v.rejectionType === "external" ? "External" : "Internal"}): {v.rejectionReasons?.join(", ")}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="pb-4">
          <h3 className="font-semibold text-gray-800 mb-2">Riwayat Order</h3>
          {orders.length === 0 ? (
            <Card className="text-center text-gray-400 text-sm py-6">Belum ada order.</Card>
          ) : (
            <div className="space-y-2">
              {orders.map((o) => (
                <Card key={o.id} className="!p-3">
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-medium text-gray-900">{formatWIB(o.timestamp)}</div>
                    <Chip tone={o.status === "confirmed" ? "green" : o.status === "cancelled" ? "red" : "amber"}>{o.status}</Chip>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {o.items.map((it) => `${it.sku} ${it.tons}ton`).join(", ")}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {o.deliveryTerm === "franco" ? `Franco — ${o.deliveryAddress}` : `Loco — ${o.locoLocation}`}
                  </div>
                  <div className="text-sm font-semibold text-brand-600 mt-1">{formatRupiah(orderTotal(o.items))}</div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
