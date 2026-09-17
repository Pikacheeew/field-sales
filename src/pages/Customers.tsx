import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { db, id } from "../lib/store";
import { formatDateShort } from "../lib/format";
import { Button, Card, Chip, Field, Input, PageHeader, Select, Sheet } from "../components/ui";
import { PRICE_TIERS, type CustomerType, type PriceTier, type Tier } from "../lib/types";

export default function Customers() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [tierFilter, setTierFilter] = useState<Tier | "all">("all");
  const [typeFilter, setTypeFilter] = useState<CustomerType | "all">("all");
  const [addOpen, setAddOpen] = useState(false);
  const [tick, setTick] = useState(0);

  const all = user?.role === "ops" ? db.customers() : db.customersForRep(user!.id);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((c) => (tierFilter === "all" ? true : c.tier === tierFilter))
      .filter((c) => (typeFilter === "all" ? true : c.customerType === typeFilter))
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.kecamatan.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, query, tierFilter, typeFilter, tick]);

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        subtitle={`${filtered.length} dari ${all.length} pelanggan`}
        right={
          <Button className="!px-3 !text-sm" onClick={() => setAddOpen(true)}>
            + Baru
          </Button>
        }
      />
      <div className="px-4 space-y-3">
        <Input placeholder="Cari nama atau kecamatan..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex gap-2 overflow-x-auto">
          {(["all", "A", "B", "C"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`tap-target rounded-full px-3 text-sm border whitespace-nowrap ${
                tierFilter === t ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 text-gray-600"
              }`}
            >
              {t === "all" ? "Semua Tier" : `Tier ${t}`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {(["all", "new", "existing"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`tap-target rounded-full px-3 text-sm border ${
                typeFilter === t ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 text-gray-600"
              }`}
            >
              {t === "all" ? "Semua" : t === "new" ? "Pelanggan Baru" : "Pelanggan Lama"}
            </button>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          {filtered.map((c) => (
            <Link key={c.id} to={`/customers/${c.id}`}>
              <Card className="!p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{c.name}</div>
                    <div className="text-xs text-gray-500">
                      {c.kecamatan}, {c.kabupaten}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Chip tone={c.customerType === "new" ? "amber" : "gray"}>{c.customerType === "new" ? "Baru" : "Lama"}</Chip>
                    <Chip tone={c.tier === "A" ? "green" : c.tier === "B" ? "amber" : "gray"}>Tier {c.tier}</Chip>
                  </div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>Kunjungan terakhir: {c.lastVisitDate ? formatDateShort(c.lastVisitDate) : "Belum pernah"}</span>
                  {c.pendingApproval && <Chip tone="amber">Menunggu approval</Chip>}
                </div>
              </Card>
            </Link>
          ))}
          {filtered.length === 0 && <p className="text-center text-gray-400 text-sm py-8">Tidak ada pelanggan cocok.</p>}
        </div>
      </div>

      <AddCustomerSheet
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={() => {
          setAddOpen(false);
          setTick((t) => t + 1);
        }}
      />
    </div>
  );
}

function AddCustomerSheet({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [kabupaten, setKabupaten] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [phone, setPhone] = useState("");
  const [tier, setTier] = useState<Tier>("C");
  const [priceTier, setPriceTier] = useState<PriceTier>("Grosir");

  function submit() {
    if (!user || !name) return;
    db.addCustomer({
      id: id("cust"),
      name,
      address,
      kabupaten,
      kecamatan,
      tier,
      priceTier,
      customerType: "new",
      assignedRepId: user.id,
      phone,
      lat: -0.3 + Math.random() * 0.6,
      lng: 101.0 + Math.random() * 0.8,
      gmv3mo: 0,
      lastVisitDate: null,
      lastVisitRepId: null,
      lastOrderDate: null,
      lastOrderValue: null,
      visitFrequencyPlanned: 2,
      visitFrequencyActual: 0,
      openNotes: "",
      sspTier: "-",
      sspPoints: 0,
      pendingApproval: user.role === "rep"
    });
    setName("");
    setAddress("");
    setKabupaten("");
    setKecamatan("");
    setPhone("");
    onSaved();
  }

  return (
    <Sheet open={open} onClose={onClose} title="Tambah Pelanggan Baru">
      <Field label="Nama Pelanggan" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Alamat">
        <Input value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kabupaten">
          <Input value={kabupaten} onChange={(e) => setKabupaten(e.target.value)} />
        </Field>
        <Field label="Kecamatan">
          <Input value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} />
        </Field>
      </div>
      <Field label="No. Telepon">
        <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tier (GMV)">
          <Select value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </Select>
        </Field>
        <Field label="Tier Harga">
          <Select value={priceTier} onChange={(e) => setPriceTier(e.target.value as PriceTier)}>
            {PRICE_TIERS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <p className="text-xs text-amber-600 mb-3">
        Pelanggan baru dari lapangan menunggu persetujuan ops sebelum muncul di database bersama.
      </p>
      <Button className="w-full" disabled={!name} onClick={submit}>
        Simpan Pelanggan
      </Button>
    </Sheet>
  );
}
