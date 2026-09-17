import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useGeo } from "../lib/useGeo";
import { db, id } from "../lib/store";
import { formatRupiah } from "../lib/format";
import { PRICE_TIERS, SKU_CATALOGUE, type PriceSource, type PriceType } from "../lib/types";
import { Button, Field, Input, Select, Textarea } from "./ui";

// Our own price list, for reference while a rep is entering a competitor's price.
export function PriceListReference() {
  return (
    <div className="mb-4 overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-gray-400">
            <th className="font-medium pb-1 pr-2">SKU</th>
            {PRICE_TIERS.map((t) => (
              <th key={t} className="font-medium pb-1 px-1 text-right whitespace-nowrap">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SKU_CATALOGUE.map((s) => (
            <tr key={s.sku} className="border-t border-gray-100">
              <td className="py-1.5 pr-2 text-gray-700">{s.sku}</td>
              {PRICE_TIERS.map((t) => (
                <td key={t} className="py-1.5 px-1 text-right text-gray-600 whitespace-nowrap">
                  {formatRupiah(s.price[t])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[11px] text-gray-400 mt-1">Harga list SawitPRO (Rp/kg) — untuk pembanding.</p>
    </div>
  );
}

const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // matches the 5MB/photo cap used for visit photos in the PRD

export function PriceIntelForm({ onSaved }: { onSaved: () => void }) {
  const { user } = useAuth();
  const geo = useGeo();
  const [saved, setSaved] = useState(false);

  const [competitor, setCompetitor] = useState("");
  const [skus, setSkus] = useState<string[]>([]);
  const [price, setPrice] = useState("");
  const [priceType, setPriceType] = useState<PriceType>("do_price");
  const [source, setSource] = useState<PriceSource>("direct");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const [photoError, setPhotoError] = useState("");

  function toggleSku(s: string) {
    setSkus((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function onPhotoSelected(file: File | undefined) {
    setPhotoError("");
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Foto maksimal 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!user) return;
    const coords = await geo.capture();
    db.addPriceIntel({
      id: id("pi"),
      repId: user.id,
      timestamp: new Date().toISOString(),
      gps: coords,
      competitorName: competitor || "Tidak disebutkan",
      skus,
      competitorPrice: Number(price) || 0,
      priceType,
      source,
      photo,
      notes
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setCompetitor("");
      setSkus([]);
      setPrice("");
      setNotes("");
      setPhoto(undefined);
      onSaved();
    }, 900);
  }

  if (saved) return <div className="py-10 text-center text-brand-600 font-semibold">Tersimpan ✓</div>;

  return (
    <>
      <PriceListReference />
      <Field label="Nama Kompetitor">
        <Input value={competitor} onChange={(e) => setCompetitor(e.target.value)} placeholder="cth. Petro Sejahtera" />
      </Field>
      <Field label="SKU" required>
        <div className="flex flex-wrap gap-2">
          {SKU_CATALOGUE.map((s) => (
            <button
              key={s.sku}
              type="button"
              onClick={() => toggleSku(s.sku)}
              className={`tap-target rounded-full px-3 text-sm border ${
                skus.includes(s.sku) ? "bg-brand-500 text-white border-brand-500" : "border-gray-300 text-gray-600"
              }`}
            >
              {s.sku}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Harga Kompetitor (Rp/kg)" required>
        <Input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
      </Field>
      <Field label="Jenis Harga">
        <Select value={priceType} onChange={(e) => setPriceType(e.target.value as PriceType)}>
          <option value="do_price">Harga DO</option>
          <option value="retail_price">Harga Retail</option>
          <option value="special_deal">Special Deal</option>
        </Select>
      </Field>
      <Field label="Sumber">
        <Select value={source} onChange={(e) => setSource(e.target.value as PriceSource)}>
          <option value="direct">Observasi langsung</option>
          <option value="customer_told">Info dari pelanggan</option>
          <option value="distributor_told">Info dari distributor</option>
        </Select>
      </Field>
      <Field label="Foto Bukti (opsional)">
        {photo ? (
          <div className="flex items-center gap-3">
            <img src={photo} alt="Bukti harga" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
            <button type="button" className="text-sm text-red-500 tap-target px-2" onClick={() => setPhoto(undefined)}>
              Hapus foto
            </button>
          </div>
        ) : (
          <label className="tap-target flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm cursor-pointer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M4 7h3l2-2h6l2 2h3v12H4z" strokeLinejoin="round" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            Ambil / unggah foto daftar harga
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onPhotoSelected(e.target.files?.[0])}
            />
          </label>
        )}
        {photoError && <p className="text-xs text-red-500 mt-1">{photoError}</p>}
      </Field>
      <Field label="Catatan">
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <p className="text-xs text-gray-400 mb-3">Lokasi GPS &amp; waktu diambil otomatis saat submit.</p>
      <Button className="w-full" onClick={submit} disabled={!price || skus.length === 0}>
        Simpan Info Harga
      </Button>
    </>
  );
}
