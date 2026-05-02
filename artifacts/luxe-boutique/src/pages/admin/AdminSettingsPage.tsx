import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type SettingsData = {
  settings: Record<string, string>;
  status: { smtpConfigured: boolean; cloudinaryConfigured: boolean };
};

type Section = "email" | "cloudinary" | "store" | "facebook" | "twitter" | "whatsapp";

const MASK = "●●●●●●●●●●●●";

const SMTP_PRESETS: Record<string, { host: string; port: string; label: string }> = {
  gmail:    { host: "smtp.gmail.com",       port: "587", label: "Gmail"         },
  sendgrid: { host: "smtp.sendgrid.net",    port: "587", label: "SendGrid"      },
  mailgun:  { host: "smtp.mailgun.org",     port: "587", label: "Mailgun"       },
  brevo:    { host: "smtp-relay.brevo.com", port: "587", label: "Brevo"         },
  custom:   { host: "",                     port: "587", label: "Custom / Other" },
};

type CredField = { key: string; label: string; isSecret: boolean; hint: string };

function ChannelCredsPanel({
  channel, fields, icon, title, description, docsSteps, savedSection, onSaved,
}: {
  channel: string;
  fields: CredField[];
  icon: string;
  title: string;
  description: string;
  docsSteps: { step: string; title: string; body: string }[];
  savedSection: Section | null;
  onSaved: () => void;
}) {
  const [saved,  setSaved]  = useState<Record<string, string>>({});
  const [dirty,  setDirty]  = useState<Record<string, string>>({});
  const [show,   setShow]   = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ pass: boolean; latency: number } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/channels/credentials/${channel}`);
    if (res.ok) { const d = await res.json(); setSaved(d); setDirty(d); }
  }, [channel]);

  useEffect(() => { load(); }, [load]);

  const configuredCount = fields.filter(f => !!saved[f.key]).length;
  const allConfigured   = configuredCount === fields.length;

  const save = async () => {
    setSaving(true);
    await fetch(`/api/channels/credentials/${channel}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dirty),
    });
    setSaved(dirty);
    setSaving(false);
    setNotice("Credentials saved.");
    setTimeout(() => setNotice(null), 3000);
    onSaved();
  };

  const test = async () => {
    setTesting(true); setTestResult(null);
    const res = await fetch(`/api/channels/configs/${channel}/test`, { method: "POST" });
    if (res.ok) setTestResult(await res.json());
    setTesting(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
      <div className="px-8 py-6 border-b border-[#e5eeff] flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#f0f2ff] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#006c49]">{icon}</span>
          </div>
          <div>
            <h2 className="text-[24px] font-serif font-semibold text-black">{title}</h2>
            <p className="text-xs font-[Manrope] text-[#7c839b] mt-0.5">{description}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-[Manrope] font-bold uppercase tracking-widest ${
          allConfigured ? "text-[#006c49] bg-[#e6f7f1]" : "text-[#7c839b] bg-[#f0f2ff]"
        }`}>
          <span className="material-symbols-outlined text-[12px]">{allConfigured ? "check_circle" : "radio_button_unchecked"}</span>
          {configuredCount}/{fields.length} Configured
        </span>
      </div>

      <div className="grid grid-cols-12 gap-0">
        {/* Fields */}
        <div className="col-span-12 lg:col-span-7 p-8 space-y-5 border-r border-[#f0f2ff]">
          {fields.map(f => {
            const val    = dirty[f.key] ?? "";
            const svd    = saved[f.key] ?? "";
            const isDirty = val !== svd;
            const visible = show[f.key];
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d]">{f.label}</label>
                  <div className="flex items-center gap-2">
                    {isDirty && val !== "" && <span className="text-[9px] font-[Manrope] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Unsaved</span>}
                    {!isDirty && svd && <span className="text-[9px] font-[Manrope] font-bold uppercase tracking-widest text-[#006c49] bg-[#f0faf6] px-2 py-0.5 rounded-full flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">check_circle</span>Saved</span>}
                  </div>
                </div>
                <div className="relative">
                  <input
                    type={f.isSecret && !visible ? "password" : "text"}
                    value={val}
                    onChange={e => setDirty(p => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.isSecret ? "••••••••••••••••" : `Enter ${f.label}…`}
                    className={`w-full bg-[#f8f9ff] border rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none transition-colors pr-20 ${
                      isDirty && val !== "" ? "border-amber-300 focus:border-amber-500" : "border-[#c6c6cd] focus:border-black"
                    }`}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {f.isSecret && (
                      <button onClick={() => setShow(p => ({ ...p, [f.key]: !p[f.key] }))} className="p-1 text-[#7c839b] hover:text-black transition-colors">
                        <span className="material-symbols-outlined text-sm">{visible ? "visibility_off" : "visibility"}</span>
                      </button>
                    )}
                    {val && (
                      <button onClick={() => navigator.clipboard.writeText(val)} className="p-1 text-[#7c839b] hover:text-[#006c49] transition-colors">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-1 text-[11px] font-[Manrope] text-[#7c839b] italic">{f.hint}</p>
              </div>
            );
          })}

          {notice && (
            <div className="p-3 bg-[#e6f7f1] text-[#006c49] rounded-lg flex items-center gap-2 text-sm font-[Manrope] font-bold">
              <span className="material-symbols-outlined text-base">check_circle</span>{notice}
            </div>
          )}
          {testResult && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-[Manrope] font-bold ${testResult.pass ? "bg-[#e6f7f1] text-[#006c49]" : "bg-[#ffdad6] text-[#ba1a1a]"}`}>
              <span className="material-symbols-outlined text-base">{testResult.pass ? "check_circle" : "error"}</span>
              {testResult.pass ? `Connection successful — ${testResult.latency}ms` : "Connection failed — check your credentials."}
            </div>
          )}
        </div>

        {/* Docs guide */}
        <div className="col-span-12 lg:col-span-5 p-8 space-y-4">
          <h4 className="font-serif font-semibold flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-[#006c49] text-base">help</span>
            Where to find your credentials
          </h4>
          {docsSteps.map(s => (
            <div key={s.step} className="flex gap-3">
              <span className="w-5 h-5 rounded-full bg-[#006c49] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
              <div>
                <p className="font-[Manrope] font-bold text-sm mb-0.5">{s.title}</p>
                <p className="text-xs text-[#7c839b] font-[Manrope]">{s.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-8 py-5 border-t border-[#e5eeff] bg-[#f8f9ff] flex items-center justify-between gap-4">
        <button onClick={test} disabled={testing}
          className="px-5 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-white transition-all rounded-lg flex items-center gap-2 disabled:opacity-60">
          <span className={`material-symbols-outlined text-sm ${testing ? "animate-spin" : ""}`}>{testing ? "autorenew" : "wifi_tethering"}</span>
          {testing ? "Testing…" : "Test Connection"}
        </button>
        <button onClick={save} disabled={saving}
          className="px-8 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow disabled:opacity-60 flex items-center gap-2">
          {saving
            ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Saving…</>
            : notice
              ? <><span className="material-symbols-outlined text-sm">check</span> Saved!</>
              : "Save Credentials"
          }
        </button>
      </div>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-[Manrope] font-bold uppercase tracking-widest ${
      ok ? "text-[#006c49] bg-[#e6f7f1]" : "text-[#7c839b] bg-[#f0f2ff]"
    }`}>
      <span className="material-symbols-outlined text-[12px]">{ok ? "check_circle" : "radio_button_unchecked"}</span>
      {ok ? "Configured" : "Not set"}
    </span>
  );
}

function Field({
  label, value, onChange, type = "text", placeholder, hint, masked, onReveal,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string; masked?: boolean; onReveal?: () => void;
}) {
  const [show, setShow] = useState(false);
  const isSecret = masked && value === MASK;

  return (
    <div>
      <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-2">{label}</label>
      <div className="relative">
        <input
          type={masked && !show ? "password" : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none focus:border-black transition-colors pr-10"
        />
        {masked && (
          <button type="button" onClick={() => {
            if (isSecret && onReveal) { onReveal(); }
            setShow(s => !s);
          }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7c839b] hover:text-black transition-colors">
            <span className="material-symbols-outlined text-lg">{show ? "visibility_off" : "visibility"}</span>
          </button>
        )}
      </div>
      {hint && <p className="mt-1.5 text-[11px] font-[Manrope] text-[#7c839b]">{hint}</p>}
    </div>
  );
}

export default function AdminSettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("email");

  const [smtpProvider, setSmtpProvider] = useState("custom");
  const [smtpHost,  setSmtpHost]  = useState("");
  const [smtpPort,  setSmtpPort]  = useState("587");
  const [smtpUser,  setSmtpUser]  = useState("");
  const [smtpPass,  setSmtpPass]  = useState("");
  const [smtpFrom,  setSmtpFrom]  = useState("");

  const [cloudName,    setCloudName]    = useState("");
  const [cloudApiKey,  setCloudApiKey]  = useState("");
  const [cloudSecret,  setCloudSecret]  = useState("");
  const [cloudPreset,  setCloudPreset]  = useState("");

  const [storeName,     setStoreName]     = useState("Luxe Boutique");
  const [storeEmail,    setStoreEmail]    = useState("");
  const [storeCurrency, setStoreCurrency] = useState("USD");
  const [storeTimezone, setStoreTimezone] = useState("UTC");

  const [testEmailResult,    setTestEmailResult]    = useState<{ ok: boolean; msg: string } | null>(null);
  const [testCloudResult,    setTestCloudResult]    = useState<{ ok: boolean; msg: string } | null>(null);
  const [savedSection,       setSavedSection]       = useState<Section | null>(null);

  const { data, isLoading, refetch } = useQuery<SettingsData>({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  useEffect(() => {
    if (!data) return;
    const s = data.settings;
    setSmtpHost(s.smtp_host  ?? ""); setSmtpPort(s.smtp_port ?? "587");
    setSmtpUser(s.smtp_user  ?? ""); setSmtpPass(s.smtp_pass ?? "");
    setSmtpFrom(s.smtp_from  ?? "");
    setCloudName(s.cloudinary_cloud_name    ?? "");
    setCloudApiKey(s.cloudinary_api_key     ?? "");
    setCloudSecret(s.cloudinary_api_secret  ?? "");
    setCloudPreset(s.cloudinary_upload_preset ?? "");
    setStoreName(s.store_name     ?? "Luxe Boutique");
    setStoreEmail(s.store_email   ?? "");
    setStoreCurrency(s.store_currency ?? "USD");
    setStoreTimezone(s.store_timezone ?? "UTC");

    const host = s.smtp_host ?? "";
    const preset = Object.entries(SMTP_PRESETS).find(([, v]) => v.host === host);
    setSmtpProvider(preset ? preset[0] : host ? "custom" : "custom");
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, string>) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Save failed");
    },
    onSuccess: (_, __, ctx: any) => {
      setSavedSection(ctx);
      setTimeout(() => setSavedSection(null), 3000);
      refetch();
    },
  });

  const saveEmail = () => {
    saveMutation.mutate({
      smtp_host: smtpHost, smtp_port: smtpPort,
      smtp_user: smtpUser, smtp_pass: smtpPass, smtp_from: smtpFrom,
    }, { context: "email" as Section });
    setTestEmailResult(null);
  };

  const saveCloudinary = () => {
    saveMutation.mutate({
      cloudinary_cloud_name: cloudName, cloudinary_api_key: cloudApiKey,
      cloudinary_api_secret: cloudSecret, cloudinary_upload_preset: cloudPreset,
    }, { context: "cloudinary" as Section });
    setTestCloudResult(null);
  };

  const saveStore = () => {
    saveMutation.mutate({
      store_name: storeName, store_email: storeEmail,
      store_currency: storeCurrency, store_timezone: storeTimezone,
    }, { context: "store" as Section });
  };

  const testEmail = async () => {
    setTestEmailResult(null);
    try {
      const res = await fetch("/api/settings/test/email", { method: "POST" });
      const data = await res.json();
      if (res.ok) setTestEmailResult({ ok: true, msg: `Test email sent to ${data.sentTo}` });
      else setTestEmailResult({ ok: false, msg: data.error });
    } catch { setTestEmailResult({ ok: false, msg: "Connection failed" }); }
  };

  const testCloudinary = async () => {
    setTestCloudResult(null);
    try {
      const res = await fetch("/api/settings/test/cloudinary", { method: "POST" });
      const data = await res.json();
      if (res.ok) setTestCloudResult({ ok: true, msg: `Connected to cloud "${data.cloudName}"` });
      else setTestCloudResult({ ok: false, msg: data.error });
    } catch { setTestCloudResult({ ok: false, msg: "Connection failed" }); }
  };

  const applyPreset = (key: string) => {
    setSmtpProvider(key);
    const p = SMTP_PRESETS[key];
    if (p.host) setSmtpHost(p.host);
    if (p.port) setSmtpPort(p.port);
  };

  const smtp = data?.status.smtpConfigured ?? false;
  const cloud = data?.status.cloudinaryConfigured ?? false;

  const sections: { key: Section; icon: string; label: string; ok: boolean; group?: string }[] = [
    { key: "email",      icon: "mail",          label: "Email / SMTP",     ok: smtp,  group: "Core"     },
    { key: "cloudinary", icon: "cloud_upload",   label: "Media Storage",    ok: cloud, group: "Core"     },
    { key: "store",      icon: "storefront",     label: "General Store",    ok: true,  group: "Core"     },
    { key: "facebook",   icon: "public",         label: "Meta / Facebook",  ok: false, group: "Channels" },
    { key: "twitter",    icon: "alternate_email",label: "X (Twitter)",      ok: false, group: "Channels" },
    { key: "whatsapp",   icon: "chat_bubble",    label: "WhatsApp",         ok: false, group: "Channels" },
  ];

  return (
    <AdminLayout sidebar="main">
      <div className="p-8 bg-[#f8f9ff] min-h-screen">

        {/* Header */}
        <div className="mb-10">
          <p className="text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-2">Admin</p>
          <h1 className="text-[48px] font-serif font-bold leading-tight text-black">Settings</h1>
          <p className="text-sm font-[Manrope] text-[#45464d] mt-1">Configure integrations and preferences. All values are stored securely in your database.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">

          {/* Sidebar nav */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-3 flex flex-col gap-1">
              {["Core", "Channels"].map(group => (
                <div key={group}>
                  <p className="text-[9px] font-[Manrope] font-bold uppercase tracking-widest text-[#c6c6cd] px-4 pt-3 pb-1">{group}</p>
                  {sections.filter(s => s.group === group).map(s => (
                    <button key={s.key} onClick={() => setActiveSection(s.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left ${
                        activeSection === s.key
                          ? "bg-black text-white"
                          : "text-[#45464d] hover:bg-[#f8f9ff]"
                      }`}>
                      <span className="material-symbols-outlined text-lg shrink-0">{s.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-[Manrope] font-bold">{s.label}</p>
                      </div>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${s.ok ? "bg-[#006c49]" : "bg-[#c6c6cd]"}`} />
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-4 p-4 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-3">Storage</p>
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#006c49] text-base mt-0.5 shrink-0">database</span>
                <p className="text-[11px] font-[Manrope] text-[#45464d] leading-relaxed">
                  All credentials are saved directly to your database — no environment variables needed.
                </p>
              </div>
            </div>
          </div>

          {/* Main panel */}
          <div className="col-span-12 lg:col-span-9">

            {isLoading ? (
              <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] flex items-center justify-center py-32 gap-3 text-[#7c839b]">
                <span className="material-symbols-outlined animate-spin text-2xl">autorenew</span>
                <span className="font-[Manrope] text-sm">Loading settings…</span>
              </div>
            ) : (

              <>
                {/* ── Email / SMTP ── */}
                {activeSection === "email" && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                      <div className="px-8 py-6 border-b border-[#e5eeff] flex items-center justify-between">
                        <div>
                          <h2 className="text-[24px] font-serif font-semibold text-black">Email Provider</h2>
                          <p className="text-xs font-[Manrope] text-[#7c839b] mt-0.5">Used for admin OTP sign-in and newsletter campaigns.</p>
                        </div>
                        <StatusBadge ok={smtp} label="" />
                      </div>

                      <div className="p-8 space-y-6">
                        {/* Provider picker */}
                        <div>
                          <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-3">Provider Preset</label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(SMTP_PRESETS).map(([key, p]) => (
                              <button key={key} type="button" onClick={() => applyPreset(key)}
                                className={`px-4 py-2.5 rounded-lg border text-xs font-[Manrope] font-bold transition-all text-left ${
                                  smtpProvider === key
                                    ? "border-black bg-black text-white"
                                    : "border-[#c6c6cd] text-[#45464d] hover:border-black hover:bg-[#f8f9ff]"
                                }`}>
                                {p.label}
                              </button>
                            ))}
                          </div>
                          {smtpProvider === "gmail" && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                              <span className="material-symbols-outlined text-blue-500 text-base mt-0.5 shrink-0">info</span>
                              <p className="text-[11px] font-[Manrope] text-blue-700">
                                Gmail requires an <strong>App Password</strong>, not your regular password.
                                Go to <code className="bg-blue-100 px-1 rounded">myaccount.google.com/apppasswords</code> to generate one.
                              </p>
                            </div>
                          )}
                          {smtpProvider === "sendgrid" && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
                              <span className="material-symbols-outlined text-blue-500 text-base mt-0.5 shrink-0">info</span>
                              <p className="text-[11px] font-[Manrope] text-blue-700">
                                Use <code className="bg-blue-100 px-1 rounded">apikey</code> as the username and your SendGrid API key as the password.
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <Field label="SMTP Host" value={smtpHost} onChange={setSmtpHost}
                            placeholder="e.g. smtp.gmail.com" />
                          <Field label="SMTP Port" value={smtpPort} onChange={setSmtpPort}
                            placeholder="587" hint="Use 587 (TLS) or 465 (SSL)" />
                          <Field label="Username / Login Email" value={smtpUser} onChange={setSmtpUser}
                            placeholder="you@example.com" />
                          <Field label="Password / API Key" value={smtpPass} onChange={setSmtpPass}
                            placeholder="••••••••" masked
                            onReveal={() => setSmtpPass("")}
                          />
                          <div className="sm:col-span-2">
                            <Field label='From address (shown to recipients)'
                              value={smtpFrom} onChange={setSmtpFrom}
                              placeholder="Luxe Boutique <hello@yourdomain.com>"
                              hint='Defaults to "Luxe Boutique <username>" if left blank.' />
                          </div>
                        </div>

                        {testEmailResult && (
                          <div className={`p-4 rounded-lg flex items-center gap-3 ${
                            testEmailResult.ok ? "bg-[#e6f7f1] text-[#006c49]" : "bg-[#ffdad6] text-[#ba1a1a]"
                          }`}>
                            <span className="material-symbols-outlined text-lg">
                              {testEmailResult.ok ? "check_circle" : "error"}
                            </span>
                            <p className="text-sm font-[Manrope] font-bold">{testEmailResult.msg}</p>
                          </div>
                        )}
                      </div>

                      <div className="px-8 py-5 border-t border-[#e5eeff] bg-[#f8f9ff] flex items-center justify-between gap-4">
                        <button onClick={testEmail}
                          className="px-5 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-white transition-all rounded-lg flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">send</span>
                          Send Test Email
                        </button>
                        <button onClick={saveEmail} disabled={saveMutation.isPending}
                          className="px-8 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow disabled:opacity-60 flex items-center gap-2">
                          {saveMutation.isPending
                            ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Saving…</>
                            : savedSection === "email"
                              ? <><span className="material-symbols-outlined text-sm">check</span> Saved!</>
                              : "Save Changes"
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Cloudinary ── */}
                {activeSection === "cloudinary" && (
                  <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                      <div className="px-8 py-6 border-b border-[#e5eeff] flex items-center justify-between">
                        <div>
                          <h2 className="text-[24px] font-serif font-semibold text-black">Media Storage</h2>
                          <p className="text-xs font-[Manrope] text-[#7c839b] mt-0.5">Cloudinary powers image uploads for products and blog posts.</p>
                        </div>
                        <StatusBadge ok={cloud} label="" />
                      </div>

                      <div className="p-8 space-y-6">
                        <div className="p-4 bg-[#eff4ff] rounded-xl flex items-start gap-3">
                          <span className="material-symbols-outlined text-[#006c49] text-lg mt-0.5 shrink-0">info</span>
                          <div className="text-[12px] font-[Manrope] text-[#45464d] leading-relaxed space-y-1">
                            <p>Find these values at <strong>cloudinary.com → Dashboard → API Keys</strong>.</p>
                            <p>A free account gives you 25 GB storage and 25 GB bandwidth per month — plenty for a boutique store.</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                          <div className="sm:col-span-2">
                            <Field label="Cloud Name" value={cloudName} onChange={setCloudName}
                              placeholder="e.g. my-boutique" hint="Your unique Cloudinary subdomain." />
                          </div>
                          <Field label="API Key" value={cloudApiKey} onChange={setCloudApiKey}
                            placeholder="123456789012345" masked onReveal={() => setCloudApiKey("")} />
                          <Field label="API Secret" value={cloudSecret} onChange={setCloudSecret}
                            placeholder="••••••••••••" masked onReveal={() => setCloudSecret("")} />
                          <div className="sm:col-span-2">
                            <Field label="Upload Preset (optional)" value={cloudPreset} onChange={setCloudPreset}
                              placeholder="ml_default"
                              hint="Leave blank to use unsigned uploads. Create a preset in Cloudinary → Settings → Upload." />
                          </div>
                        </div>

                        {testCloudResult && (
                          <div className={`p-4 rounded-lg flex items-center gap-3 ${
                            testCloudResult.ok ? "bg-[#e6f7f1] text-[#006c49]" : "bg-[#ffdad6] text-[#ba1a1a]"
                          }`}>
                            <span className="material-symbols-outlined text-lg">
                              {testCloudResult.ok ? "check_circle" : "error"}
                            </span>
                            <p className="text-sm font-[Manrope] font-bold">{testCloudResult.msg}</p>
                          </div>
                        )}
                      </div>

                      <div className="px-8 py-5 border-t border-[#e5eeff] bg-[#f8f9ff] flex items-center justify-between gap-4">
                        <button onClick={testCloudinary}
                          className="px-5 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-white transition-all rounded-lg flex items-center gap-2">
                          <span className="material-symbols-outlined text-sm">cloud_done</span>
                          Verify Connection
                        </button>
                        <button onClick={saveCloudinary} disabled={saveMutation.isPending}
                          className="px-8 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow disabled:opacity-60 flex items-center gap-2">
                          {saveMutation.isPending
                            ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Saving…</>
                            : savedSection === "cloudinary"
                              ? <><span className="material-symbols-outlined text-sm">check</span> Saved!</>
                              : "Save Changes"
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── General Store ── */}
                {activeSection === "store" && (
                  <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                    <div className="px-8 py-6 border-b border-[#e5eeff]">
                      <h2 className="text-[24px] font-serif font-semibold text-black">General Store</h2>
                      <p className="text-xs font-[Manrope] text-[#7c839b] mt-0.5">Basic information shown across your store and emails.</p>
                    </div>

                    <div className="p-8 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <Field label="Store Name" value={storeName} onChange={setStoreName} placeholder="Luxe Boutique" />
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Contact / Reply-To Email" value={storeEmail} onChange={setStoreEmail}
                            placeholder="hello@yourdomain.com" hint="Shown in footers and support replies." />
                        </div>
                        <div>
                          <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-2">Currency</label>
                          <select value={storeCurrency} onChange={e => setStoreCurrency(e.target.value)}
                            className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none focus:border-black transition-colors">
                            {["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD", "NGN", "GHS", "KES", "ZAR"].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-2">Timezone</label>
                          <select value={storeTimezone} onChange={e => setStoreTimezone(e.target.value)}
                            className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none focus:border-black transition-colors">
                            {[
                              "UTC", "America/New_York", "America/Chicago", "America/Denver",
                              "America/Los_Angeles", "Europe/London", "Europe/Paris", "Europe/Berlin",
                              "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo",
                              "Africa/Lagos", "Africa/Nairobi", "Africa/Johannesburg", "Australia/Sydney",
                            ].map(tz => <option key={tz} value={tz}>{tz}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="px-8 py-5 border-t border-[#e5eeff] bg-[#f8f9ff] flex justify-end">
                      <button onClick={saveStore} disabled={saveMutation.isPending}
                        className="px-8 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow disabled:opacity-60 flex items-center gap-2">
                        {saveMutation.isPending
                          ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Saving…</>
                          : savedSection === "store"
                            ? <><span className="material-symbols-outlined text-sm">check</span> Saved!</>
                            : "Save Changes"
                        }
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Meta / Facebook ── */}
                {activeSection === "facebook" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#eff4ff] rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#006c49]">info</span>
                        <p className="text-xs font-[Manrope] text-[#45464d]">
                          These credentials are also used by the <strong>Meta & Facebook Manager</strong> channel page.
                        </p>
                      </div>
                      <Link href="/admin/channels/facebook">
                        <button className="shrink-0 px-4 py-1.5 border border-[#c6c6cd] font-[Manrope] font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-white transition-all">
                          Open Channel →
                        </button>
                      </Link>
                    </div>
                    <ChannelCredsPanel
                      channel="facebook"
                      icon="public"
                      title="Meta / Facebook"
                      description="Page posts, Pixel events, catalog sync, and ad attribution."
                      savedSection={savedSection}
                      onSaved={() => {}}
                      fields={[
                        { key: "catalog_id",        label: "Commerce Catalog ID",  isSecret: false, hint: "Facebook Commerce Manager → Catalog → Settings → Catalog ID." },
                        { key: "app_id",             label: "App ID",               isSecret: false, hint: "Meta for Developers → App Dashboard → App ID." },
                        { key: "app_secret",         label: "App Secret",           isSecret: true,  hint: "App Dashboard → Settings → Basic → App Secret." },
                        { key: "page_access_token",  label: "Page Access Token",    isSecret: true,  hint: "Graph API Explorer → generate a long-lived page token for your Page." },
                        { key: "pixel_id",           label: "Pixel ID",             isSecret: false, hint: "Events Manager → Data Sources → your Pixel → Pixel ID." },
                        { key: "ad_account_id",      label: "Ad Account ID",        isSecret: false, hint: "Meta Business Manager → Ad Accounts (format: act_XXXXXXXXX)." },
                      ]}
                      docsSteps={[
                        { step: "1", title: "Create a Meta App", body: "Go to developers.facebook.com → My Apps → Create App. Choose Business type." },
                        { step: "2", title: "Add Facebook Login & Commerce", body: "Add the Commerce and Pixel products to your app to unlock catalog and ad APIs." },
                        { step: "3", title: "Generate a Page Token", body: "Use Graph API Explorer → select your page → generate a long-lived token with pages_manage_posts permission." },
                        { step: "4", title: "Get your Pixel & Catalog IDs", body: "Events Manager (pixel) and Commerce Manager (catalog) both show their IDs in the Settings tab." },
                      ]}
                    />
                  </div>
                )}

                {/* ── X (Twitter) ── */}
                {activeSection === "twitter" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#eff4ff] rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#006c49]">info</span>
                        <p className="text-xs font-[Manrope] text-[#45464d]">
                          These credentials are also used by the <strong>X (Twitter) Settings</strong> channel page.
                        </p>
                      </div>
                      <Link href="/admin/channels/twitter">
                        <button className="shrink-0 px-4 py-1.5 border border-[#c6c6cd] font-[Manrope] font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-white transition-all">
                          Open Channel →
                        </button>
                      </Link>
                    </div>
                    <ChannelCredsPanel
                      channel="twitter"
                      icon="alternate_email"
                      title="X (Twitter)"
                      description="Tweet scheduling, auto-post rules, and product drop announcements."
                      savedSection={savedSection}
                      onSaved={() => {}}
                      fields={[
                        { key: "api_key",             label: "API Key (Consumer Key)",       isSecret: false, hint: "developer.x.com → Your App → Keys & Tokens → API Key." },
                        { key: "api_secret",          label: "API Secret (Consumer Secret)", isSecret: true,  hint: "developer.x.com → Your App → Keys & Tokens → API Secret." },
                        { key: "bearer_token",        label: "Bearer Token",                 isSecret: true,  hint: "Used for App-only read-only API v2 access." },
                        { key: "access_token",        label: "Access Token",                 isSecret: false, hint: "Authorises API calls on behalf of your @luxeboutique X account." },
                        { key: "access_token_secret", label: "Access Token Secret",          isSecret: true,  hint: "Paired with the Access Token. Regenerate if compromised." },
                      ]}
                      docsSteps={[
                        { step: "1", title: "Apply for Elevated Access", body: "developer.x.com → Products → Twitter API v2 → apply for Elevated to unlock write permissions." },
                        { step: "2", title: "Create a Project & App", body: "Developer Portal → Projects → New Project → New App. This generates your API Key and Secret." },
                        { step: "3", title: "Enable OAuth 1.0a", body: "App Settings → User authentication settings → enable OAuth 1.0a with Read and Write permissions." },
                        { step: "4", title: "Generate Access Tokens", body: "Keys & Tokens tab → Access Token and Secret → Generate. These authorise posting as your account." },
                      ]}
                    />
                  </div>
                )}

                {/* ── WhatsApp ── */}
                {activeSection === "whatsapp" && (
                  <div className="space-y-4">
                    <div className="p-4 bg-[#eff4ff] rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#006c49]">info</span>
                        <p className="text-xs font-[Manrope] text-[#45464d]">
                          These credentials are also used by the <strong>WhatsApp API Console</strong> channel page.
                        </p>
                      </div>
                      <Link href="/admin/channels/whatsapp">
                        <button className="shrink-0 px-4 py-1.5 border border-[#c6c6cd] font-[Manrope] font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-white transition-all">
                          Open Channel →
                        </button>
                      </Link>
                    </div>
                    <ChannelCredsPanel
                      channel="whatsapp"
                      icon="chat_bubble"
                      title="WhatsApp Cloud API"
                      description="Message templates, automated journeys, and subscriber opt-in flows."
                      savedSection={savedSection}
                      onSaved={() => {}}
                      fields={[
                        { key: "phone_number_id",     label: "Cloud API Phone Number ID",    isSecret: false, hint: "WhatsApp Business Platform → Phone Numbers → Phone Number ID." },
                        { key: "waba_id",             label: "WhatsApp Business Account ID", isSecret: false, hint: "Meta Business Manager → WhatsApp Accounts → Account ID." },
                        { key: "system_access_token", label: "System Access Token",          isSecret: true,  hint: "Meta Business Manager → System Users → Generate Token (never-expiring recommended)." },
                        { key: "webhook_verify_token",label: "Webhook Verify Token",         isSecret: true,  hint: "A secret string you choose — enter the same value in the Meta webhook configuration." },
                      ]}
                      docsSteps={[
                        { step: "1", title: "Create a Meta App", body: "developers.facebook.com → My Apps → Create App → Business type → Add WhatsApp product." },
                        { step: "2", title: "Add WhatsApp Product", body: "App Dashboard → Add Product → WhatsApp. This generates your Phone Number ID and WABA ID." },
                        { step: "3", title: "Generate System Token", body: "Meta Business Manager → System Users → Add → assign WhatsApp permissions → Generate Token. Select Never for expiry." },
                        { step: "4", title: "Configure Webhook", body: "Enter your Webhook Verify Token here and paste the same value in the Meta webhook configuration panel." },
                      ]}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
