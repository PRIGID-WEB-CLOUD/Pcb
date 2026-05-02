import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ChannelStatus = "CONNECTED" | "PAUSED" | "DISCONNECTED";

interface Channel {
  id: string;
  icon: string;
  title: string;
  desc: string;
  href: string;
  status: ChannelStatus;
  lastSync: string;
  syncing: boolean;
}

const initialChannels: Channel[] = [
  { id: "facebook", icon: "social_leaderboard", title: "Meta & Facebook", desc: "Primary marketing and ad pixel synchronization.", href: "/admin/channels/facebook", status: "CONNECTED", lastSync: "4m ago", syncing: false },
  { id: "commerce", icon: "storefront", title: "Meta Commerce", desc: "Inventory and product catalog direct feed.", href: "/admin/channels/facebook", status: "CONNECTED", lastSync: "12m ago", syncing: false },
  { id: "whatsapp", icon: "chat", title: "WhatsApp API", desc: "Automated customer journeys and order notifications.", href: "/admin/channels/whatsapp", status: "CONNECTED", lastSync: "2m ago", syncing: false },
  { id: "twitter", icon: "share", title: "X Social", desc: "Automated product drops and hashtag management.", href: "/admin/channels/twitter", status: "CONNECTED", lastSync: "1h ago", syncing: false },
];

const statusConfig: Record<ChannelStatus, { label: string; cls: string; dot: string }> = {
  CONNECTED: { label: "CONNECTED", cls: "bg-[#6cf8bb] text-[#00714d]", dot: "bg-[#006c49]" },
  PAUSED: { label: "PAUSED", cls: "bg-amber-100 text-amber-700", dot: "bg-amber-500" },
  DISCONNECTED: { label: "DISCONNECTED", cls: "bg-red-100 text-red-600", dot: "bg-red-500" },
};

const nextStatus: Record<ChannelStatus, ChannelStatus> = {
  CONNECTED: "PAUSED",
  PAUSED: "CONNECTED",
  DISCONNECTED: "CONNECTED",
};

export default function AdminChannelHubPage() {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggleStatus = (id: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === id ? { ...ch, status: nextStatus[ch.status] } : ch
      )
    );
    const ch = channels.find((c) => c.id === id)!;
    const next = nextStatus[ch.status];
    showToast(`${ch.title} is now ${next.toLowerCase()}.`);
  };

  const syncChannel = (id: string) => {
    setChannels((prev) => prev.map((ch) => ch.id === id ? { ...ch, syncing: true } : ch));
    setTimeout(() => {
      setChannels((prev) => prev.map((ch) => ch.id === id ? { ...ch, syncing: false, lastSync: "just now" } : ch));
      const ch = channels.find((c) => c.id === id)!;
      showToast(`${ch.title} synced successfully.`);
    }, 2000);
  };

  const syncAll = () => {
    setChannels((prev) => prev.map((ch) => ch.status === "CONNECTED" ? { ...ch, syncing: true } : ch));
    setTimeout(() => {
      setChannels((prev) => prev.map((ch) => ({ ...ch, syncing: false, lastSync: ch.status === "CONNECTED" ? "just now" : ch.lastSync })));
      showToast("All active channels synced successfully.");
    }, 2500);
  };

  const connectedCount = channels.filter((c) => c.status === "CONNECTED").length;
  const globalOk = connectedCount === channels.length;

  return (
    <AdminLayout sidebar="channels">
      <div className="p-12 max-w-[1280px] mx-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3 animate-fade-in">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>
            {toast}
          </div>
        )}

        {/* Header */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-[48px] font-serif font-bold text-[#0b1c30] mb-2">Omnichannel Hub</h1>
            <p className="text-[18px] font-[Manrope] text-[#7c839b] max-w-2xl">Manage your global brand presence across integrated ecosystems. Real-time synchronization and status monitoring for all retail endpoints.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <span className="block font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#818486]">Global Status</span>
              <span className={`font-bold flex items-center gap-1 justify-end font-[Manrope] mt-1 ${globalOk ? "text-[#006c49]" : "text-amber-600"}`}>
                <span className={`w-2 h-2 rounded-full ${globalOk ? "bg-[#006c49]" : "bg-amber-500"}`}></span>
                {globalOk ? "Operational" : `${connectedCount}/${channels.length} Active`}
              </span>
            </div>
            <button
              onClick={syncAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#006c49] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-black transition-colors rounded-sm"
            >
              <span className="material-symbols-outlined text-sm">sync</span> Sync All
            </button>
          </div>
        </header>

        {/* Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {channels.map((ch) => {
            const sc = statusConfig[ch.status];
            return (
              <div key={ch.id} className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] flex flex-col group hover:-translate-y-1 transition-all duration-300">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 flex items-center justify-center rounded-xl transition-colors ${ch.status === "CONNECTED" ? "bg-[#eff4ff]" : "bg-slate-100"}`}>
                    <span className={`material-symbols-outlined text-3xl ${ch.status === "CONNECTED" ? "text-black" : "text-slate-400"}`}>{ch.icon}</span>
                  </div>
                  <span className={`px-3 py-1 ${sc.cls} text-[10px] font-[Manrope] font-bold rounded-full tracking-widest`}>{sc.label}</span>
                </div>
                <h3 className="text-[22px] font-serif font-semibold mb-1">{ch.title}</h3>
                <p className="text-[#45464d] text-sm mb-6 flex-1 font-[Manrope]">{ch.desc}</p>
                <div className="mt-auto border-t border-slate-50 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-[#818486] italic font-[Manrope]">
                      {ch.syncing ? (
                        <span className="text-[#006c49] font-bold flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm animate-spin">refresh</span> Syncing...
                        </span>
                      ) : `Last sync: ${ch.lastSync}`}
                    </span>
                    <Link href={ch.href} className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-black hover:text-[#006c49] transition-colors underline decoration-slate-200 underline-offset-4">
                      MANAGE
                    </Link>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => syncChannel(ch.id)}
                      disabled={ch.status !== "CONNECTED" || ch.syncing}
                      className="flex-1 py-2 text-xs font-[Manrope] font-bold tracking-widest uppercase border border-slate-200 hover:border-[#006c49] hover:text-[#006c49] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                    >
                      <span className={`material-symbols-outlined text-sm ${ch.syncing ? "animate-spin" : ""}`}>sync</span>
                      {ch.syncing ? "Syncing" : "Sync"}
                    </button>
                    <button
                      onClick={() => toggleStatus(ch.id)}
                      className={`flex-1 py-2 text-xs font-[Manrope] font-bold tracking-widest uppercase transition-colors ${ch.status === "CONNECTED" ? "bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600" : "bg-[#6cf8bb] text-[#006c49] hover:bg-emerald-200"}`}
                    >
                      {ch.status === "CONNECTED" ? "Pause" : ch.status === "PAUSED" ? "Resume" : "Connect"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Integration Health */}
        <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[24px] font-serif font-semibold">Integration Health</h3>
            <span className="font-[Manrope] text-xs text-[#7c839b]">Updated in real-time</span>
          </div>
          <div className="space-y-4">
            {[
              { label: "API Response Time", value: "142ms", bar: 85, cls: "bg-[#006c49]" },
              { label: "Catalog Sync Rate", value: "99.8%", bar: 99, cls: "bg-[#006c49]" },
              { label: "Message Delivery Rate", value: "97.2%", bar: 97, cls: "bg-[#006c49]" },
              { label: "Error Rate", value: "0.2%", bar: 2, cls: "bg-[#ba1a1a]" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-4">
                <span className="font-[Manrope] text-sm w-52 text-[#45464d] shrink-0">{m.label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${m.cls} rounded-full transition-all duration-700`} style={{ width: `${m.bar}%` }}></div>
                </div>
                <span className="font-[Manrope] font-bold text-sm w-16 text-right">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
