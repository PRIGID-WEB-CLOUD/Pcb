import { useState } from "react";
import AdminLayout from "./AdminLayout";

interface Journey {
  id: string;
  icon: string;
  title: string;
  desc: string;
  active: boolean;
  sent: string;
}

const initialJourneys: Journey[] = [
  { id: "cart", icon: "shopping_cart", title: "Abandoned Cart", desc: "3-step recovery sequence triggered 30min after cart abandonment.", active: true, sent: "2,841" },
  { id: "shipping", icon: "local_shipping", title: "Order Tracking", desc: "Real-time shipping updates sent automatically at each milestone.", active: true, sent: "8,102" },
  { id: "vip", icon: "star", title: "VIP Welcome", desc: "Exclusive welcome flow for customers spending over $2,000.", active: false, sent: "142" },
];

type CopyState = Record<string, boolean>;

export default function AdminWhatsAppPage() {
  const [journeys, setJourneys] = useState<Journey[]>(initialJourneys);
  const [showToken, setShowToken] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>({});
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [webhookConfigured, setWebhookConfigured] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopyState((prev) => ({ ...prev, [label]: true }));
    setTimeout(() => setCopyState((prev) => ({ ...prev, [label]: false })), 2000);
    showToast(`${label} copied to clipboard.`);
  };

  const toggleJourney = (id: string) => {
    setJourneys((prev) =>
      prev.map((j) => j.id === id ? { ...j, active: !j.active } : j)
    );
    const j = journeys.find((j) => j.id === id)!;
    showToast(`${j.title} journey ${j.active ? "paused" : "activated"}.`);
  };

  const forceResync = () => {
    if (syncing) return;
    setSyncing(true);
    setSyncDone(false);
    setTimeout(() => {
      setSyncing(false);
      setSyncDone(true);
      showToast("Catalog resync complete — 1,248 products updated.");
      setTimeout(() => setSyncDone(false), 4000);
    }, 2500);
  };

  const apiFields = [
    { label: "Cloud API Phone Number ID", value: "105938472019482" },
    { label: "WhatsApp Business Account ID", value: "294817502938411" },
  ];

  return (
    <AdminLayout sidebar="channels">
      <div className="p-12 max-w-[1280px] mx-auto min-h-screen">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>
            {toast}
          </div>
        )}

        <header className="mb-12">
          <h1 className="text-[48px] font-serif font-bold text-[#0b1c30] mb-2">WhatsApp API Console</h1>
          <p className="font-[Manrope] text-[18px] text-[#7c839b] max-w-2xl">Configure your cloud integration, manage automated customer journeys, and sync your retail catalog directly to the Meta ecosystem.</p>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* API Config */}
          <section className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600">api</span>
                <h3 className="text-[24px] font-serif font-semibold">API Configuration</h3>
              </div>
              <span className="font-[Manrope] font-bold text-[10px] tracking-widest text-[#006c49] bg-emerald-50 px-3 py-1 rounded-full uppercase">CONNECTED</span>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {apiFields.map((f) => (
                  <div key={f.label} className="space-y-2">
                    <label className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#45464d] block">{f.label}</label>
                    <div className="relative">
                      <input
                        className="w-full bg-slate-50 border border-slate-100 px-4 py-3 font-mono text-sm focus:outline-none cursor-default pr-10"
                        readOnly
                        type="text"
                        value={f.value}
                      />
                      <button
                        onClick={() => copyToClipboard(f.label.split(" ").pop()!, f.value)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-[#006c49] transition-colors"
                        title="Copy"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {copyState[f.label.split(" ").pop()!] ? "check" : "content_copy"}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <label className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#45464d] block">System Access Token</label>
                <div className="relative">
                  <input
                    className="w-full bg-slate-50 border border-slate-100 px-4 py-3 font-mono text-sm focus:outline-none cursor-default pr-20"
                    readOnly
                    type={showToken ? "text" : "password"}
                    value="EAAQZA7x5ZBm9sBAA9R2lZCmPeWKHV4rZ1"
                  />
                  <button
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-10 top-3 text-slate-400 hover:text-black transition-colors"
                    title={showToken ? "Hide" : "Show"}
                  >
                    <span className="material-symbols-outlined text-sm">{showToken ? "visibility_off" : "visibility"}</span>
                  </button>
                  <button
                    onClick={() => copyToClipboard("Token", "EAAQZA7x5ZBm9sBAA9R2lZCmPeWKHV4rZ1")}
                    className="absolute right-3 top-3 text-slate-400 hover:text-[#006c49] transition-colors"
                    title="Copy token"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copyState["Token"] ? "check" : "content_copy"}
                    </span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 italic font-[Manrope]">Tokens expire every 60 days. Auto-renew is currently enabled.</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-serif font-bold text-sm mb-1">Webhook Endpoint</h4>
                    <code className="text-[#006c49] text-xs">https://api.yourdomain.com/v1/whatsapp/webhook</code>
                    {webhookConfigured && (
                      <p className="text-xs text-[#006c49] font-[Manrope] font-bold mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">check_circle</span> Webhook verified & active
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setWebhookConfigured(true); showToast("Webhook endpoint verified successfully."); }}
                    className={`font-[Manrope] font-bold text-[10px] tracking-widest uppercase border px-3 py-1.5 transition-all ${webhookConfigured ? "border-[#006c49] text-[#006c49] bg-emerald-50" : "border-black hover:bg-black hover:text-white"}`}
                  >
                    {webhookConfigured ? "VERIFIED" : "CONFIGURE"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Stats + Resync */}
          <section className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <h3 className="text-[16px] font-serif font-semibold mb-4">Message Stats (30d)</h3>
              <div className="space-y-4">
                {[
                  { label: "Messages Sent", value: "14,820", pct: "+8.2%", up: true },
                  { label: "Delivered", value: "14,711", pct: "99.3%", up: true },
                  { label: "Read Rate", value: "9,108", pct: "61.5%", up: true },
                  { label: "Conversions", value: "482", pct: "+14%", up: true },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                    <span className="font-[Manrope] text-sm text-[#45464d]">{s.label}</span>
                    <div className="text-right">
                      <span className="font-[Manrope] font-bold">{s.value}</span>
                      <span className="text-xs text-[#006c49] ml-2 font-[Manrope] font-bold">{s.pct}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-black text-white p-6 rounded-xl">
              <h3 className="font-serif text-[18px] font-semibold mb-2">Catalog Sync</h3>
              <p className="text-white/60 text-sm font-[Manrope] mb-4">1,248 products synced to Meta</p>
              <div className="flex items-center gap-2 mb-4">
                {syncing ? (
                  <>
                    <span className="material-symbols-outlined text-amber-400 text-sm animate-spin">refresh</span>
                    <span className="text-sm font-[Manrope] text-amber-400">Syncing...</span>
                  </>
                ) : syncDone ? (
                  <>
                    <span className="material-symbols-outlined text-[#4edea3] text-sm">check_circle</span>
                    <span className="text-sm font-[Manrope] text-[#4edea3]">Sync complete</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></div>
                    <span className="text-sm font-[Manrope] text-[#4edea3]">Live & Synced</span>
                  </>
                )}
              </div>
              {syncing && (
                <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-4">
                  <div className="h-full bg-[#4edea3] rounded-full animate-pulse w-3/4"></div>
                </div>
              )}
              <button
                onClick={forceResync}
                disabled={syncing}
                className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white py-2 px-4 font-[Manrope] font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2"
              >
                <span className={`material-symbols-outlined text-sm ${syncing ? "animate-spin" : ""}`}>refresh</span>
                {syncing ? "Syncing..." : "Force Resync"}
              </button>
            </div>
          </section>

          {/* Automated Journeys */}
          <section className="col-span-12 bg-white p-8 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[24px] font-serif font-semibold">Automated Customer Journeys</h3>
              <span className="font-[Manrope] text-xs text-[#7c839b]">
                {journeys.filter((j) => j.active).length}/{journeys.length} active
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {journeys.map((j) => (
                <div key={j.id} className={`p-6 rounded-xl border transition-all ${j.active ? "bg-[#f8f9ff] border-slate-100" : "bg-white border-slate-200 opacity-70"}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-2 rounded-lg shadow-sm ${j.active ? "bg-white" : "bg-slate-100"}`}>
                      <span className={`material-symbols-outlined ${j.active ? "text-[#006c49]" : "text-[#7c839b]"}`}>{j.icon}</span>
                    </div>
                    <button
                      onClick={() => toggleJourney(j.id)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${j.active ? "bg-[#006c49]" : "bg-slate-300"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${j.active ? "translate-x-5" : "translate-x-0.5"}`}></span>
                    </button>
                  </div>
                  <h4 className="font-serif font-semibold mb-2">{j.title}</h4>
                  <p className="text-sm text-[#7c839b] font-[Manrope] mb-4">{j.desc}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d]">{j.sent} sent this month</p>
                    {j.active && <span className="text-[10px] font-[Manrope] font-bold text-[#006c49] uppercase tracking-wider">Active</span>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
