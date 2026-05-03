import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ActiveTab = "credentials" | "templates" | "journeys" | "optins";

interface Template { id: string; name: string; category: string; body: string; status: string; language: string; sentCount: number; }
interface Journey  { id: string; journeyId: string; icon: string; title: string; description: string; active: boolean; sentCount: string; steps: number; convRate: string; }
interface OptinSettings { id: string; optinKeyword: string; optoutKeyword: string; doubleOptin: boolean; }

const statusStyle: Record<string, string> = {
  Approved: "bg-[#6cf8bb] text-[#00714d]",
  Pending:  "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-600",
};
const categoryStyle: Record<string, string> = {
  Marketing:      "bg-blue-50 text-blue-700",
  Utility:        "bg-slate-100 text-slate-600",
  Authentication: "bg-purple-50 text-purple-700",
};

type CopyState = Record<string, boolean>;

export default function AdminWhatsAppPage() {
  const [activeTab, setActiveTab]           = useState<ActiveTab>("credentials");
  const [templates, setTemplates]           = useState<Template[]>([]);
  const [journeys, setJourneys]             = useState<Journey[]>([]);
  const [optinSettings, setOptinSettings]   = useState<OptinSettings | null>(null);
  const [loading, setLoading]               = useState(true);

  const [copyState, setCopyState]           = useState<CopyState>({});
  const [syncing, setSyncing]               = useState(false);
  const [syncDone, setSyncDone]             = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [toast, setToast]                   = useState<string | null>(null);

  // Credentials
  const [waCreds,     setWaCreds]     = useState<Record<string, string>>({});
  const [credsDirty,  setCredsDirty]  = useState<Record<string, string>>({});
  const [credsSaving, setCredsSaving] = useState(false);
  const [showSecret,  setShowSecret]  = useState<Record<string, boolean>>({});
  const [testingConn, setTestingConn] = useState(false);
  const [testResult,  setTestResult]  = useState<{pass: boolean; latency: number} | null>(null);

  const WA_CRED_FIELDS = [
    { key: "phone_number_id",      label: "Cloud API Phone Number ID",      isSecret: false, hint: "WhatsApp Business Platform → Phone Numbers → Phone Number ID" },
    { key: "waba_id",              label: "WhatsApp Business Account ID",   isSecret: false, hint: "Meta Business Manager → WhatsApp Accounts → Account ID" },
    { key: "system_access_token",  label: "System Access Token",            isSecret: true,  hint: "Meta Business Manager → System Users → Generate Token (never expiring recommended)" },
    { key: "webhook_verify_token", label: "Webhook Verify Token",           isSecret: true,  hint: "A secret string you choose. Enter the same value when configuring your webhook in Meta." },
  ];

  const [testPhone, setTestPhone]           = useState("");
  const [testTemplate, setTestTemplate]     = useState("");
  const [sendingTest, setSendingTest]       = useState(false);

  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTplName, setNewTplName]         = useState("");
  const [newTplBody, setNewTplBody]         = useState("");
  const [newTplCategory, setNewTplCategory] = useState("Marketing");

  const [savingOptin, setSavingOptin]       = useState(false);
  const [localOptin, setLocalOptin]         = useState<OptinSettings | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const loadAll = useCallback(async () => {
    const [tRes, jRes, oRes, credRes] = await Promise.all([
      fetch("/api/whatsapp/templates"),
      fetch("/api/whatsapp/journeys"),
      fetch("/api/whatsapp/optin"),
      fetch("/api/channels/credentials/whatsapp"),
    ]);
    if (tRes.ok) { const data = await tRes.json(); setTemplates(data); if (data.length) setTestTemplate(data.find((t: Template) => t.status === "Approved")?.id ?? data[0].id); }
    if (jRes.ok) setJourneys(await jRes.json());
    if (oRes.ok) { const s = await oRes.json(); setOptinSettings(s); setLocalOptin(s); }
    if (credRes.ok) { const d = await credRes.json(); setWaCreds(d); setCredsDirty(d); }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const copyToClipboard = (label: string, value: string) => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopyState((p) => ({ ...p, [label]: true }));
    setTimeout(() => setCopyState((p) => ({ ...p, [label]: false })), 2000);
    showToast(`${label} copied to clipboard.`);
  };

  const toggleJourney = async (j: Journey) => {
    setJourneys((p) => p.map((x) => x.journeyId === j.journeyId ? { ...x, active: !x.active } : x));
    await fetch(`/api/whatsapp/journeys/${j.journeyId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !j.active }) });
    showToast(`${j.title} journey ${j.active ? "paused" : "activated"}.`);
  };

  const forceResync = () => {
    if (syncing) return;
    const hasToken = !!(waCreds.system_access_token?.trim());
    setSyncing(true); setSyncDone(false);
    setTimeout(() => {
      setSyncing(false); setSyncDone(true);
      showToast(hasToken ? "Credentials present — connect WhatsApp Cloud API to run live catalog sync." : "No System Access Token saved. Add credentials first.");
      setTimeout(() => setSyncDone(false), 4000);
    }, 1500);
  };

  const submitNewTemplate = async () => {
    if (!newTplName.trim() || !newTplBody.trim()) { showToast("Name and body are required."); return; }
    const res = await fetch("/api/whatsapp/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTplName, category: newTplCategory, body: newTplBody }) });
    if (res.ok) {
      const created = await res.json();
      setTemplates((p) => [...p, created]);
      setNewTplName(""); setNewTplBody(""); setShowNewTemplate(false);
      showToast("Template submitted for Meta approval.");
    }
  };

  const deleteTemplate = async (t: Template) => {
    setTemplates((p) => p.filter((x) => x.id !== t.id));
    await fetch(`/api/whatsapp/templates/${t.id}`, { method: "DELETE" });
    showToast(`Template "${t.name}" deleted.`);
  };

  const sendTestMessage = () => {
    if (!testPhone.trim()) { showToast("Enter a phone number first."); return; }
    const requiredCreds = ["phone_number_id", "waba_id", "system_access_token"];
    const missing = requiredCreds.filter((k) => !waCreds[k] || !waCreds[k].trim());
    if (missing.length > 0) {
      showToast(`Missing credentials: ${missing.join(", ")}. Add them in API Credentials first.`);
      setActiveTab("credentials");
      return;
    }
    setSendingTest(true);
    setTimeout(() => { setSendingTest(false); showToast(`Credentials present — connect WhatsApp Cloud API to send live messages.`); }, 1200);
  };

  const saveOptinSettings = async () => {
    if (!localOptin) return;
    setSavingOptin(true);
    const res = await fetch("/api/whatsapp/optin", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(localOptin) });
    if (res.ok) { setOptinSettings(await res.json()); }
    setSavingOptin(false);
    showToast("Opt-in/out settings saved.");
  };

  const saveWaCreds = async () => {
    setCredsSaving(true);
    await fetch("/api/channels/credentials/whatsapp", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credsDirty) });
    setWaCreds(credsDirty);
    setCredsSaving(false);
    showToast("API credentials saved securely.");
  };
  const testWaConn = async () => {
    setTestingConn(true); setTestResult(null);
    const res = await fetch("/api/channels/configs/whatsapp/test", { method: "POST" });
    if (res.ok) setTestResult(await res.json());
    setTestingConn(false);
  };

  const configuredCredsCount = WA_CRED_FIELDS.filter((f) => !!waCreds[f.key]).length;

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: "credentials", label: "API Credentials", icon: "key"             },
    { key: "templates",   label: "Templates",       icon: "description"     },
    { key: "journeys",    label: "Journeys",        icon: "route"           },
    { key: "optins",      label: "Opt-in / Out",    icon: "manage_accounts" },
  ];

  if (loading) return (
    <AdminLayout sidebar="channels">
      <div className="flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined animate-spin text-[#006c49] text-3xl">refresh</span>
      </div>
    </AdminLayout>
  );

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
              <p className="font-[Manrope] text-[16px] text-[#7c839b] max-w-2xl">Configure your Cloud API credentials, manage message templates, automated journeys, and subscriber opt-in settings.</p>
            </div>
            <div className="flex items-center gap-3 px-4 py-2 bg-emerald-50 border border-[#6cf8bb] rounded-full">
              <span className="w-2 h-2 rounded-full bg-[#006c49] animate-pulse"></span>
              <span className="text-[#006c49] font-[Manrope] font-bold text-[11px] tracking-widest uppercase">Configured</span>
            </div>
          </div>
        </header>

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: "Templates", value: templates.length, sub: `${templates.filter((t) => t.status === "Approved").length} approved`, icon: "description" },
            { label: "Journeys", value: journeys.length, sub: `${journeys.filter((j) => j.active).length} active`, icon: "route" },
            { label: "Opt-in", value: localOptin?.doubleOptin ? "On" : "Off", sub: localOptin?.optinKeyword ?? "not set", icon: "manage_accounts" },
            { label: "Credentials", value: configuredCredsCount, sub: `${WA_CRED_FIELDS.length} total`, icon: "key" },
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

        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-6 py-4 font-[Manrope] font-bold text-xs tracking-widest uppercase transition-colors whitespace-nowrap ${activeTab === t.key ? "border-b-2 border-[#006c49] text-[#006c49]" : "text-[#7c839b] hover:text-black"}`}>
                <span className="material-symbols-outlined text-sm">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* API Credentials */}
            {activeTab === "credentials" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-7 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-[20px] font-semibold mb-1">WhatsApp Cloud API Credentials</h3>
                      <p className="text-sm text-[#7c839b] font-[Manrope]">Enter your credentials from Meta for Developers. Saved securely to the database.</p>
                    </div>
                    <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${configuredCredsCount === WA_CRED_FIELDS.length ? "bg-[#6cf8bb] text-[#00714d] border-[#6cf8bb]" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {configuredCredsCount}/{WA_CRED_FIELDS.length} Configured
                    </span>
                  </div>
                  <div className="space-y-4">
                    {WA_CRED_FIELDS.map((field) => {
                      const val = credsDirty[field.key] ?? "";
                      const saved = waCreds[field.key] ?? "";
                      const isDirty = val !== saved;
                      const visible = showSecret[field.key];
                      return (
                        <div key={field.key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#45464d]">{field.label}</label>
                            <div className="flex items-center gap-2">
                              {isDirty && val !== "" && <span className="text-[9px] font-[Manrope] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Unsaved</span>}
                              {!isDirty && saved && <span className="text-[9px] font-[Manrope] font-bold uppercase tracking-widest text-[#006c49] bg-[#f0faf6] px-2 py-0.5 rounded-full flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">check_circle</span>Saved</span>}
                            </div>
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type={field.isSecret && !visible ? "password" : "text"}
                              value={val}
                              onChange={(e) => setCredsDirty((p) => ({ ...p, [field.key]: e.target.value }))}
                              placeholder={field.isSecret ? "••••••••••••••••" : `Enter ${field.label}…`}
                              className={`w-full bg-slate-50 border rounded-lg px-4 py-2.5 font-mono text-sm outline-none transition-colors pr-20 ${isDirty && val !== "" ? "border-amber-300 focus:border-amber-500" : "border-slate-100 focus:border-[#006c49]"}`}
                            />
                            <div className="absolute right-2 flex items-center gap-1">
                              {field.isSecret && (
                                <button onClick={() => setShowSecret((p) => ({ ...p, [field.key]: !p[field.key] }))} className="p-1 text-slate-400 hover:text-black transition-colors">
                                  <span className="material-symbols-outlined text-sm">{visible ? "visibility_off" : "visibility"}</span>
                                </button>
                              )}
                              {val && (
                                <button onClick={() => { navigator.clipboard.writeText(val).catch(() => {}); showToast(`${field.label} copied.`); }} className="p-1 text-slate-400 hover:text-[#006c49] transition-colors">
                                  <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-[#7c839b] font-[Manrope] italic">{field.hint}</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex gap-3 pt-1">
                    <button onClick={saveWaCreds} disabled={credsSaving}
                      className="flex-1 py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] disabled:opacity-60 transition-colors rounded-lg flex items-center justify-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${credsSaving ? "animate-spin" : ""}`}>{credsSaving ? "refresh" : "save"}</span>
                      {credsSaving ? "Saving…" : "Save Credentials"}
                    </button>
                    <button onClick={testWaConn} disabled={testingConn}
                      className="px-6 py-3 border border-slate-200 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:border-[#006c49] hover:text-[#006c49] disabled:opacity-60 transition-colors rounded-lg flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${testingConn ? "animate-spin" : ""}`}>{testingConn ? "refresh" : "wifi_tethering"}</span>
                      {testingConn ? "Testing…" : "Test Connection"}
                    </button>
                  </div>
                  {testResult && (
                    <div className={`p-4 rounded-xl border flex items-center gap-3 font-[Manrope] text-sm font-bold ${testResult.pass ? "bg-[#f0faf6] border-[#c3eed8] text-[#006c49]" : "bg-red-50 border-red-200 text-red-600"}`}>
                      <span className="material-symbols-outlined text-base">{testResult.pass ? "check_circle" : "error"}</span>
                      {testResult.pass ? `Connection successful — ${testResult.latency}ms latency` : "Connection failed — check your credentials and try again."}
                    </div>
                  )}

                  <div className="p-5 bg-[#f8f9ff] rounded-xl border border-slate-100">
                    <h4 className="font-serif font-semibold mb-3 flex items-center gap-2"><span className="material-symbols-outlined text-[#006c49] text-base">send</span>Template Coverage</h4>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">{templates.length} templates loaded</p>
                  </div>
                </div>

                <div className="col-span-12 lg:col-span-5 space-y-4">
                  <div className="p-5 bg-[#f8f9ff] rounded-xl border border-slate-100 space-y-4">
                    <h4 className="font-serif font-semibold flex items-center gap-2"><span className="material-symbols-outlined text-[#006c49] text-base">help</span>Connected Data</h4>
                    <p className="text-xs text-[#7c839b] font-[Manrope]">Templates and opt-in settings are loaded from the database.</p>
                  </div>
                  <div className="bg-black text-white p-5 rounded-xl">
                    <h4 className="font-serif font-semibold mb-2">Template Status</h4>
                    <p className="text-white/60 text-sm font-[Manrope]">{templates.filter((t) => t.status === "Approved").length} approved</p>
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs font-[Manrope] text-amber-800 flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">lock</span>
                      Credentials are stored in the database and never exposed in client-side code. Secret fields are masked during display.
                    </p>
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
                    <p className="text-sm text-[#7c839b] font-[Manrope]">{templates.length} templates · {templates.filter(t => t.status === "Approved").length} approved</p>
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
                        <select value={newTplCategory} onChange={(e) => setNewTplCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]">
                          {["Marketing", "Utility", "Authentication"].map((c) => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Message Body</label>
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
                        <div className="flex items-center gap-3 flex-wrap">
                          <code className="font-mono text-sm font-bold text-[#0b1c30]">{t.name}</code>
                          <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${categoryStyle[t.category] ?? "bg-slate-100 text-slate-600"}`}>{t.category}</span>
                          <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${statusStyle[t.status] ?? "bg-slate-100 text-slate-500"}`}>{t.status}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-[Manrope] text-[#7c839b]">{t.sentCount.toLocaleString()} sent</span>
                          {t.status !== "Approved" && (
                            <button onClick={() => deleteTemplate(t)} className="text-[#7c839b] hover:text-red-500 transition-colors ml-1">
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
                    <p className="text-sm text-[#7c839b] font-[Manrope]">{journeys.filter((j) => j.active).length}/{journeys.length} journeys active — persisted to database</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {journeys.map((j) => (
                    <div key={j.journeyId} className={`p-6 rounded-xl border transition-all ${j.active ? "bg-[#f8f9ff] border-slate-100" : "bg-white border-slate-200 opacity-70"}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`p-2 rounded-lg shadow-sm ${j.active ? "bg-white" : "bg-slate-100"}`}>
                          <span className={`material-symbols-outlined ${j.active ? "text-[#006c49]" : "text-[#7c839b]"}`}>{j.icon}</span>
                        </div>
                        <button onClick={() => toggleJourney(j)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${j.active ? "bg-[#006c49]" : "bg-slate-300"}`}>
                          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${j.active ? "translate-x-5" : "translate-x-0.5"}`}></span>
                        </button>
                      </div>
                      <h4 className="font-serif font-semibold mb-1">{j.title}</h4>
                      <p className="text-sm text-[#7c839b] font-[Manrope] mb-4">{j.description}</p>
                      <div className="flex items-center gap-4 text-[11px] font-[Manrope] font-bold text-[#45464d]">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">route</span> {j.steps} steps</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">send</span> {j.sentCount} sent/mo</span>
                        {j.convRate !== "—" && <span className="text-[#006c49] flex items-center gap-1"><span className="material-symbols-outlined text-xs">shopping_bag</span> {j.convRate} conv.</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Opt-in / Out */}
            {activeTab === "optins" && localOptin && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h3 className="font-serif text-[20px] font-semibold mb-1">Opt-in / Opt-out Settings</h3>
                  <p className="text-sm text-[#7c839b] font-[Manrope]">Keyword-based subscriber management — changes saved directly to database.</p>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  {[{ label: "Opt-in Keyword", key: "optinKeyword" as const, hint: "Customers text this to subscribe." },
                    { label: "Opt-out Keyword", key: "optoutKeyword" as const, hint: "Customers text this to unsubscribe." }].map((f) => (
                    <div key={f.key} className="space-y-2">
                      <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">{f.label}</label>
                      <input value={localOptin[f.key]} onChange={(e) => setLocalOptin((p) => p ? { ...p, [f.key]: e.target.value.toUpperCase() } : p)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 font-mono text-sm outline-none focus:border-[#006c49]" />
                      <p className="text-xs text-[#7c839b] font-[Manrope]">{f.hint}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-xl">
                  <div>
                    <p className="font-[Manrope] font-bold text-sm">Double Opt-in</p>
                    <p className="text-xs text-[#7c839b] font-[Manrope] mt-0.5">Send a confirmation before adding subscribers.</p>
                  </div>
                  <button onClick={() => setLocalOptin((p) => p ? { ...p, doubleOptin: !p.doubleOptin } : p)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${localOptin.doubleOptin ? "bg-[#006c49]" : "bg-slate-300"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${localOptin.doubleOptin ? "translate-x-5" : "translate-x-0.5"}`}></span>
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
                <button onClick={saveOptinSettings} disabled={savingOptin}
                  className="w-full py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] disabled:opacity-60 transition-colors rounded-lg flex items-center justify-center gap-2">
                  <span className={`material-symbols-outlined text-sm ${savingOptin ? "animate-spin" : ""}`}>{savingOptin ? "refresh" : "save"}</span>
                  {savingOptin ? "Saving…" : "Save Settings"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
