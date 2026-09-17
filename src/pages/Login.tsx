import { useState } from "react";
import { useAuth } from "../lib/auth";
import { Button, Input } from "../components/ui";

export default function Login() {
  const { requestOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submitPhone(e: React.FormEvent) {
    e.preventDefault();
    const res = requestOtp(phone);
    if (!res.ok) return setError(res.error || "Gagal");
    setError("");
    setStep("otp");
  }

  function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    const res = verifyOtp(phone, code);
    if (!res.ok) return setError(res.error || "Gagal");
    setError("");
  }

  return (
    <div className="min-h-screen bg-brand-500 flex flex-col justify-center px-6">
      <div className="mb-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-8 h-8">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21c1-4.5 4-7 8-7s7 2.5 8 7" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="text-white text-2xl font-bold">Field Sales</h1>
        <p className="text-brand-50/80 text-sm mt-1">Masuk untuk mulai hari kerja Anda</p>
      </div>

      <div className="bg-white rounded-2xl shadow-card p-5">
        {step === "phone" ? (
          <form onSubmit={submitPhone}>
            <label className="block mb-4">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Nomor Handphone</span>
              <Input
                type="tel"
                inputMode="numeric"
                autoFocus
                placeholder="081234500001"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <Button type="submit" className="w-full" disabled={!phone}>
              Kirim Kode OTP
            </Button>
            <p className="text-xs text-gray-400 mt-4 leading-relaxed">
              Demo: rep — 081234500001 / 081234500002 / 081234500003. Regional manager — 081234599999. Price analyst — 081234577777.
            </p>
          </form>
        ) : (
          <form onSubmit={submitOtp}>
            <p className="text-sm text-gray-600 mb-4">
              Masukkan kode OTP yang dikirim ke <span className="font-semibold">{phone}</span>
            </p>
            <label className="block mb-4">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Kode OTP</span>
              <Input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
            <Button type="submit" className="w-full" disabled={code.length < 6}>
              Masuk
            </Button>
            <button type="button" className="text-sm text-gray-400 mt-4 w-full text-center" onClick={() => setStep("phone")}>
              Ganti nomor
            </button>
            <p className="text-xs text-gray-400 mt-2 text-center">Demo: kode OTP selalu 123456</p>
          </form>
        )}
      </div>
    </div>
  );
}
