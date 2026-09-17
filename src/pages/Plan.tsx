import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { db, id } from "../lib/store";
import { wibNow } from "../lib/format";
import { Button, Card, PageHeader, Select, Sheet } from "../components/ui";

const DAY_NAMES = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

// weekDates are UTC-midnight stand-ins for WIB calendar days — always read them with
// UTC getters, never local ones, or the day can shift depending on the browser's timezone.
function shortLabel(d: Date) {
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

// All date math runs on the WIB-shifted "now" via UTC getters, so a Monday in WIB
// stays Monday regardless of the browser's own timezone.
function startOfWeek(d: Date) {
  const date = new Date(d);
  const day = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - day);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Plan() {
  const { user } = useAuth();
  const [weekStart] = useState(() => startOfWeek(wibNow()));
  const [tick, setTick] = useState(0);
  const [addFor, setAddFor] = useState<string | null>(null);

  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setUTCDate(d.getUTCDate() + i);
      return d;
    }),
    [weekStart]
  );

  if (!user) return null;
  const customers = db.customersForRep(user.id);
  const entries = db.planForRepWeek(user.id, weekDates.map(dateKey));

  const plannedCount = entries.length;
  const actualCount = entries.filter((e) => e.done).length;

  return (
    <div>
      <PageHeader title="Rencana Kunjungan" subtitle={`Minggu ini · ${shortLabel(weekDates[0])} - ${shortLabel(weekDates[6])}`} />

      <div className="px-4 mb-3">
        <Card className="!p-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Rencana vs Aktual</span>
            <span className="font-semibold text-brand-600">
              {actualCount}/{plannedCount} selesai
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-brand-500"
              style={{ width: plannedCount ? `${(actualCount / plannedCount) * 100}%` : "0%" }}
            />
          </div>
        </Card>
      </div>

      <div className="px-4 space-y-3 pb-4">
        {weekDates.map((d, i) => {
          const key = dateKey(d);
          const dayEntries = entries.filter((e) => e.date === key);
          const isToday = key === dateKey(wibNow());
          return (
            <Card key={key} className={isToday ? "ring-2 ring-brand-400" : ""}>
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold text-gray-900 text-sm">
                  {DAY_NAMES[i]} <span className="text-gray-400 font-normal">{d.getUTCDate()}/{d.getUTCMonth() + 1}</span>
                </div>
                <button className="text-brand-600 text-sm font-medium tap-target px-2" onClick={() => setAddFor(key)}>
                  + Tambah
                </button>
              </div>
              {dayEntries.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada rencana kunjungan.</p>
              ) : (
                <div className="space-y-1.5">
                  {dayEntries.map((e) => {
                    const cust = db.customerById(e.customerId);
                    return (
                      <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2.5 py-2">
                        <button
                          className="flex items-center gap-2 flex-1 text-left"
                          onClick={() => {
                            db.togglePlanDone(e.id);
                            setTick((t) => t + 1);
                          }}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border flex-shrink-0 ${
                              e.done ? "bg-brand-500 border-brand-500" : "border-gray-300"
                            }`}
                          />
                          <Link to={`/customers/${e.customerId}`} className={`text-sm ${e.done ? "line-through text-gray-400" : "text-gray-800"}`}>
                            {cust?.name ?? "Pelanggan"}
                          </Link>
                        </button>
                        <button
                          className="text-gray-300 tap-target px-2"
                          onClick={() => {
                            db.removePlanEntry(e.id);
                            setTick((t) => t + 1);
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Sheet open={!!addFor} onClose={() => setAddFor(null)} title="Tambah Kunjungan Terencana">
        <AddPlanForm
          customers={customers}
          onAdd={(customerId) => {
            if (!addFor || !user) return;
            db.addPlanEntry({ id: id("plan"), repId: user.id, date: addFor, customerId, done: false });
            setAddFor(null);
            setTick((t) => t + 1);
          }}
        />
      </Sheet>
      {/* tick forces re-render after mutations */}
      <span className="hidden">{tick}</span>
    </div>
  );
}

function AddPlanForm({ customers, onAdd }: { customers: ReturnType<typeof db.customers>; onAdd: (id: string) => void }) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  return (
    <div>
      <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="mb-3">
        {customers.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} — {c.kecamatan}
          </option>
        ))}
      </Select>
      <Button className="w-full" disabled={!customerId} onClick={() => onAdd(customerId)}>
        Tambahkan ke Rencana
      </Button>
    </div>
  );
}
