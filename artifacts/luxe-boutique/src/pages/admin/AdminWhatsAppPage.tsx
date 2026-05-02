import { useState, useRef } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ActiveTab = "config" | "templates" | "journeys" | "optins";
type TemplateStatus = "Approved" | "Pending" | "Rejected";

interface MessageTemplate {
  id: string;
  name: string;
  category: "Marketing" | "Utility" | "Authentication";
  body: string;
  status: TemplateStatus;
  language: string;
  sentCount: number;
}

interface Journey {
  id: string;
  icon: string;
  title: string;
  desc: string;
  active: boolean;
  sent: string;
  steps: number;
  convRate: string;
}

const initialTemplates: MessageTemplate[] = [
  { id: "t1", name: "order_confirmation", category: "Utility",     body: "Hi {{1}}, your order #{{2}} has been confirmed! Estimated delivery: {{3}}. Track at luxeboutique.com/track", status: "Approved", language: "en", sentCount: 8102 },
  { id: "t2", name: "cart_recovery_1",    category: "Marketing",   body: "{{1}}, you left something behind ✨ Your cart is waiting — complete your order before it sells out: {{2}}", status: "Approved", language: "en", sentCount: 2841 },
  { id: "t3", name: "vip_welcome",        category: "Marketing",   body: "Welcome to LUXE VIP, {{1}} 🖤 You now have exclusive early access to new collections and private sale events.", status: "Approved", language: "en", sentCount: 142 },
  { id: "t4", name: "shipping_update",    category: "Utility",     body: "Your order is on the way! 📦 Track your parcel: {{1}}\nExpected delivery: {{2}}", status: "Approved", language: "en", sentCount: 6218 },
  { id: "t5", name: "review_request",     category: "Marketing",   body: "How did we do, {{1}}? Share your experience with your recent purchase and get 10% off your next order.", status: "Pending",  language: "en", sentCount: 0 },
];

const initialJourneys: Journey[] = [
  { id: "cart",     icon: "shopping_cart",  title: "Abandoned Cart",  desc: "3-step recovery sequence triggered 30min after cart abandonment.", active: true,  sent: "2,841", steps: 3, convRate: "18.4%" },
  { id: "shipping", icon: "local_shipping", title: "Order Tracking",  desc: "Real-time shipping updates sent automatically at each milestone.",   active: true,  sent: "8,102", steps: 4, convRate: "—"     },
  { id: "vip",      icon: "star",           title: "VIP Welcome",     desc: "Exclusive welcome flow for customers spending over $2,000.",          active: false, sent: "142",   steps: 2, convRate: "34.0%" },
  { id: "review",   icon: "rate_review",    title: "Review Request",  desc: "Sent 5 days after delivery to collect product reviews.",              active: false, sent: "0",     steps: 1, convRate: "—"     },
];

const statusStyle: Record<TemplateStatus, string> = {
  Approved: "bg-[#6cf8bb] text-[#00714d]",
  Pending:  "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-600",
};
const categoryStyle: Record<MessageTemplate["category"], string> = {
  Marketing:      "bg-blue-50 text-blue-700",
  Utility:        "bg-slate-100 text-slate-600",
  Authentication: "bg-purple-50 text-purple-700",
};

type CopyState = Record<string, boolean>;

export default function AdminWhatsAppPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("config");
  const [journeys, setJourneys] = useState<Journey[]>(initialJourneys);
  const [templates, setTemplates] = useState<MessageTemplate[]>(initialTemplates);
  const [showToken, setShowToken] = useState(false);
  const [copyState, setCopyState] = useState<CopyState>({});
  const [syncing, setSyncing] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  // Test message
  const [testPhone, setTestPhone] = useState("");
  const [testTemplate, setTestTemplate] = useState("t1");
  const [sendingTest, setSendingTest] = useState(false);
  // New template
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplBody, setNewTplBody] = useState("");
  const [newTplCategory, setNewTplCategory] = useState<MessageTemplate["category"]>("Marketing");
  // Opt-in
  const [optinKeyword, setOptinKeyword] = useState("JOIN");
  const [optoutKeyword, setOptoutKeyword] = useState("STOP");
  const [doubleOptin, setDoubleOptin] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopyState((prev) => ({ ...prev, [label]: true }));
    setTimeout(() => setCopyState((prev) => ({ ...prev, [label]: false })), 2000);
    showToast(`${label} copied to clipboard.`);
  };

  const toggleJourney = (id: string) => {
    const j = journeys.find((x) => x.id === id)!;
    setJourneys((prev) => prev.map((x) => x.id === id ? { ...x, active: !x.active } : x));
    showToast(`${j.title} journey ${j.active ? "paused" : "activated"}.`);
  };

  const forceResync = () => {
    if (syncing) return;
    setSyncing(true); setSyncDone(false);
    setTimeout(() => { setSyncing(false); setSyncDone(true); showToast("Catalog resync complete — 1,248 products updated."); setTimeout(() => setSyncDone(false), 4000); }, 2500);
  };

  const sendTestMessage = () => {
    if (!testPhone.trim()) { showToast("Enter a phone number first."); return; }
    setSendingTest(true);
    setTimeout(() => { setSendingTest(false); showToast(`Test message sent to ${testPhone}.`); }, 2000);
  };

  const deleteTemplate = (id: string) => {
    const t = templates.find((x) => x.id === id)!;
    setTemplates((prev) => prev.filter((x) => x.id !== id));
    showToast(`Template "${t.name}" deleted.`);
  };

  const submitNewTemplate = () => {
    if (!newTplName.trim() || !newTplBody.trim()) { showToast("Name and body are required."); return; }
    const tpl: MessageTemplate = { id: Date.now().toString(), name: newTplName.toLowerCase().replace(/\s+/g, "_"), category: newTplCategory, body: newTplBody, status: "Pending", language: "en", sentCount: 0 };
    setTemplates((prev) => [...prev, tpl]);
    setNewTplName(""); setNewTplBody(""); setShowNewTemplate(false);
    showToast("Template submitted for Meta approval.");
  };

  const saveSettings = () => {
    setSavingSettings(true);
    setTimeout(() => { setSavingSettings(false); showToast("Opt-in/out settings saved."); }, 1500);
  };

  const apiFields = [
    { label: "Cloud API Phone Number ID", key: "PhoneID", value: "105938472019482" },
    { label: "WhatsApp Business Account ID", key: "AccountID", value: "294817502938411" },
  ];

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: "config",    label: "API Config",   icon: "api"          },
    { key: "templates", label: "Templates",    icon: "description"  },
    { key: "journeys",  label: "Journeys",     icon: "route"        },
    { key: "optins",    label: "Opt-in / Out", icon: "manage_accounts" },
  ];

  return (
    <AdminLayout sidebar="channels">
      <div className="p-10 max-w-[1280px] mx-auto min-h-screen">
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>{toast}
          </div>
        )}

        <header className="mb-10">
          <Link href="/admin/channels" className="inline-flex items-center gap-1.5 text-[#7c839b] hover:text-[#006c49] transition-colors font-[Manrope] font-bold text-xs tracking-widest uppercase mb-4 no-underline">
            <span className="material-symbols-outlined text-base">arrow_back</span> Channel Hub
          </Link>
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-[40px] font-serif font-bold text-[#0b1c30] mb-2">WhatsApp API Console</h1>
              <p className="font-[Manrope] text-[16px] text-[#7c839b] max-w-2xl">Configure your cloud API, manage message templates, automated journeys, and subscriber opt-in settings.</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-[#6cf8bb] rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#006c49] animate-pulse"></span>
              <span className="text-[#006c49] font-[Manrope] font-bold text-[11px] tracking-widest uppercase">Connected</span>
            </div>
          </div>
        </header>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Messages Sent (30d)", value: "14,820", sub: "+8.2%", icon: "send" },
            { label: "Delivery Rate", value: "99.3%", sub: "14,711 delivered", icon: "mark_email_read" },
            { label: "Read Rate", value: "61.5%", sub: "9,108 opened", icon: "visibility" },
            { label: "Conversions", value: "482", sub: "+14% vs last month", icon: "shopping_bag" },
          ].map((s) => (
            <div key={s.label} className="bg-white p-4 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <div className="flex justify-between items-start mb-2">
                <span className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b]">{s.label}</span>
                <span className="material-symbols-outlined text-[#006c49] text-base">{s.icon}</span>
              </div>
              <p className="text-[22px] font-serif font-semibold">{s.value}</p>
              <p className="text-xs text-[#7c839b] font-[Manrope] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex border-b border-slate-100">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-6 py-4 font-[Manrope] font-bold text-xs tracking-widest uppercase transition-colors ${activeTab === t.key ? "border-b-2 border-[#006c49] text-[#006c49]" : "text-[#7c839b] hover:text-black"}`}>
                <span className="material-symbols-outlined text-sm">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* API Config */}
            {activeTab === "config" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                  <h3 className="font-serif text-[20px] font-semibold">API Configuration</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {apiFields.map((f) => (
                      <div key={f.key} className="space-y-2">
                        <label className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#45464d] block">{f.label}</label>
                        <div className="relative">
                          <input className="w-full bg-slate-50 border border-slate-100 px-4 py-3 font-mono text-sm focus:outline-none cursor-default pr-10" readOnly type="text" value={f.value} />
                          <button onClick={() => copyToClipboard(f.key, f.value)} className="absolute right-3 top-3 text-slate-400 hover:text-[#006c49] transition-colors">
                            <span className="material-symbols-outlined text-sm">{copyState[f.key] ? "check" : "content_copy"}</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#45464d] block">System Access Token</label>
                    <div className="relative">
                      <input className="w-full bg-slate-50 border border-slate-100 px-4 py-3 font-mono text-sm focus:outline-none cursor-default pr-20" readOnly type={showToken ? "text" : "password"} value="EAAQZA7x5ZBm9sBAA9R2lZCmPeWKHV4rZ1" />
                      <button onClick={() => setShowToken((v) => !v)} className="absolute right-10 top-3 text-slate-400 hover:text-black transition-colors">
                        <span className="material-symbols-outlined text-sm">{showToken ? "visibility_off" : "visibility"}</span>
                      </button>
                      <button onClick={() => copyToClipboard("Token", "EAAQZA7x5ZBm9sBAA9R2lZCmPeWKHV4rZ1")} className="absolute right-3 top-3 text-slate-400 hover:text-[#006c49] transition-colors">
                        <span className="material-symbols-outlined text-sm">{copyState["Token"] ? "check" : "content_copy"}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 italic font-[Manrope]">Tokens expire every 60 days. Auto-renew is currently enabled.</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-serif font-bold text-sm mb-1">Webhook Endpoint</h4>
                        <code className="text-[#006c49] text-xs">https://api.yourdomain.com/v1/whatsapp/webhook</code>
                        {webhookConfigured && <p className="text-xs text-[#006c49] font-[Manrope] font-bold mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-xs">check_circle</span> Verified & active</p>}
                      </div>
                      <button onClick={() => { setWebhookConfigured(true); showToast("Webhook endpoint verified successfully."); }}
                        className={`font-[Manrope] font-bold text-[10px] tracking-widest uppercase border px-3 py-1.5 transition-all ${webhookConfigured ? "border-[#006c49] text-[#006c49] bg-emerald-50" : "border-black hover:bg-black hover:text-white"}`}>
                        {webhookConfigured ? "VERIFIED" : "CONFIGURE"}
                      </button>
                    </div>
                  </div>
                  {/* Test Message */}
                  <div className="p-5 bg-[#f8f9ff] rounded-xl border border-slate-100">
                    <h4 className="font-serif font-semibold mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[#006c49] text-base">send</span> Send Test Message</h4>
                    <div className="flex gap-3">
                      <input value={testPhone} onChange={(e) => setTestPhone(e.target.value)} placeholder="+1 555 000 0000"
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]" />
                      <select value={testTemplate} onChange={(e) => setTestTemplate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]">
                        {templates.filter((t) => t.status === "Approved").map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <button onClick={sendTestMessage} disabled={sendingTest}
                        className="px-5 py-2 bg-[#006c49] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-black disabled:opacity-60 transition-colors rounded-lg flex items-center gap-2">
                        <span className={`material-symbols-outlined text-sm ${sendingTest ? "animate-spin" : ""}`}>{sendingTest ? "refresh" : "send"}</span>
                        {sendingTest ? "Sending…" : "Send"}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-4">
                  <div className="bg-black text-white p-6 rounded-xl">
                    <h3 className="font-serif text-[18px] font-semibold mb-2">Catalog Sync</h3>
                    <p className="text-white/60 text-sm font-[Manrope] mb-4">1,248 products synced to Meta</p>
                    <div className="flex items-center gap-2 mb-4">
                      {syncing ? <><span className="material-symbols-outlined text-amber-400 text-sm animate-spin">refresh</span><span className="text-sm font-[Manrope] text-amber-400">Syncing...</span></>
                        : syncDone ? <><span className="material-symbols-outlined text-[#4edea3] text-sm">check_circle</span><span className="text-sm font-[Manrope] text-[#4edea3]">Sync complete</span></>
                        : <><div className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></div><span className="text-sm font-[Manrope] text-[#4edea3]">Live & Synced</span></>}
                    </div>
                    {syncing && <div className="h-1 bg-white/10 rounded-full overflow-hidden mb-4"><div className="h-full bg-[#4edea3] rounded-full animate-pulse w-3/4"></div></div>}
                    <button onClick={forceResync} disabled={syncing}
                      className="w-full bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-white py-2 px-4 font-[Manrope] font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${syncing ? "animate-spin" : ""}`}>refresh</span>{syncing ? "Syncing..." : "Force Resync"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Templates */}
            {activeTab === "templates" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Message Templates</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">WhatsApp-approved message templates for outbound messaging.</p>
                  </div>
                  <button onClick={() => setShowNewTemplate((v) => !v)}
                    className="px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span> New Template
                  </button>
                </div>
                {showNewTemplate && (
                  <div className="mb-6 p-6 bg-[#f8f9ff] rounded-xl border border-dashed border-slate-200 space-y-4">
                    <h4 className="font-serif font-semibold">Create New Template</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Template Name</label>
                        <input value={newTplName} onChange={(e) => setNewTplName(e.target.value)} placeholder="e.g. welcome_new_customer"
                          className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]" />
                      </div>
                      <div className="space-y-1">
                        <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Category</label>
                        <select value={newTplCategory} onChange={(e) => setNewTplCategory(e.target.value as MessageTemplate["category"])}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]">
                          {["Marketing", "Utility", "Authentication"].map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Message Body (use &#123;&#123;1&#125;&#125; for variables)</label>
                      <textarea value={newTplBody} onChange={(e) => setNewTplBody(e.target.value)} rows={3}
                        placeholder="Hi {{1}}, your order #{{2}} is confirmed…"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-[Manrope] outline-none focus:border-[#006c49] resize-none" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={submitNewTemplate} className="px-5 py-2 bg-[#006c49] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-black transition-colors rounded-lg">Submit for Approval</button>
                      <button onClick={() => setShowNewTemplate(false)} className="px-5 py-2 border border-slate-200 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-colors rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {templates.map((t) => (
                    <div key={t.id} className="p-5 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <code className="font-mono text-sm font-bold text-[#0b1c30]">{t.name}</code>
                          <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${categoryStyle[t.category]}`}>{t.category}</span>
                          <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${statusStyle[t.status]}`}>{t.status}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-[Manrope] text-[#7c839b]">{t.sentCount.toLocaleString()} sent</span>
                          {t.status !== "Approved" && (
                            <button onClick={() => deleteTemplate(t.id)} className="text-[#7c839b] hover:text-red-500 transition-colors ml-2">
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm font-[Manrope] text-[#45464d] bg-[#f8f9ff] rounded-lg px-4 py-3 border-l-2 border-[#006c49]">{t.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Journeys */}
            {activeTab === "journeys" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Automated Customer Journeys</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">{journeys.filter((j) => j.active).length}/{journeys.length} journeys active</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {journeys.map((j) => (
                    <div key={j.id} className={`p-6 rounded-xl border transition-all ${j.active ? "bg-[#f8f9ff] border-slate-100" : "bg-white border-slate-200 opacity-70"}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg shadow-sm ${j.active ? "bg-white" : "bg-slate-100"}`}>
                          <span className={`material-symbols-outlined ${j.active ? "text-[#006c49]" : "text-[#7c839b]"}`}>{j.icon}</span>
                        </div>
                        <button onClick={() => toggleJourney(j.id)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${j.active ? "bg-[#006c49]" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${j.active ? "translate-x-5" : "translate-x-0.5"}`}></span>
                        </button>
                      </div>
                      <h4 className="font-serif font-semibold mb-1">{j.title}</h4>
                      <p className="text-sm text-[#7c839b] font-[Manrope] mb-4">{j.desc}</p>
                      <div className="flex items-center gap-4 text-[11px] font-[Manrope] font-bold text-[#45464d]">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">route</span> {j.steps} steps</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">send</span> {j.sent} sent/mo</span>
                        {j.convRate !== "—" && <span className="text-[#006c49] flex items-center gap-1"><span className="material-symbols-outlined text-xs">shopping_bag</span> {j.convRate} conv.</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opt-in / Out */}
            {activeTab === "optins" && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h3 className="font-serif text-[20px] font-semibold mb-1">Opt-in / Opt-out Settings</h3>
                  <p className="text-sm text-[#7c839b] font-[Manrope]">Configure keyword-based subscriber management to stay GDPR & TCPA compliant.</p>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Opt-in Keyword</label>
                    <input value={optinKeyword} onChange={(e) => setOptinKeyword(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-[#006c49]" />
                    <p className="text-xs text-[#7c839b] font-[Manrope]">Customers text this to subscribe.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Opt-out Keyword</label>
                    <input value={optoutKeyword} onChange={(e) => setOptoutKeyword(e.target.value.toUpperCase())}
                      className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-[#006c49]" />
                    <p className="text-xs text-[#7c839b] font-[Manrope]">Customers text this to unsubscribe.</p>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-xl">
                  <div>
                    <p className="font-[Manrope] font-bold text-sm">Double Opt-in</p>
                    <p className="text-xs text-[#7c839b] font-[Manrope] mt-0.5">Send a confirmation message before adding subscribers.</p>
                  </div>
                  <button onClick={() => setDoubleOptin((v) => !v)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${doubleOptin ? "bg-[#006c49]" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${doubleOptin ? "translate-x-5" : "translate-x-0.5"}`}></span>
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 p-5 bg-white border border-slate-100 rounded-xl">
                  {[{ label: "Total Subscribers", value: "18,420" }, { label: "Active", value: "17,841" }, { label: "Opted Out (30d)", value: "241" }].map((s) => (
                    <div key={s.label}>
                      <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-1">{s.label}</p>
                      <p className="text-[22px] font-serif font-semibold">{s.value}</p>
                    </div>
                  ))}
                </div>
                <button onClick={saveSettings} disabled={savingSettings}
                  className="w-full py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] disabled:opacity-60 transition-colors rounded-lg flex items-center justify-center gap-2">
                  <span className={`material-symbols-outlined text-sm ${savingSettings ? "animate-spin" : ""}`}>{savingSettings ? "refresh" : "save"}</span>
                  {savingSettings ? "Saving…" : "Save Settings"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
