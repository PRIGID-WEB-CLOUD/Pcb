import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ChannelStatus = "CONNECTED" | "PAUSED" | "DISCONNECTED";
type TestResult = "idle" | "testing" | "pass" | "fail";

interface Channel {
  id: string;
  icon: string;
  title: string;
  desc: string;
  href: string;
  status: ChannelStatus;
  lastSync: string;
  syncing: boolean;
  testResult: TestResult;
  latency: number;
}

interface EventLog {
  id: number;
  channel: string;
  event: string;
  detail: string;
  time: string;
  type: "sync" | "error" | "warning" | "info";
}

const initialChannels: Channel[] = [
  { id: "facebook", icon: "social_leaderboard", title: "Meta & Facebook", desc: "Primary marketing and ad pixel synchronization.", href: "/admin/channels/facebook", status: "CONNECTED", lastSync: "4m ago", syncing: false, testResult: "idle", latency: 142 },
  { id: "commerce", icon: "storefront", title: "Meta Commerce", desc: "Inventory and product catalog direct feed.", href: "/admin/channels/facebook", status: "CONNECTED", lastSync: "12m ago", syncing: false, testResult: "idle", latency: 98 },
  { id: "whatsapp", icon: "chat", title: "WhatsApp API", desc: "Automated customer journeys and order notifications.", href: "/admin/channels/whatsapp", status: "CONNECTED", lastSync: "2m ago", syncing: false, testResult: "idle", latency: 76 },
  { id: "twitter", icon: "share", title: "X Social", desc: "Automated product drops and hashtag management.", href: "/admin/channels/twitter", status: "CONNECTED", lastSync: "1h ago", syncing: false, testResult: "idle", latency: 210 },
];

const initialLogs: EventLog[] = [
  { id: 1, channel: "Meta Commerce", event: "Catalog Sync Complete", detail: "1,248 products pushed successfully", time: "4m ago", type: "sync" },
  { id: 2, channel: "WhatsApp API", event: "Journey Triggered", detail: "Abandoned Cart — 14 messages sent", time: "12m ago", type: "info" },
  { id: 3, channel: "Meta & Facebook", event: "Pixel Event Fired", detail: "Purchase event — $1,240 attributed", time: "28m ago", type: "info" },
  { id: 4, channel: "X Social", event: "Auto-Post Sent", detail: "Silk Evening Blazer — 2.4K impressions", time: "1h ago", type: "sync" },
  { id: 5, channel: "WhatsApp API", event: "Delivery Warning", detail: "3 messages undelivered — invalid numbers", time: "2h ago", type: "warning" },
  { id: 6, channel: "Meta Commerce", event: "Rate Limit Warning", detail: "Approaching 80% of daily API quota", time: "3h ago", type: "warning" },
];

const statusConfig: Record<ChannelStatus, { label: string; cls: string }> = {
  CONNECTED:    { label: "CONNECTED",    cls: "bg-[#6cf8bb] text-[#00714d]" },
  PAUSED:       { label: "PAUSED",       cls: "bg-amber-100 text-amber-700" },
  DISCONNECTED: { label: "DISCONNECTED", cls: "bg-red-100 text-red-600" },
};
const nextStatus: Record<ChannelStatus, ChannelStatus> = {
  CONNECTED: "PAUSED", PAUSED: "CONNECTED", DISCONNECTED: "CONNECTED",
};
const logTypeStyle: Record<EventLog["type"], { icon: string; cls: string }> = {
  sync:    { icon: "sync",    cls: "text-[#006c49] bg-emerald-50" },
  info:    { icon: "info",    cls: "text-blue-600 bg-blue-50" },
  warning: { icon: "warning", cls: "text-amber-600 bg-amber-50" },
  error:   { icon: "error",   cls: "text-red-600 bg-red-50" },
};

const webhooks = [
  { id: "order", label: "Order Created", url: "/v1/webhooks/order-created", active: true },
  { id: "product", label: "Product Updated", url: "/v1/webhooks/product-updated", active: true },
  { id: "cart", label: "Cart Abandoned", url: "/v1/webhooks/cart-abandoned", active: false },
  { id: "customer", label: "Customer Registered", url: "/v1/webhooks/customer-registered", active: true },
];

export default function AdminChannelHubPage() {
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [logs, setLogs] = useState<EventLog[]>(initialLogs);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"health" | "events" | "webhooks">("health");
  const [webhookStates, setWebhookStates] = useState<Record<string, boolean>>(
    Object.fromEntries(webhooks.map((w) => [w.id, w.active]))
  );
  const [logFilter, setLogFilter] = useState<"all" | EventLog["type"]>("all");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const toggleStatus = (id: string) => {
    const ch = channels.find((c) => c.id === id)!;
    const next = nextStatus[ch.status];
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, status: next } : c));
    showToast(`${ch.title} is now ${next.toLowerCase()}.`);
    if (next === "PAUSED") {
      addLog(ch.title, "Channel Paused", "All sync activity suspended", "warning");
    } else {
      addLog(ch.title, "Channel Resumed", "Sync activity reactivated", "info");
    }
  };

  const syncChannel = (id: string) => {
    const ch = channels.find((c) => c.id === id)!;
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, syncing: true } : c));
    setTimeout(() => {
      setChannels((prev) => prev.map((c) => c.id === id ? { ...c, syncing: false, lastSync: "just now" } : c));
      showToast(`${ch.title} synced successfully.`);
      addLog(ch.title, "Manual Sync Complete", "Data refreshed from source", "sync");
    }, 2000);
  };

  const testConnection = (id: string) => {
    const ch = channels.find((c) => c.id === id)!;
    setChannels((prev) => prev.map((c) => c.id === id ? { ...c, testResult: "testing" } : c));
    const latency = Math.floor(Math.random() * 150) + 60;
    setTimeout(() => {
      const pass = Math.random() > 0.15;
      setChannels((prev) => prev.map((c) => c.id === id ? { ...c, testResult: pass ? "pass" : "fail", latency } : c));
      showToast(pass ? `${ch.title} connection healthy — ${latency}ms` : `${ch.title} connection failed. Check credentials.`);
      addLog(ch.title, pass ? "Connection Test Passed" : "Connection Test Failed", pass ? `Latency: ${latency}ms` : "Authentication error — verify API keys", pass ? "info" : "error");
      setTimeout(() => setChannels((prev) => prev.map((c) => c.id === id ? { ...c, testResult: "idle" } : c)), 4000);
    }, 1800);
  };

  const syncAll = () => {
    setChannels((prev) => prev.map((ch) => ch.status === "CONNECTED" ? { ...ch, syncing: true } : ch));
    setTimeout(() => {
      setChannels((prev) => prev.map((ch) => ({ ...ch, syncing: false, lastSync: ch.status === "CONNECTED" ? "just now" : ch.lastSync })));
      showToast("All active channels synced.");
      addLog("All Channels", "Global Sync Complete", "4 channels refreshed in sequence", "sync");
    }, 2500);
  };

  const addLog = (channel: string, event: string, detail: string, type: EventLog["type"]) => {
    setLogs((prev) => [{ id: Date.now(), channel, event, detail, time: "just now", type }, ...prev.slice(0, 9)]);
  };

  const clearLogs = () => { setLogs([]); showToast("Event log cleared."); };

  const connectedCount = channels.filter((c) => c.status === "CONNECTED").length;
  const globalOk = connectedCount === channels.length;
  const filteredLogs = logFilter === "all" ? logs : logs.filter((l) => l.type === logFilter);

  return (
    <AdminLayout sidebar="channels">
      <div className="p-10 max-w-[1280px] mx-auto">
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>{toast}
          </div>
        )}

        {/* Header */}
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
                {globalOk ? "Operational" : `${connectedCount}/${channels.length} Active`}
              </span>
            </div>
            <button onClick={syncAll} className="flex items-center gap-2 px-5 py-2.5 bg-[#006c49] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-black transition-colors rounded-sm">
              <span className="material-symbols-outlined text-sm">sync</span> Sync All
            </button>
          </div>
        </header>

        {/* Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {channels.map((ch) => {
            const sc = statusConfig[ch.status];
            return (
              <div key={ch.id} className="bg-white p-5 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] flex flex-col hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-11 h-11 flex items-center justify-center rounded-xl ${ch.status === "CONNECTED" ? "bg-[#eff4ff]" : "bg-slate-100"}`}>
                    <span className={`material-symbols-outlined text-2xl ${ch.status === "CONNECTED" ? "text-black" : "text-slate-400"}`}>{ch.icon}</span>
                  </div>
                  <span className={`px-2 py-0.5 ${sc.cls} text-[10px] font-[Manrope] font-bold rounded-full tracking-widest`}>{sc.label}</span>
                </div>
                <h3 className="text-[18px] font-serif font-semibold mb-1">{ch.title}</h3>
                <p className="text-[#45464d] text-xs mb-4 flex-1 font-[Manrope]">{ch.desc}</p>

                {/* Test Result */}
                {ch.testResult !== "idle" && (
                  <div className={`mb-3 px-3 py-2 rounded-lg text-xs font-[Manrope] font-bold flex items-center gap-2 ${ch.testResult === "testing" ? "bg-slate-50 text-slate-500" : ch.testResult === "pass" ? "bg-emerald-50 text-[#006c49]" : "bg-red-50 text-red-600"}`}>
                    <span className={`material-symbols-outlined text-sm ${ch.testResult === "testing" ? "animate-spin" : ""}`}>
                      {ch.testResult === "testing" ? "refresh" : ch.testResult === "pass" ? "check_circle" : "cancel"}
                    </span>
                    {ch.testResult === "testing" ? "Testing connection…" : ch.testResult === "pass" ? `Pass — ${ch.latency}ms` : "Connection failed"}
                  </div>
                )}

                <div className="border-t border-slate-50 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-[#818486] italic font-[Manrope]">
                      {ch.syncing ? <span className="text-[#006c49] font-bold flex items-center gap-1"><span className="material-symbols-outlined text-xs animate-spin">refresh</span> Syncing…</span> : `Last sync: ${ch.lastSync}`}
                    </span>
                    <Link href={ch.href} className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-black hover:text-[#006c49] transition-colors underline decoration-slate-200 underline-offset-4">MANAGE</Link>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => syncChannel(ch.id)} disabled={ch.status !== "CONNECTED" || ch.syncing}
                      className="py-1.5 text-[10px] font-[Manrope] font-bold tracking-wider uppercase border border-slate-200 hover:border-[#006c49] hover:text-[#006c49] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-0.5 rounded">
                      <span className={`material-symbols-outlined text-xs ${ch.syncing ? "animate-spin" : ""}`}>sync</span> Sync
                    </button>
                    <button onClick={() => testConnection(ch.id)} disabled={ch.testResult === "testing"}
                      className="py-1.5 text-[10px] font-[Manrope] font-bold tracking-wider uppercase border border-slate-200 hover:border-blue-400 hover:text-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-0.5 rounded">
                      <span className="material-symbols-outlined text-xs">network_ping</span> Test
                    </button>
                    <button onClick={() => toggleStatus(ch.id)}
                      className={`py-1.5 text-[10px] font-[Manrope] font-bold tracking-wider uppercase transition-colors rounded ${ch.status === "CONNECTED" ? "bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600" : "bg-[#6cf8bb] text-[#006c49] hover:bg-emerald-200"}`}>
                      {ch.status === "CONNECTED" ? "Pause" : ch.status === "PAUSED" ? "Resume" : "Connect"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabbed panel */}
        <div className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex border-b border-slate-100">
            {(["health", "events", "webhooks"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-8 py-4 font-[Manrope] font-bold text-xs tracking-widest uppercase transition-colors ${activeTab === tab ? "border-b-2 border-[#006c49] text-[#006c49]" : "text-[#7c839b] hover:text-black"}`}>
                {tab === "health" ? "Integration Health" : tab === "events" ? "Event Log" : "Webhooks"}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* Health Tab */}
            {activeTab === "health" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-[Manrope] text-xs text-[#7c839b]">Updated in real-time</span>
                  <span className="font-[Manrope] font-bold text-xs text-[#006c49]">{connectedCount}/{channels.length} channels active</span>
                </div>
                {[
                  { label: "API Response Time (avg)", value: `${Math.round(channels.reduce((a, c) => a + c.latency, 0) / channels.length)}ms`, bar: 78, cls: "bg-[#006c49]" },
                  { label: "Catalog Sync Rate", value: "99.8%", bar: 99, cls: "bg-[#006c49]" },
                  { label: "Message Delivery Rate", value: "97.2%", bar: 97, cls: "bg-[#006c49]" },
                  { label: "Webhook Success Rate", value: "99.1%", bar: 99, cls: "bg-[#006c49]" },
                  { label: "Error Rate", value: "0.2%", bar: 2, cls: "bg-[#ba1a1a]" },
                ].map((m) => (
                  <div key={m.label} className="flex items-center gap-4">
                    <span className="font-[Manrope] text-sm w-56 text-[#45464d] shrink-0">{m.label}</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${m.cls} rounded-full transition-all duration-700`} style={{ width: `${m.bar}%` }}></div>
                    </div>
                    <span className="font-[Manrope] font-bold text-sm w-20 text-right">{m.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Event Log Tab */}
            {activeTab === "events" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex gap-2">
                    {(["all", "sync", "info", "warning", "error"] as const).map((f) => (
                      <button key={f} onClick={() => setLogFilter(f)}
                        className={`px-3 py-1 text-[10px] font-[Manrope] font-bold uppercase tracking-widest rounded-full transition-all ${logFilter === f ? "bg-black text-white" : "bg-slate-100 text-[#7c839b] hover:bg-slate-200"}`}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <button onClick={clearLogs} className="text-xs font-[Manrope] text-[#7c839b] hover:text-red-500 transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">delete_sweep</span> Clear log
                  </button>
                </div>
                {filteredLogs.length === 0 ? (
                  <div className="text-center py-12 text-[#7c839b] font-[Manrope]">No events to display.</div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {filteredLogs.map((log) => {
                      const s = logTypeStyle[log.type];
                      return (
                        <div key={log.id} className="flex items-start gap-3 p-3 bg-[#f8f9ff] rounded-lg">
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${s.cls}`}>
                            <span className="material-symbols-outlined text-sm">{s.icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-[Manrope] font-bold text-xs text-[#7c839b] uppercase tracking-widest">{log.channel}</span>
                            </div>
                            <p className="font-[Manrope] font-semibold text-sm text-[#0b1c30]">{log.event}</p>
                            <p className="font-[Manrope] text-xs text-[#7c839b]">{log.detail}</p>
                          </div>
                          <span className="font-[Manrope] text-xs text-[#7c839b] shrink-0">{log.time}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Webhooks Tab */}
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
                    <div key={wh.id} className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-lg">
                      <div>
                        <p className="font-[Manrope] font-bold text-sm text-[#0b1c30]">{wh.label}</p>
                        <code className="text-[11px] text-[#006c49] font-mono">{wh.url}</code>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => showToast(`Test ping sent to ${wh.url}`)}
                          className="text-xs font-[Manrope] font-bold text-[#7c839b] hover:text-blue-600 border border-slate-200 px-3 py-1 rounded transition-colors">
                          Ping
                        </button>
                        <button
                          onClick={() => setWebhookStates((prev) => ({ ...prev, [wh.id]: !prev[wh.id] }))}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${webhookStates[wh.id] ? "bg-[#006c49]" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${webhookStates[wh.id] ? "translate-x-5" : "translate-x-0.5"}`}></span>
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
