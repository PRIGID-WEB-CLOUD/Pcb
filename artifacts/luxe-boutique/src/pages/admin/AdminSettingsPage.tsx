import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type SettingsData = {
  settings: Record<string, string>;
  status: { smtpConfigured: boolean; cloudinaryConfigured: boolean };
};

type Section = "email" | "cloudinary" | "store";

const MASK = "●●●●●●●●●●●●";

const SMTP_PRESETS: Record<string, { host: string; port: string; label: string }> = {
  gmail:    { host: "smtp.gmail.com",       port: "587", label: "Gmail"         },
  sendgrid: { host: "smtp.sendgrid.net",    port: "587", label: "SendGrid"      },
  mailgun:  { host: "smtp.mailgun.org",     port: "587", label: "Mailgun"       },
  brevo:    { host: "smtp-relay.brevo.com", port: "587", label: "Brevo"         },
  custom:   { host: "",                     port: "587", label: "Custom / Other" },
};

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

  const sections: { key: Section; icon: string; label: string; ok: boolean }[] = [
    { key: "email",      icon: "mail",          label: "Email / SMTP",     ok: smtp  },
    { key: "cloudinary", icon: "cloud_upload",   label: "Media Storage",    ok: cloud },
    { key: "store",      icon: "storefront",     label: "General Store",    ok: true  },
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
              {sections.map(s => (
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
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
