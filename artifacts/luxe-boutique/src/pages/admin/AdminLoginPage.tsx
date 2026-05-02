import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLoginPage() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState("");
  const [loading, setLoading]       = useState(false);
  const { login, user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && user?.role === "ADMIN") navigate("/admin");
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    // Re-fetch user from context to check role
    const meRes = await fetch("/api/auth/me");
    if (meRes.ok) {
      const me = await meRes.json();
      if (me.role !== "ADMIN") {
        setError("Access denied. Admin credentials required.");
        setLoading(false);
        return;
      }
    }
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

      {/* ── Left panel ──────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col bg-[#080e0b] relative overflow-hidden">

        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(#ffffff 1px,transparent 1px),linear-gradient(90deg,#ffffff 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        {/* Emerald glow */}
        <div className="absolute top-[-120px] left-[-80px] w-[520px] h-[520px] bg-[#006c49] opacity-[0.12] rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-80px] right-[-60px] w-[360px] h-[360px] bg-[#006c49] opacity-[0.08] rounded-full blur-[100px] pointer-events-none" />

        {/* Top logo */}
        <div className="relative z-10 p-12">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#006c49] rounded flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-[18px]">storefront</span>
            </div>
            <span className="text-white font-[Manrope] font-bold text-[13px] tracking-[0.22em] uppercase">Luxe Boutique</span>
          </div>
        </div>

        {/* Centre content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center px-16 pb-16">
          <div className="space-y-6 max-w-[420px]">
            <div className="inline-flex items-center gap-2 bg-[#006c49]/15 border border-[#006c49]/30 px-4 py-2 rounded-full">
              <span className="material-symbols-outlined text-[#4edea3] text-[14px]">shield</span>
              <span className="text-[#4edea3] text-[11px] font-bold tracking-[0.18em] uppercase">Admin Portal</span>
            </div>
            <h1 className="font-serif text-white text-[42px] leading-[1.1] font-semibold">
              Your store,<br />under control.
            </h1>
            <p className="text-white/50 text-[15px] leading-relaxed font-[Manrope]">
              Manage products, orders, customers, and marketing channels from a single command centre.
            </p>
          </div>

          {/* Stats row */}
          <div className="mt-14 grid grid-cols-3 gap-6 max-w-[420px]">
            {[
              { icon: "inventory_2", label: "Products",  value: "1,248" },
              { icon: "shopping_bag", label: "Orders",   value: "3.4K"  },
              { icon: "group",        label: "Customers", value: "980"   },
            ].map((s) => (
              <div key={s.label} className="space-y-2">
                <span className="material-symbols-outlined text-[#006c49] text-[20px]">{s.icon}</span>
                <p className="text-white text-[22px] font-serif font-semibold leading-none">{s.value}</p>
                <p className="text-white/40 text-[11px] font-[Manrope] tracking-widest uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 px-12 py-8 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <p className="text-white/25 text-[11px] tracking-widest uppercase">Secure Admin Access</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
              <span className="text-white/30 text-[11px]">All systems operational</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────── */}
      <div className="flex-1 bg-[#f8f9ff] flex flex-col">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 p-8 border-b border-slate-100 bg-white">
          <div className="w-8 h-8 bg-[#006c49] rounded flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-[18px]">storefront</span>
          </div>
          <span className="font-[Manrope] font-bold text-[13px] tracking-[0.22em] uppercase text-[#0a0f0d]">Luxe Boutique</span>
          <span className="ml-auto text-[10px] font-bold tracking-widest uppercase text-[#006c49] bg-[#006c49]/10 px-3 py-1 rounded-full">Admin Portal</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-[400px] space-y-8">

            {/* Heading */}
            <div className="space-y-2">
              <h2 className="font-serif text-[32px] text-[#0a0f0d] font-semibold leading-tight">Admin Sign In</h2>
              <p className="text-[#7c839b] text-sm">Restricted to authorised administrators only.</p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
                <span className="material-symbols-outlined text-red-500 text-[18px] shrink-0 mt-0.5">error</span>
                <p className="text-red-700 text-sm font-semibold">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#45464d]">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@luxeboutique.com"
                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#006c49] focus:ring-2 focus:ring-[#006c49]/10 transition-all placeholder:text-slate-300 font-[Manrope]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-[#45464d]">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-[#006c49] focus:ring-2 focus:ring-[#006c49]/10 transition-all placeholder:text-slate-300 pr-12 font-[Manrope]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#006c49] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPw ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#0a0f0d] text-white py-4 rounded-xl font-[Manrope] font-bold text-[12px] tracking-[0.18em] uppercase hover:bg-[#006c49] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 shadow-lg shadow-black/10"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined text-[16px] animate-spin">refresh</span>
                    Authenticating…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">lock_open</span>
                    Sign In to Admin
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-[11px] text-slate-400 font-[Manrope] tracking-widest uppercase">Secure</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: "lock",           label: "Encrypted"     },
                { icon: "verified_user",  label: "Role-checked"  },
                { icon: "history",        label: "Audit logged"  },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-1.5 bg-white border border-slate-100 rounded-xl py-3.5 px-2">
                  <span className="material-symbols-outlined text-[#006c49] text-[18px]">{b.icon}</span>
                  <span className="text-[10px] text-[#7c839b] font-[Manrope] font-bold tracking-widest uppercase text-center">{b.label}</span>
                </div>
              ))}
            </div>

            {/* Back to store */}
            <p className="text-center text-[12px] text-[#7c839b] font-[Manrope]">
              Not an administrator?{" "}
              <a href="/" className="text-[#006c49] font-bold hover:underline">
                Return to store
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-white">
          <p className="text-center text-[11px] text-slate-400 font-[Manrope]">
            © {new Date().getFullYear()} Luxe Boutique — Admin Portal · All access is monitored and logged.
          </p>
        </div>
      </div>
    </div>
  );
}
