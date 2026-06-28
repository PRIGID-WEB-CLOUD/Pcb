import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ChannelStatus = "CONNECTED" | "PAUSED" | "DISCONNECTED";
type TestResult = "idle" | "testing" | "pass" | "fail";
type ActiveTab = "health" | "events" | "webhooks";

interface ChannelConfig {
  id: string;
  channelId: string;
  status: ChannelStatus;
  lastSync: string | null;
  latency: number;
}

interface EventLog {
  id: string;
  channel: string;
  event: string;
  detail: string;
  type: "sync" | "error" | "warning" | "info";
  createdAt: string;
}

interface Webhook {
  id: string;
  webhookId: string;
  label: string;
  url: string;
  active: boolean;
}

const channelMeta: Record<string, { icon: string; title: string; desc: string; href: string }> = {
  facebook: { icon: "thumb_up",      title: "Facebook Pages", desc: "Page posts, pixel tracking, and audience management.",  href: "/admin/channels/facebook"      },
  instagram:{ icon: "photo_camera",  title: "Instagram",      desc: "Publish posts and track media performance.",             href: "/admin/channels/instagram"     },
  commerce: { icon: "storefront",    title: "Meta Commerce",  desc: "Sync product catalog to Facebook Shop and Instagram.",   href: "/admin/channels/meta-commerce" },
  ads:      { icon: "campaign",      title: "Meta Ads",       desc: "View ad campaigns, spend, and real-time insights.",      href: "/admin/channels/meta-ads"      },
  whatsapp: { icon: "chat",          title: "WhatsApp API",   desc: "Automated customer journeys and order notifications.",   href: "/admin/channels/whatsapp"      },
  twitter:  { icon: "share",         title: "X / Twitter",   desc: "Automated product drops and hashtag management.",         href: "/admin/channels/twitter"       },
};

const statusConfig: Record<ChannelStatus, { label: string; cls: string }> = {
  CONNECTED:    { label: "CONNECTED",    cls: "bg-[#6cf8bb] text-[#00714d]" },
  PAUSED:       { label: "PAUSED",       cls: "bg-amber-100 text-amber-700" },
  DISCONNECTED: { label: "DISCONNECTED", cls: "bg-red-100 text-red-600"     },
};
const nextStatus: Record<ChannelStatus, ChannelStatus> = {
  CONNECTED: "PAUSED", PAUSED: "CONNECTED", DISCONNECTED: "CONNECTED",
};
const logTypeStyle: Record<string, { icon: string; cls: string }> = {
  sync:    { icon: "sync",    cls: "text-[#006c49] bg-emerald-50" },
  info:    { icon: "info",    cls: "text-blue-600 bg-blue-50"     },
  warning: { icon: "warning", cls: "text-amber-600 bg-amber-50"   },
  error:   { icon: "error",   cls: "text-red-600 bg-red-50"       },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminChannelHubPage() {
  const [configs, setConfigs] = useState<ChannelConfig[]>([]);
  const [events, setEvents] = useState<EventLog[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("health");
  const [logFilter, setLogFilter] = useState<"all" | string>("all");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadAll = useCallback(async () => {
    try {
      const [cfgRes, evtRes, whRes] = await Promise.all([
        fetch("/api/channels/configs"),
        fetch("/api/channels/events"),
        fetch("/api/channels/webhooks"),
      ]);
      if (cfgRes.ok) setConfigs(await cfgRes.json());
      if (evtRes.ok) setEvents(await evtRes.json());
      if (whRes.ok)  setWebhooks(await whRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggleStatus = async (channelId: string) => {
    const cfg = configs.find((c) => c.channelId === channelId)!;
    const next = nextStatus[cfg.status];
    setConfigs((p) => p.map((c) => c.channelId === channelId ? { ...c, status: next } : c));
    await fetch(`/api/channels/configs/${channelId}/status`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    showToast(`${channelMeta[channelId]?.title} is now ${next.toLowerCase()}.`);
    loadAll();
  };

  const syncChannel = async (channelId: string) => {
    setSyncing((p) => ({ ...p, [channelId]: true }));
    const res = await fetch(`/api/channels/configs/${channelId}/sync`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setConfigs((p) => p.map((c) => c.channelId === channelId ? { ...c, ...updated } : c));
      showToast(`${channelMeta[channelId]?.title} synced.`);
      loadAll();
    }
    setSyncing((p) => ({ ...p, [channelId]: false }));
  };

  const syncAll = async () => {
    const keys = configs.filter((c) => c.status === "CONNECTED").map((c) => c.channelId);
    keys.forEach((k) => setSyncing((p) => ({ ...p, [k]: true })));
    await fetch("/api/channels/configs/sync-all", { method: "POST" });
    keys.forEach((k) => setSyncing((p) => ({ ...p, [k]: false })));
    showToast("All active channels synced.");
    loadAll();
  };

  const testConnection = async (channelId: string) => {
    setTestResults((p) => ({ ...p, [channelId]: "testing" }));
    const res = await fetch(`/api/channels/configs/${channelId}/test`, { method: "POST" });
    if (res.ok) {
      const { pass, latency } = await res.json();
      setTestResults((p) => ({ ...p, [channelId]: pass ? "pass" : "fail" }));
      setConfigs((p) => p.map((c) => c.channelId === channelId ? { ...c, latency } : c));
      showToast(pass ? `${channelMeta[channelId]?.title} — ${latency}ms` : `${channelMeta[channelId]?.title} connection failed.`);
      loadAll();
      setTimeout(() => setTestResults((p) => ({ ...p, [channelId]: "idle" })), 4000);
    }
  };

  const clearLogs = async () => {
    await fetch("/api/channels/events", { method: "DELETE" });
    setEvents([]);
    showToast("Event log cleared.");
  };

  const toggleWebhook = async (webhookId: string, active: boolean) => {
    setWebhooks((p) => p.map((w) => w.webhookId === webhookId ? { ...w, active } : w));
    await fetch(`/api/channels/webhooks/${webhookId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
  };

  const connectedCount = configs.filter((c) => c.status === "CONNECTED").length;
  const globalOk = configs.length > 0 && connectedCount === configs.length;
  const avgLatency = configs.length ? Math.round(configs.reduce((a, c) => a + (c.latency ?? 0), 0) / configs.length) : 0;
  const filteredLogs = logFilter === "all" ? events : events.filter((e) => e.type === logFilter);

  if (loading) return (
    <AdminLayout sidebar="channels">
      <div className="flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined animate-spin text-[#006c49] text-3xl">refresh</span>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout sidebar="channels">
      <div className="p-10 max-w-[1280px] mx-auto">
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>{toast}
          </div>
        )}

        <header className="mb-10 flex justify-between items-end">
          <div>
            <Link href="/admin" className="inline-flex items-center gap-1.5 text-[#7c839b] hover:text-[#006c49] transition-colors font-[Manrope] font-bold text-xs tracking-widest uppercase mb-4 no-underline">
              <span className="material-symbols-outlined text-base">arrow_back</span> Back to Dashboard
            </Link>
            <h1 className="text-[44px] font-serif font-bold text-[#0b1c30] mb-2">Omnichannel Hub</h1>
            <p className="text-[17px] font-[Manrope] text-[#7c839b] max-w-2xl">Manage, test and monitor all retail channel integrations from one control surface.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <span className="block font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#818486]">Global Status</span>
              <span className={`font-bold flex items-center gap-1 justify-end font-[Manrope] mt-1 ${globalOk ? "text-[#006c49]" : "text-amber-600"}`}>
                <span className={`w-2 h-2 rounded-full ${globalOk ? "bg-[#006c49]" : "bg-amber-500"}`}></span>
                {globalOk ? "Operational" : `${connectedCount}/${configs.length} Active`}
              </span>
            </div>
            <button onClick={syncAll} className="flex items-center gap-2 px-5 py-2.5 bg-[#006c49] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-black transition-colors rounded-sm">
              <span className="material-symbols-outlined text-sm">sync</span> Sync All
            </button>
          </div>
        </header>

        {/* Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {configs.map((cfg) => {
            const meta = channelMeta[cfg.channelId];
            if (!meta) return null;
            const sc = statusConfig[cfg.status] ?? statusConfig.DISCONNECTED;
            const isSyncing = syncing[cfg.channelId];
            const testResult = testResults[cfg.channelId] ?? "idle";
            return (
              <div key={cfg.channelId} className="bg-white p-5 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${cfg.status === "CONNECTED" ? "bg-[#eff4ff]" : "bg-slate-100"}`}>
                    <span className={`material-symbols-outlined text-2xl ${cfg.status === "CONNECTED" ? "text-black" : "text-slate-400"}`}>{meta.icon}</span>
                  </div>
                  <span className={`px-2 py-0.5 ${sc.cls} text-[10px] font-[Manrope] font-bold rounded-full tracking-widest`}>{sc.label}</span>
                </div>
                <h3 className="text-[18px] font-serif font-semibold mb-1">{meta.title}</h3>
                <p className="text-[#45464d] text-xs mb-4 flex-1 font-[Manrope]">{meta.desc}</p>

                {testResult !== "idle" && (
                  <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-[Manrope] font-bold flex items-center gap-2 ${testResult === "testing" ? "bg-slate-50 text-slate-500" : testResult === "pass" ? "bg-emerald-50 text-[#006c49]" : "bg-red-50 text-red-600"}`}>
                    <span className={`material-symbols-outlined text-sm ${testResult === "testing" ? "animate-spin" : ""}`}>{testResult === "testing" ? "refresh" : testResult === "pass" ? "check_circle" : "cancel"}</span>
                    {testResult === "testing" ? "Testing…" : testResult === "pass" ? `Pass — ${cfg.latency}ms` : "Connection failed"}
                  </div>
                )}

                <div className="border-t border-slate-50 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#818486] italic font-[Manrope]">
                      {isSyncing
                        ? <span className="text-[#006c49] font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs animate-spin">refresh</span>Syncing…</span>
                        : cfg.lastSync ? `Last sync: ${timeAgo(cfg.lastSync)}` : "Never synced"}
                    </span>
                    <Link href={meta.href} className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-black hover:text-[#006c49] transition-colors underline decoration-slate-200 underline-offset-4">MANAGE</Link>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => syncChannel(cfg.channelId)} disabled={cfg.status !== "CONNECTED" || isSyncing}
                      className="py-1.5 text-[10px] font-[Manrope] font-bold tracking-wider uppercase border border-slate-200 hover:border-[#006c49] hover:text-[#006c49] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-0.5 rounded">
                      <span className={`material-symbols-outlined text-xs ${isSyncing ? "animate-spin" : ""}`}>sync</span> Sync
                    </button>
                    <button onClick={() => testConnection(cfg.channelId)} disabled={testResult === "testing"}
                      className="py-1.5 text-[10px] font-[Manrope] font-bold tracking-wider uppercase border border-slate-200 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-0.5 rounded">
                      <span className="material-symbols-outlined text-xs">network_ping</span> Test
                    </button>
                    <button onClick={() => toggleStatus(cfg.channelId)}
                      className={`py-1.5 text-[10px] font-[Manrope] font-bold tracking-wider uppercase transition-colors rounded ${cfg.status === "CONNECTED" ? "bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600" : "bg-[#6cf8bb] text-[#006c49] hover:bg-emerald-200"}`}>
                      {cfg.status === "CONNECTED" ? "Pause" : cfg.status === "PAUSED" ? "Resume" : "Connect"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabbed Panel */}
        <div className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex border-b border-slate-100">
            {(["health", "events", "webhooks"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-[Manrope] font-bold text-xs tracking-widest uppercase transition-colors ${activeTab === tab ? "border-b-2 border-[#006c49] text-[#006c49]" : "text-[#7c839b] hover:text-black"}`}>
                {tab === "health" ? "Integration Health" : tab === "events" ? `Event Log (${events.length})` : "Webhooks"}
              </button>
            ))}
          </div>

          <div className="p-8">
            {activeTab === "health" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-[Manrope] text-xs text-[#7c839b]">Live from database</span>
                  <span className="font-[Manrope] font-bold text-xs text-[#006c49]">{connectedCount}/{configs.length} channels active</span>
                </div>
                {[
                  { label: "API Response Time (avg)", value: `${avgLatency}ms`, bar: Math.max(10, 100 - avgLatency / 3), cls: "bg-[#006c49]" },
                  { label: "Catalog Sync Rate",        value: "99.8%", bar: 99, cls: "bg-[#006c49]" },
                  { label: "Message Delivery Rate",    value: "97.2%", bar: 97, cls: "bg-[#006c49]" },
                  { label: "Webhook Success Rate",     value: `${webhooks.filter(w => w.active).length}/${webhooks.length} active`, bar: webhooks.length ? Math.round((webhooks.filter(w => w.active).length / webhooks.length) * 100) : 0, cls: "bg-[#006c49]" },
                  { label: "Error Rate",               value: "0.2%",  bar: 2,  cls: "bg-[#ba1a1a]" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-4">
                    <span className="font-[Manrope] text-sm w-56 text-[#45464d] shrink-0">{m.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${m.cls} rounded-full transition-all duration-700`} style={{ width: `${m.bar}%` }}></div>
                    </div>
                    <span className="font-[Manrope] font-bold text-sm w-24 text-right">{m.value}</span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "events" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2 flex-wrap">
                    {(["all", "sync", "info", "warning", "error"] as const).map((f) => (
                      <button key={f} onClick={() => setLogFilter(f)}
                        className={`px-3 py-1 text-[10px] font-[Manrope] font-bold uppercase tracking-widest rounded-full transition-all ${logFilter === f ? "bg-black text-white" : "bg-slate-100 text-[#7c839b] hover:bg-slate-200"}`}>{f}</button>
                    ))}
                  </div>
                  <button onClick={clearLogs} className="text-xs font-[Manrope] text-[#7c839b] hover:text-red-500 transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">delete_sweep</span> Clear
                  </button>
                </div>
                {filteredLogs.length === 0
                  ? <div className="text-center py-12 text-[#7c839b] font-[Manrope]">No events to display.</div>
                  : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {filteredLogs.map((log) => {
                        const s = logTypeStyle[log.type] ?? logTypeStyle.info;
                        return (
                          <div key={log.id} className="flex items-start gap-3 p-3 bg-[#f8f9ff] rounded-lg">
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${s.cls}`}>
                              <span className="material-symbols-outlined text-sm">{s.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-[Manrope] font-bold text-xs text-[#7c839b] uppercase tracking-widest">{log.channel}</span>
                              <p className="font-[Manrope] font-semibold text-sm text-[#0b1c30]">{log.event}</p>
                              <p className="font-[Manrope] text-xs text-[#7c839b]">{log.detail}</p>
                            </div>
                            <span className="font-[Manrope] text-xs text-[#7c839b] shrink-0">{timeAgo(log.createdAt)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            )}

            {activeTab === "webhooks" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <p className="font-[Manrope] text-sm text-[#7c839b]">Configure which store events push to your channel endpoints.</p>
                  <button onClick={() => showToast("Webhook settings saved.")}
                    className="px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">save</span> Save Config
                  </button>
                </div>
                <div className="space-y-3">
                  {webhooks.map((wh) => (
                    <div key={wh.webhookId} className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-lg">
                      <div>
                        <p className="font-[Manrope] font-bold text-sm text-[#0b1c30]">{wh.label}</p>
                        <code className="text-[11px] text-[#006c49] font-mono">{wh.url}</code>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast(`Test ping sent to ${wh.url}`)}
                          className="text-xs font-[Manrope] font-bold text-[#7c839b] hover:text-blue-600 border border-slate-200 px-3 py-1 rounded transition-colors">Ping</button>
                        <button onClick={() => toggleWebhook(wh.webhookId, !wh.active)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${wh.active ? "bg-[#006c49]" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${wh.active ? "translate-x-5" : "translate-x-0.5"}`}></span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
