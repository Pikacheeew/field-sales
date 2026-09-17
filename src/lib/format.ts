export function formatRupiah(n: number) {
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

// Abbreviated form for tight stat cards (e.g. "Rp52,5jt") — full formatRupiah overflows a
// 1/3-width mobile card once GMV numbers get into the tens of millions.
export function formatRupiahCompact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return "Rp" + (n / 1_000_000_000).toFixed(1).replace(".", ",") + "M";
  if (abs >= 1_000_000) return "Rp" + (n / 1_000_000).toFixed(1).replace(".", ",") + "jt";
  if (abs >= 1_000) return "Rp" + (n / 1_000).toFixed(0) + "rb";
  return formatRupiah(n);
}

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// Displays a UTC ISO timestamp as WIB (UTC+7) per PRD's explicit local-time requirement.
export function formatWIB(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  const day = DAYS[d.getUTCDay()];
  const date = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day}, ${date} ${month} ${year} — ${hh}:${mm}`;
}

export function formatDateShort(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600 * 1000);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

// "Now" shifted so its UTC getters read as WIB wall-clock time — keeps date math consistent
// with the WIB timestamps shown everywhere else, regardless of the browser's own timezone.
export function wibNow() {
  return new Date(Date.now() + 7 * 3600 * 1000);
}

export function todayKey() {
  return wibNow().toISOString().slice(0, 10);
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
