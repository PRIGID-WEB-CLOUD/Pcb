import { useState } from "react";
import AdminLayout from "./AdminLayout";

type ConnectionKey = "facebook" | "instagram" | "pixel" | "messenger";
type SyncState = "idle" | "syncing" | "done";

const initialConnections: Record<ConnectionKey, boolean> = {
  facebook: true,
  instagram: true,
  pixel: true,
  messenger: false,
};

const connectionMeta: { key: ConnectionKey; label: string; icon: string }[] = [
  { key: "facebook", label: "Facebook Shop", icon: "storefront" },
  { key: "instagram", label: "Instagram Shopping", icon: "photo_camera" },
  { key: "pixel", label: "Pixel Tracking", icon: "track_changes" },
  { key: "messenger", label: "Messenger Bot", icon: "chat" },
];

const adRanges: Record<string, { impressions: string; ctr: string; cpc: string; roas: string }> = {
  "7": { impressions: "620K", ctr: "4.1%", cpc: "$0.38", roas: "4.8x" },
  "30": { impressions: "2.4M", ctr: "3.8%", cpc: "$0.42", roas: "4.2x" },
  "90": { impressions: "6.8M", ctr: "3.5%", cpc: "$0.47", roas: "3.9x" },
};

export default function AdminFacebookPage() {
  const [connections, setConnections] = useState(initialConnections);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSync, setLastSync] = useState("Today at 10:42 AM");
  const [adRange, setAdRange] = useState<"7" | "30" | "90">("30");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const runSync = () => {
    if (syncState === "syncing") return;
    setSyncState("syncing");
    setTimeout(() => {
      setSyncState("done");
      const now = new Date();
      setLastSync(`Today at ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      showToast("Catalog sync completed — 1,248 products updated.");
      setTimeout(() => setSyncState("idle"), 3000);
    }, 2500);
  };

  const toggleConnection = (key: ConnectionKey) => {
    const next = !connections[key];
    setConnections((prev) => ({ ...prev, [key]: next }));
    const meta = connectionMeta.find((m) => m.key === key)!;
    showToast(`${meta.label} ${next ? "activated" : "paused"}.`);
  };

  const adData = adRanges[adRange];

  return (
    <AdminLayout sidebar="channels">
      <div className="p-12 max-w-[1280px] mx-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>
            {toast}
          </div>
        )}

        <div className="mb-12">
          <h2 className="text-[36px] font-serif font-bold text-[#0b1c30] mb-2">Meta Commerce Manager</h2>
          <p className="font-[Manrope] text-[18px] text-[#7c839b] max-w-2xl">Manage your Facebook and Instagram shop presence, synchronize product catalogs, and automate social distribution through a unified editorial dashboard.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Catalog Sync */}
          <section className="col-span-12 lg:col-span-7 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-6 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <span className="material-symbols-outlined text-[120px]">sync</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#eff4ff] rounded-lg text-[#006c49]">
                  <span className="material-symbols-outlined">database</span>
                </div>
                <h3 className="text-[24px] font-serif font-semibold">Catalog Sync</h3>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="p-4 bg-white border border-slate-100 rounded-lg">
                  <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#818486] mb-2">Sync Status</p>
                  <div className="flex items-center gap-2">
                    {syncState === "syncing" ? (
                      <>
                        <span className="material-symbols-outlined text-amber-500 text-sm animate-spin">refresh</span>
                        <span className="font-[Manrope] font-bold text-amber-600">Syncing...</span>
                      </>
                    ) : syncState === "done" ? (
                      <>
                        <span className="material-symbols-outlined text-[#006c49] text-sm">check_circle</span>
                        <span className="font-[Manrope] font-bold text-[#006c49]">Sync Complete</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 rounded-full bg-[#006c49]"></div>
                        <span className="font-[Manrope] font-bold">Healthy & Live</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-lg">
                  <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#818486] mb-2">Total Items</p>
                  <span className="font-[Manrope] font-bold">1,248 Products</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-lg mb-8">
                <div>
                  <p className="font-[Manrope] font-semibold">Last sync completed</p>
                  <p className="text-sm text-[#7c839b] font-[Manrope]">{lastSync}</p>
                </div>
                {syncState === "done" && (
                  <span className="text-xs font-[Manrope] font-bold text-[#006c49] bg-emerald-50 px-3 py-1 rounded-full">Success</span>
                )}
              </div>

              {/* Sync Progress Bar */}
              {syncState === "syncing" && (
                <div className="mb-6">
                  <div className="flex justify-between text-xs font-[Manrope] text-[#7c839b] mb-1">
                    <span>Syncing catalog…</span>
                    <span className="text-[#006c49] font-bold">In progress</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#006c49] rounded-full animate-pulse w-2/3 transition-all"></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={runSync}
                disabled={syncState === "syncing"}
                className="bg-black text-white px-6 py-3 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-[#006c49] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                <span className={`material-symbols-outlined text-sm ${syncState === "syncing" ? "animate-spin" : ""}`}>refresh</span>
                {syncState === "syncing" ? "Syncing..." : "Run Manual Sync"}
              </button>
              <button className="border border-[#c6c6cd] text-[#0b1c30] px-6 py-3 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all">
                View Catalog
              </button>
            </div>
          </section>

          {/* Connection Status */}
          <section className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-6">
            <h3 className="text-[24px] font-serif font-semibold mb-6">Connection Status</h3>
            <div className="space-y-3">
              {connectionMeta.map((item) => {
                const active = connections[item.key];
                return (
                  <div key={item.key} className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <span className="material-symbols-outlined text-[#7c839b]">{item.icon}</span>
                      </div>
                      <span className="font-[Manrope] font-semibold">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-[Manrope] font-bold text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full ${active ? "bg-[#6cf8bb] text-[#00714d]" : "bg-amber-100 text-amber-700"}`}>
                        {active ? "Active" : "Paused"}
                      </span>
                      <button
                        onClick={() => toggleConnection(item.key)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${active ? "bg-[#006c49]" : "bg-slate-300"}`}
                      >
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${active ? "translate-x-5" : "translate-x-0.5"}`}></span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Ad Performance */}
          <section className="col-span-12 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[24px] font-serif font-semibold">Ad Performance Overview</h3>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                {(["7", "30", "90"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setAdRange(r)}
                    className={`px-4 py-1.5 text-xs font-[Manrope] font-bold rounded-md transition-all ${adRange === r ? "bg-white text-black shadow-sm" : "text-[#7c839b] hover:text-black"}`}
                  >
                    {r}d
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Impressions", value: adData.impressions, change: "+12.5%", up: true },
                { label: "Click-Through Rate", value: adData.ctr, change: "+0.4%", up: true },
                { label: "Cost Per Click", value: adData.cpc, change: "-$0.08", up: false },
                { label: "ROAS", value: adData.roas, change: "+0.6x", up: true },
              ].map((m) => (
                <div key={m.label} className="p-5 bg-[#f8f9ff] rounded-xl">
                  <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-2">{m.label}</p>
                  <p className="text-[28px] font-serif font-semibold">{m.value}</p>
                  <p className={`text-xs font-[Manrope] font-bold mt-1 flex items-center gap-1 ${m.up ? "text-[#006c49]" : "text-[#ba1a1a]"}`}>
                    <span className="material-symbols-outlined text-xs">{m.up ? "trending_up" : "trending_down"}</span> {m.change}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
