import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

type Step = "email" | "otp";

export default function AdminLoginPage() {
  const [step, setStep]             = useState<Step>("email");
  const [email, setEmail]           = useState("");
  const [otp, setOtp]               = useState(["", "", "", "", "", ""]);
  const [error, setError]           = useState("");
  const [info, setInfo]             = useState("");
  const [loading, setLoading]       = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { user, loading: authLoading, refetch } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") navigate("/admin");
  }, [user, authLoading, navigate]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const requestOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setLoading(true); setError(""); setInfo("");
    const res = await fetch("/api/auth/admin/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) { setError("Failed to send code. Please try again."); return; }
    const data = await res.json();
    setStep("otp");
    setResendCooldown(60);
    if (data.dev) setInfo("Development mode: check the API server console for your OTP code.");
    else           setInfo(`A 6-digit code was sent to ${email}`);
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const handleOtpChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
    // Auto-submit when all 6 digits filled
    if (digit && next.every((d) => d !== "") && idx === 5) {
      verifyOtp(next.join(""));
    }
  };

  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtp(digits);
      inputRefs.current[5]?.focus();
      verifyOtp(pasted);
    }
  };

  const verifyOtp = async (code?: string) => {
    const finalCode = code ?? otp.join("");
    if (finalCode.length !== 6) { setError("Enter all 6 digits."); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/admin/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code: finalCode }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Invalid code. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      setLoading(false);
      return;
    }
    await refetch();
    navigate("/admin");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#006c49] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex font-[Manrope]">

      {/* ── Left panel ──────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col bg-[#080e0b] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)", backgroundSize: "48px 48px" }} />
        <div className="absolute top-[-120px] left-[-80px] w-[520px] h-[520px] bg-[#006c49] opacity-[0.12] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[-60px] w-[360px] h-[360px] bg-[#006c49] opacity-[0.08] rounded-full blur-[100px] pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#006c49] rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">storefront</span>
            </div>
            <span className="text-white font-[Manrope] font-bold text-[13px] tracking-[0.22em] uppercase">Luxe Boutique</span>
          </div>
        </div>

        {/* Centre */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-16 pb-16">
          <div className="space-y-6 max-w-[420px]">
            <div className="inline-flex items-center gap-2 bg-[#006c49]/15 border border-[#006c49]/30 px-4 py-2 rounded-full">
              <span className="material-symbols-outlined text-[#4edea3] text-[14px]">shield</span>
              <span className="text-[#4edea3] text-[11px] font-bold tracking-[0.18em] uppercase">Admin Portal</span>
            </div>
            <h1 className="font-serif text-white text-[42px] leading-[1.1] font-semibold">Your store,<br />under control.</h1>
            <p className="text-white/50 text-[15px] leading-relaxed">Manage products, orders, customers, and marketing channels from a single command centre.</p>
          </div>

          {/* How it works */}
          <div className="mt-14 max-w-[420px] space-y-5">
            <p className="text-white/30 text-[11px] font-bold tracking-[0.18em] uppercase">How sign-in works</p>
            {[
              { step: "1", icon: "mail",        title: "Enter your admin email",        body: "We send a secure one-time code to your registered admin address." },
              { step: "2", icon: "pin",         title: "Enter the 6-digit OTP",          body: "No password needed — the code expires in 10 minutes." },
              { step: "3", icon: "verified",    title: "Role is verified",               body: "Only ADMIN accounts can access this portal." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full border border-[#006c49]/40 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#4edea3] text-[16px]">{s.icon}</span>
                </div>
                <div>
                  <p className="text-white/80 font-bold text-sm mb-0.5">{s.title}</p>
                  <p className="text-white/35 text-xs leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 px-12 py-8 border-t border-white/[0.06] flex items-center justify-between">
          <p className="text-white/25 text-[11px] tracking-widest uppercase">Secure Admin Access</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
            <span className="text-white/30 text-[11px]">All systems operational</span>
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────── */}
      <div className="flex-1 bg-[#f8f9ff] flex flex-col">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 p-8 border-b border-slate-100 bg-white">
          <div className="w-8 h-8 bg-[#006c49] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">storefront</span>
          </div>
          <span className="font-bold text-[13px] tracking-[0.22em] uppercase text-[#0a0f0d]">Luxe Boutique</span>
          <span className="ml-auto text-[10px] font-bold tracking-widest uppercase text-[#006c49] bg-[#006c49]/10 px-3 py-1 rounded-full">Admin Portal</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[400px] space-y-8">

            {/* Step indicator */}
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all ${step === "email" ? "bg-[#0a0f0d] text-white" : "bg-[#006c49] text-white"}`}>
                {step === "email" ? "1" : <span className="material-symbols-outlined text-[14px]">check</span>}
              </div>
              <div className="flex-1 h-px bg-slate-200" />
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all ${step === "otp" ? "bg-[#0a0f0d] text-white" : "bg-slate-200 text-slate-400"}`}>2</div>
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <h2 className="font-serif text-[30px] text-[#0a0f0d] font-semibold leading-tight">
                {step === "email" ? "Admin Sign In" : "Enter your code"}
              </h2>
              <p className="text-[#7c839b] text-sm">
                {step === "email"
                  ? "Passwordless access for administrators."
                  : `Check your inbox at ${email}`}
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">error</span>
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            )}

            {/* Info */}
            {info && !error && (
              <div className="flex items-start gap-3 bg-[#f0faf6] border border-[#c3eed8] rounded-xl p-4">
                <span className="material-symbols-outlined text-[#006c49] text-[18px] shrink-0 mt-0.5">check_circle</span>
                <p className="text-[#006c49] text-sm font-semibold">{info}</p>
              </div>
            )}

            {/* STEP 1 — Email */}
            {step === "email" && (
              <form onSubmit={requestOtp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#45464d]">Admin Email</label>
                  <input
                    type="email" required autoFocus
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@luxeboutique.com"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#006c49] focus:ring-2 focus:ring-[#006c49]/10 transition-all placeholder:text-slate-300"
                  />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-[#0a0f0d] text-white py-4 rounded-xl font-bold text-[12px] tracking-[0.18em] uppercase hover:bg-[#006c49] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-lg shadow-black/10">
                  {loading
                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>Sending code…</>
                    : <><span className="material-symbols-outlined text-[16px]">mail</span>Send Sign-In Code</>}
                </button>
              </form>
            )}

            {/* STEP 2 — OTP */}
            {step === "otp" && (
              <div className="space-y-6">
                {/* 6-box OTP input */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[#45464d] block mb-3">6-Digit Code</label>
                  <div className="flex gap-2.5" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => { inputRefs.current[idx] = el; }}
                        type="text" inputMode="numeric" maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-12 h-14 text-center text-[22px] font-mono font-bold border-2 rounded-xl outline-none transition-all bg-white
                          ${digit ? "border-[#006c49] text-[#0a0f0d]" : "border-slate-200 text-slate-300"}
                          focus:border-[#006c49] focus:ring-2 focus:ring-[#006c49]/10`}
                      />
                    ))}
                  </div>
                  <p className="text-[11px] text-[#7c839b] mt-2.5">You can paste the code directly into any box.</p>
                </div>

                <button
                  onClick={() => verifyOtp()} disabled={loading || otp.some((d) => !d)}
                  className="w-full bg-[#0a0f0d] text-white py-4 rounded-xl font-bold text-[12px] tracking-[0.18em] uppercase hover:bg-[#006c49] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2.5 shadow-lg shadow-black/10">
                  {loading
                    ? <><span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>Verifying…</>
                    : <><span className="material-symbols-outlined text-[16px]">lock_open</span>Verify & Sign In</>}
                </button>

                {/* Resend + change email */}
                <div className="flex items-center justify-between text-sm">
                  <button onClick={() => { setStep("email"); setOtp(["","","","","",""]); setError(""); setInfo(""); }}
                    className="text-[#7c839b] hover:text-[#0a0f0d] transition-colors text-[12px] flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">arrow_back</span> Change email
                  </button>
                  <button
                    onClick={() => requestOtp()} disabled={resendCooldown > 0 || loading}
                    className="text-[#006c49] font-bold hover:underline disabled:opacity-50 disabled:no-underline text-[12px] transition-colors">
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                  </button>
                </div>
              </div>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { icon: "lock",          label: "Encrypted"    },
                { icon: "verified_user", label: "Role-checked" },
                { icon: "history",       label: "Audit logged" },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-1.5 bg-white border border-slate-100 rounded-xl py-3.5 px-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[18px]">{b.icon}</span>
                  <span className="text-[10px] text-[#7c839b] font-bold tracking-widest uppercase text-center">{b.label}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-[12px] text-[#7c839b]">
              Not an administrator?{" "}
              <a href="/" className="text-[#006c49] font-bold hover:underline">Return to store</a>
            </p>
          </div>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 bg-white">
          <p className="text-center text-[11px] text-slate-400">
            © {new Date().getFullYear()} Luxe Boutique — Admin Portal · All access is monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
