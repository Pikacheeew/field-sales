import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "./types";
import { db } from "./store";

interface AuthState {
  user: User | null;
  checkedInToday: boolean;
  checkInTime: string | null;
  requestOtp: (phone: string) => { ok: boolean; error?: string };
  verifyOtp: (phone: string, code: string) => { ok: boolean; error?: string };
  logout: () => void;
  checkIn: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

const CHECKIN_KEY = "sawitpro_checkin_v1";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [checkedInToday, setCheckedInToday] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  useEffect(() => {
    const session = db.getSession();
    if (session) setUser(db.userById(session.userId));
    const raw = localStorage.getItem(CHECKIN_KEY);
    if (raw) {
      const { date, time } = JSON.parse(raw);
      if (date === todayKey()) {
        setCheckedInToday(true);
        setCheckInTime(time);
      }
    }
  }, []);

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  // Mock OTP: any phone that matches a seeded user "sends" an OTP (always 123456 for the demo).
  function requestOtp(phone: string) {
    const found = db.userByPhone(phone.trim());
    if (!found) return { ok: false, error: "Nomor tidak terdaftar. Coba 081234500001 (rep) atau 081234599999 (ops)." };
    return { ok: true };
  }

  function verifyOtp(phone: string, code: string) {
    if (code.trim() !== "123456") return { ok: false, error: "Kode OTP salah. Gunakan 123456 untuk demo." };
    const found = db.userByPhone(phone.trim());
    if (!found) return { ok: false, error: "Nomor tidak terdaftar." };
    db.setSession(found.id);
    setUser(found);
    return { ok: true };
  }

  function logout() {
    db.setSession(null);
    setUser(null);
  }

  function checkIn() {
    const time = new Date().toISOString();
    localStorage.setItem(CHECKIN_KEY, JSON.stringify({ date: todayKey(), time }));
    setCheckedInToday(true);
    setCheckInTime(time);
  }

  return (
    <AuthCtx.Provider value={{ user, checkedInToday, checkInTime, requestOtp, verifyOtp, logout, checkIn }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
