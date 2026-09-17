import { useState } from "react";
import { useParams } from "react-router-dom";
import { db, id } from "../lib/store";
import { formatRupiah } from "../lib/format";
import {
  MIN_ORDER_TONS,
  SAWITPRO_LOCO_LOCATIONS,
  SKU_CATALOGUE,
  TON_STEP,
  pricePerKgForTons,
  orderItemTotal,
  type DeliveryTerm,
  type OrderItem
} from "../lib/types";
import { Button, Card, Chip, Field, Input, Select } from "../components/ui";

export default function Ordering() {
  const { customerId } = useParams();
  const [selectedId, setSelectedId] = useState(customerId ?? "");
  const customer = selectedId ? db.customerById(selectedId) : null;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [deliveryTerm, setDeliveryTerm] = useState<DeliveryTerm>("loco");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [locoLocation, setLocoLocation] = useState(SAWITPRO_LOCO_LOCATIONS[0]);
  const [confirmedOrder, setConfirmedOrder] = useState<{ id: string; total: number } | null>(null);

  const priceTier = customer?.priceTier ?? "Retail";
  const rep = customer ? db.userById(customer.assignedRepId) : null;

  // Reads the previous tonnage from the updater function, not a captured prop, so
  // fast repeat taps (real on a touchscreen) never drop an increment to a stale value.
  function bumpTons(sku: string, delta: number) {
    setCart((prev) => ({ ...prev, [sku]: Math.max(0, (prev[sku] ?? 0) + delta) }));
  }

  const items: OrderItem[] = Object.entries(cart)
    .filter(([, tons]) => tons >= MIN_ORDER_TONS)
    .map(([sku, tons]) => ({ sku, tons, pricePerKg: pricePerKgForTons(sku, priceTier, tons) }));
  const total = items.reduce((sum, it) => sum + orderItemTotal(it), 0);
  const canSubmit = items.length > 0 && (deliveryTerm === "loco" ? !!locoLocation : !!deliveryAddress.trim());

  function submitOrder() {
    if (!customer || !canSubmit) return;
    const orderId = id("order");
    db.addOrder({
      id: orderId,
      customerId: customer.id,
      repId: customer.assignedRepId,
      timestamp: new Date().toISOString(),
      items,
      deliveryTerm,
      deliveryAddress: deliveryTerm === "franco" ? deliveryAddress.trim() : undefined,
      locoLocation: deliveryTerm === "loco" ? locoLocation : undefined,
      status: "pending"
    });
    setConfirmedOrder({ id: orderId, total });
    setCart({});
    setDeliveryAddress("");
  }

  if (!selectedId) {
    return (
      <div className="min-h-screen bg-[#fff8ef]">
        <OrderingHeader />
        <div className="px-4 py-6">
          <p className="text-sm text-gray-500 mb-3">Demo: pilih toko untuk membuka katalog (biasanya dibuka via link/QR dari rep).</p>
          <div className="space-y-2">
            {db.customers().slice(0, 8).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className="tap-target w-full text-left bg-white rounded-xl shadow-card px-4 py-3"
              >
                <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                <div className="text-xs text-gray-500">{c.kecamatan}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (confirmedOrder) {
    return (
      <div className="min-h-screen bg-[#fff8ef] flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-full bg-accent-500 text-white flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="w-8 h-8">
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">Pesanan Terkirim</h1>
        <p className="text-sm text-gray-500 mb-4">ID Pesanan: {confirmedOrder.id}</p>
        <Card className="w-full text-left mb-4">
          <div className="text-sm text-gray-600">Total: <span className="font-bold text-gray-900">{formatRupiah(confirmedOrder.total)}</span></div>
          <div className="text-sm text-gray-600 mt-1">Status: <Chip tone="amber">Menunggu Konfirmasi</Chip></div>
          <div className="text-sm text-gray-600 mt-2">Sales akan menghubungi Anda: <span className="font-semibold">{rep?.name}</span></div>
        </Card>
        <Button className="w-full" onClick={() => setConfirmedOrder(null)}>
          Kembali ke Katalog
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8ef] pb-32">
      <OrderingHeader />
      <div className="px-4 -mt-6">
        <Card className="mb-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-semibold text-gray-900">{customer!.name}</div>
              <div className="text-xs text-gray-500">Tier harga: {priceTier}</div>
            </div>
            {customer!.sspTier !== "-" && <Chip tone="amber">SSP {customer!.sspTier} · {customer!.sspPoints}pt</Chip>}
          </div>
        </Card>

        <h2 className="font-semibold text-gray-800 mb-1">Katalog Produk</h2>
        <p className="text-xs text-gray-500 mb-2">
          Minimum order {MIN_ORDER_TONS} ton per SKU · harga/kg makin murah tiap kelipatan {TON_STEP} ton
        </p>
        <div className="space-y-2">
          {SKU_CATALOGUE.map((s) => {
            const tons = cart[s.sku] ?? 0;
            const activePrice = pricePerKgForTons(s.sku, priceTier, Math.max(tons, MIN_ORDER_TONS));
            return (
              <Card key={s.sku} className="!p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{s.sku}</div>
                    <div className="text-xs text-gray-500">{formatRupiah(activePrice)} / kg{tons > 0 ? ` · ${tons} ton` : ""}</div>
                  </div>
                  <TonStepper value={tons} onBump={(delta) => bumpTons(s.sku, delta)} />
                </div>
              </Card>
            );
          })}
        </div>

        <h2 className="font-semibold text-gray-800 mb-2 mt-4">Pengiriman</h2>
        <Card>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setDeliveryTerm("loco")}
              className={`tap-target flex-1 rounded-xl border text-sm font-medium ${
                deliveryTerm === "loco" ? "bg-accent-500 text-white border-accent-500" : "border-gray-300 text-gray-600"
              }`}
            >
              Loco (Ambil Sendiri)
            </button>
            <button
              type="button"
              onClick={() => setDeliveryTerm("franco")}
              className={`tap-target flex-1 rounded-xl border text-sm font-medium ${
                deliveryTerm === "franco" ? "bg-accent-500 text-white border-accent-500" : "border-gray-300 text-gray-600"
              }`}
            >
              Franco (Diantar)
            </button>
          </div>
          {deliveryTerm === "loco" ? (
            <Field label="Titik Ambil (Gudang SawitPRO)">
              <Select value={locoLocation} onChange={(e) => setLocoLocation(e.target.value)}>
                {SAWITPRO_LOCO_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Alamat Penerima" required>
              <Input value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} placeholder="Alamat lengkap tujuan pengiriman" />
            </Field>
          )}
        </Card>
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 p-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>{items.length} SKU · {items.reduce((s, it) => s + it.tons, 0)} ton</span>
            <span className="font-bold text-gray-900">{formatRupiah(total)}</span>
          </div>
          <Button className="w-full" disabled={!canSubmit} onClick={submitOrder}>
            Kirim Permintaan Order
          </Button>
        </div>
      )}
    </div>
  );
}

function OrderingHeader() {
  return (
    <div className="bg-accent-500 px-4 pt-12 pb-10 text-white">
      <div className="text-xs uppercase tracking-wide text-white/80">Sahabat SawitPRO</div>
      <h1 className="text-2xl font-bold">Toko Tani</h1>
      <p className="text-white/90 text-sm mt-1">Pesan pupuk langsung dari sales Anda</p>
    </div>
  );
}

function TonStepper({ value, onBump }: { value: number; onBump: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onBump(-TON_STEP)}
        disabled={value <= 0}
        className="tap-target w-8 h-8 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center disabled:opacity-40"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-medium">{value}t</span>
      <button
        onClick={() => onBump(TON_STEP)}
        className="tap-target w-8 h-8 rounded-full bg-accent-500 text-white flex items-center justify-center"
      >
        +
      </button>
    </div>
  );
}
