import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type SettingsData = {
  settings: Record<string, string>;
  status: { smtpConfigured: boolean; cloudinaryConfigured: boolean };
};

type Section = "email" | "cloudinary" | "store" | "facebook" | "twitter" | "whatsapp" | "apikeys" | "payments";

type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  createdBy: string | null;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

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

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ApiKeysPanel() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName,    setNewName]    = useState("");
  const [newKey,     setNewKey]     = useState<string | null>(null);
  const [newId,      setNewId]      = useState<string | null>(null);
  const [copied,     setCopied]     = useState(false);
  const [revokeId,   setRevokeId]   = useState<string | null>(null);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);
  const [createErr,  setCreateErr]  = useState<string | null>(null);
  const [toast,      setToast]      = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3200); };

  const { data: keys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const r = await fetch("/api/apikeys");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/apikeys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Failed"); }
      return r.json() as Promise<ApiKey & { rawKey: string }>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setNewKey(data.rawKey);
      setNewId(data.id);
      setNewName("");
      setCreateErr(null);
    },
    onError: (e: Error) => setCreateErr(e.message),
  });

  const revokeMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/apikeys/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setRevokeId(null);
      showToast("API key revoked.");
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/apikeys/${id}/permanent`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["api-keys"] });
      setDeleteId(null);
      showToast("API key permanently deleted.");
    },
  });

  const copyKey = async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const active  = keys.filter(k => !k.revokedAt).length;
  const revoked = keys.filter(k => !!k.revokedAt).length;

  // suppress unused warning
  void newId;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-black text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 font-[Manrope] text-sm font-bold animate-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>
          {toast}
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
        <div className="px-8 py-6 border-b border-[#e5eeff] flex items-center justify-between">
          <div>
            <h2 className="text-[24px] font-serif font-semibold text-black">API Keys</h2>
            <p className="text-xs font-[Manrope] text-[#7c839b] mt-0.5">
              Issue keys for programmatic access to the Luxe Boutique API. Revoke any key instantly.
            </p>
          </div>
          <button
            onClick={() => { setShowCreate(true); setNewKey(null); setCreateErr(null); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow">
            <span className="material-symbols-outlined text-sm">add</span>
            New Key
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-[#f0f2ff] border-b border-[#e5eeff]">
          {[
            { label: "Total",   value: keys.length, icon: "key",          color: "text-black"     },
            { label: "Active",  value: active,       icon: "check_circle", color: "text-[#006c49]" },
            { label: "Revoked", value: revoked,      icon: "block",        color: "text-red-500"   },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-3 px-8 py-4">
              <span className={`material-symbols-outlined text-xl ${s.color}`}>{s.icon}</span>
              <div>
                <p className="text-[22px] font-serif font-bold text-black leading-none">{s.value}</p>
                <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Keys table */}
        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-3 text-[#7c839b] font-[Manrope]">
            <span className="material-symbols-outlined animate-spin">autorenew</span> Loading…
          </div>
        ) : keys.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-14 h-14 bg-[#f0f2ff] rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl text-[#7c839b]">key_off</span>
            </div>
            <div>
              <p className="font-serif text-[18px] font-semibold mb-1">No API keys yet</p>
              <p className="text-sm font-[Manrope] text-[#7c839b]">Create your first key to enable programmatic access.</p>
            </div>
            <button onClick={() => { setShowCreate(true); setNewKey(null); }}
              className="px-5 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span>
              Create First Key
            </button>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-8 py-3 bg-[#f8f9ff] border-b border-[#f0f2ff]">
              <div className="col-span-3  text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Name</div>
              <div className="col-span-3  text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Key Prefix</div>
              <div className="col-span-2  text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Status</div>
              <div className="col-span-2  text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Created</div>
              <div className="col-span-2  text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Actions</div>
            </div>
            <div className="divide-y divide-[#f0f2ff]">
              {keys.map(k => {
                const isRevoked = !!k.revokedAt;
                return (
                  <div key={k.id} className={`grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-[#fafbff] transition-colors ${isRevoked ? "opacity-55" : ""}`}>
                    {/* Name */}
                    <div className="col-span-3">
                      <p className="font-[Manrope] font-bold text-sm text-black truncate">{k.name}</p>
                      {k.createdBy && <p className="text-[10px] font-[Manrope] text-[#c6c6cd] mt-0.5">by {k.createdBy}</p>}
                    </div>
                    {/* Prefix */}
                    <div className="col-span-3">
                      <code className="text-xs font-mono bg-[#f0f2ff] px-2 py-1 rounded-md text-[#45464d]">
                        {k.keyPrefix}••••••••••••••••••••••••••••••••••••••••
                      </code>
                    </div>
                    {/* Status */}
                    <div className="col-span-2">
                      {isRevoked ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-[Manrope] font-bold bg-[#ffdad6] text-red-700">
                          <span className="material-symbols-outlined text-[11px]">block</span>
                          Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-[Manrope] font-bold bg-[#e6f7f1] text-[#006c49]">
                          <span className="material-symbols-outlined text-[11px]">check_circle</span>
                          Active
                        </span>
                      )}
                    </div>
                    {/* Created */}
                    <div className="col-span-2">
                      <p className="text-xs font-[Manrope] text-[#7c839b]">{timeAgo(k.createdAt)}</p>
                      {k.lastUsedAt
                        ? <p className="text-[10px] font-[Manrope] text-[#c6c6cd] mt-0.5">Used {timeAgo(k.lastUsedAt)}</p>
                        : <p className="text-[10px] font-[Manrope] text-[#c6c6cd] mt-0.5">Never used</p>
                      }
                    </div>
                    {/* Actions */}
                    <div className="col-span-2 flex items-center gap-1">
                      {!isRevoked ? (
                        <button onClick={() => setRevokeId(k.id)}
                          title="Revoke key"
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-[Manrope] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all">
                          <span className="material-symbols-outlined text-[12px]">block</span>
                          Revoke
                        </button>
                      ) : (
                        <button onClick={() => setDeleteId(k.id)}
                          title="Delete permanently"
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-[#c6c6cd] text-[#7c839b] hover:bg-[#f0f2ff] font-[Manrope] font-bold text-[10px] uppercase tracking-widest rounded-lg transition-all">
                          <span className="material-symbols-outlined text-[12px]">delete</span>
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Security note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5 shrink-0">shield</span>
        <div>
          <p className="text-xs font-[Manrope] font-bold text-amber-800 mb-1">Security notice</p>
          <p className="text-[11px] font-[Manrope] text-amber-700 leading-relaxed">
            API keys grant full read/write access to the Luxe Boutique API. Never commit keys to source code or share them publicly.
            Revoke immediately if a key is suspected to be compromised — revocation takes effect instantly.
          </p>
        </div>
      </div>

      {/* ── Create Key Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.2)] w-full max-w-md overflow-hidden">
            <div className="px-7 py-5 border-b border-[#e5eeff] flex items-center justify-between">
              <h2 className="font-serif text-[20px] font-semibold">
                {newKey ? "Key Created" : "New API Key"}
              </h2>
              <button onClick={() => { setShowCreate(false); setNewKey(null); setCreateErr(null); qc.invalidateQueries({ queryKey: ["api-keys"] }); }}
                className="w-8 h-8 rounded-full hover:bg-[#f0f2ff] flex items-center justify-center text-[#7c839b] hover:text-black transition-colors">
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {newKey ? (
              <div className="p-7 space-y-5">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-base mt-0.5 shrink-0">warning</span>
                  <p className="text-[11px] font-[Manrope] text-amber-800 leading-relaxed">
                    <strong>Copy this key now.</strong> It will never be shown again after you close this dialog.
                  </p>
                </div>
                <div className="bg-[#f8f9ff] border border-[#e5eeff] rounded-xl p-4">
                  <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-2">Your API Key</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-[#006c49] break-all leading-relaxed">{newKey}</code>
                    <button onClick={copyKey}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-[Manrope] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${
                        copied ? "bg-[#006c49] text-white" : "border border-[#c6c6cd] hover:bg-[#f0f2ff]"
                      }`}>
                      <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => { setShowCreate(false); setNewKey(null); qc.invalidateQueries({ queryKey: ["api-keys"] }); }}
                  className="w-full py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#006c49] transition-all">
                  Done — I've saved my key
                </button>
              </div>
            ) : (
              <div className="p-7 space-y-5">
                <div>
                  <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-2">
                    Key Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Webhook Integration, Mobile App…"
                    className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none focus:border-black transition-colors"
                    onKeyDown={e => e.key === "Enter" && newName.trim() && createMut.mutate()}
                  />
                  <p className="mt-1.5 text-[11px] font-[Manrope] text-[#7c839b]">
                    Give it a name that describes where it will be used.
                  </p>
                </div>
                {createErr && (
                  <div className="p-3 bg-[#ffdad6] rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-red-600 text-sm">error</span>
                    <p className="text-xs font-[Manrope] text-red-700 font-bold">{createErr}</p>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => { setShowCreate(false); setCreateErr(null); }}
                    className="flex-1 py-2.5 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#f0f2ff] transition-all">
                    Cancel
                  </button>
                  <button onClick={() => createMut.mutate()} disabled={!newName.trim() || createMut.isPending}
                    className="flex-1 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#006c49] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {createMut.isPending
                      ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Generating…</>
                      : <><span className="material-symbols-outlined text-sm">key</span> Generate Key</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Revoke Confirm ── */}
      {revokeId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.2)] w-full max-w-sm p-7 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-red-500">block</span>
              </div>
              <div>
                <p className="font-serif text-[18px] font-semibold mb-1">Revoke this key?</p>
                <p className="text-sm font-[Manrope] text-[#7c839b] leading-relaxed">
                  Any system using this key will immediately lose access. This cannot be undone — you would need to create a new key.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setRevokeId(null)}
                className="flex-1 py-2.5 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#f0f2ff] transition-all">
                Cancel
              </button>
              <button onClick={() => revokeMut.mutate(revokeId!)} disabled={revokeMut.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {revokeMut.isPending
                  ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Revoking…</>
                  : "Revoke Key"
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Permanent Delete Confirm ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.2)] w-full max-w-sm p-7 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl text-red-500">delete_forever</span>
              </div>
              <div>
                <p className="font-serif text-[18px] font-semibold mb-1">Delete permanently?</p>
                <p className="text-sm font-[Manrope] text-[#7c839b] leading-relaxed">
                  This revoked key and all its records will be permanently removed from the database.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#f0f2ff] transition-all">
                Cancel
              </button>
              <button onClick={() => deleteMut.mutate(deleteId!)} disabled={deleteMut.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {deleteMut.isPending
                  ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Deleting…</>
                  : "Delete Forever"
                }
              </button>
            </div>
          </div>
        </div>
      )}
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

  // Payment gateway keys
  const [paystackPublicKey,      setPaystackPublicKey]      = useState("");
  const [paystackSecretKey,      setPaystackSecretKey]      = useState("");
  const [flutterwavePublicKey,   setFlutterwavePublicKey]   = useState("");
  const [flutterwaveSecretKey,   setFlutterwaveSecretKey]   = useState("");

  const [testEmailResult,    setTestEmailResult]    = useState<{ ok: boolean; msg: string } | null>(null);
  const [testCloudResult,    setTestCloudResult]    = useState<{ ok: boolean; msg: string } | null>(null);
  const [savedSection,       setSavedSection]       = useState<Section | null>(null);
  const pendingSectionRef = useRef<Section | null>(null);

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
    setPaystackPublicKey(s.paystack_public_key      ?? "");
    setPaystackSecretKey(s.paystack_secret_key      ?? "");
    setFlutterwavePublicKey(s.flutterwave_public_key  ?? "");
    setFlutterwaveSecretKey(s.flutterwave_secret_key  ?? "");

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
    onSuccess: () => {
      setSavedSection(pendingSectionRef.current);
      setTimeout(() => setSavedSection(null), 3000);
      refetch();
    },
  });

  const saveEmail = () => {
    pendingSectionRef.current = "email";
    saveMutation.mutate({
      smtp_host: smtpHost, smtp_port: smtpPort,
      smtp_user: smtpUser, smtp_pass: smtpPass, smtp_from: smtpFrom,
    });
    setTestEmailResult(null);
  };

  const saveCloudinary = () => {
    pendingSectionRef.current = "cloudinary";
    saveMutation.mutate({
      cloudinary_cloud_name: cloudName, cloudinary_api_key: cloudApiKey,
      cloudinary_api_secret: cloudSecret, cloudinary_upload_preset: cloudPreset,
    });
    setTestCloudResult(null);
  };

  const saveStore = () => {
    pendingSectionRef.current = "store";
    saveMutation.mutate({
      store_name: storeName, store_email: storeEmail,
      store_currency: storeCurrency, store_timezone: storeTimezone,
    });
  };

  const savePayments = () => {
    pendingSectionRef.current = "payments";
    saveMutation.mutate({
      paystack_public_key:     paystackPublicKey,
      paystack_secret_key:     paystackSecretKey,
      flutterwave_public_key:  flutterwavePublicKey,
      flutterwave_secret_key:  flutterwaveSecretKey,
    });
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

  const smtp  = data?.status.smtpConfigured ?? false;
  const cloud = data?.status.cloudinaryConfigured ?? false;

  const paystackConfigured     = !!(data?.settings.paystack_secret_key && data?.settings.paystack_public_key);
  const flutterwaveConfigured  = !!(data?.settings.flutterwave_secret_key && data?.settings.flutterwave_public_key);
  const paymentsConfigured     = paystackConfigured || flutterwaveConfigured;

  const sections: { key: Section; icon: string; label: string; ok: boolean; group?: string }[] = [
    { key: "email",      icon: "mail",          label: "Email / SMTP",     ok: smtp,              group: "Core"     },
    { key: "cloudinary", icon: "cloud_upload",   label: "Media Storage",    ok: cloud,             group: "Core"     },
    { key: "store",      icon: "storefront",     label: "General Store",    ok: true,              group: "Core"     },
    { key: "payments",   icon: "credit_card",    label: "Payments",         ok: paymentsConfigured, group: "Core"    },
    { key: "facebook",   icon: "public",         label: "Meta / Facebook",  ok: false,             group: "Channels" },
    { key: "twitter",    icon: "alternate_email",label: "X (Twitter)",      ok: false,             group: "Channels" },
    { key: "whatsapp",   icon: "chat_bubble",    label: "WhatsApp",         ok: false,             group: "Channels" },
    { key: "apikeys",    icon: "key",            label: "API Keys",         ok: true,              group: "Security" },
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
              {["Core", "Channels", "Security"].map(group => (
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
                          {smtpProvider === "brevo" && (
                            <div className="mt-3 p-3 bg-violet-50 border border-violet-200 rounded-lg flex items-start gap-2">
                              <span className="material-symbols-outlined text-violet-500 text-base mt-0.5 shrink-0">info</span>
                              <div className="text-[11px] font-[Manrope] text-violet-800 space-y-1.5 leading-relaxed">
                                <p>
                                  <strong>Username</strong> — your Brevo account login email (e.g. <code className="bg-violet-100 px-1 rounded">you@company.com</code>).
                                </p>
                                <p>
                                  <strong>Password</strong> — <em>not</em> your Brevo account password. You need an <strong>SMTP key</strong>:
                                </p>
                                <ol className="list-decimal ml-4 space-y-0.5">
                                  <li>Log in to Brevo → click your name (top-right) → <strong>SMTP &amp; API</strong></li>
                                  <li>Open the <strong>SMTP</strong> tab</li>
                                  <li>Click <strong>Generate a new SMTP key</strong> → copy it and paste below</li>
                                </ol>
                                <p className="text-violet-600">If you see "535 Authentication failed", this is almost always the cause.</p>
                              </div>
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
                  <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                    <div className="px-8 py-6 border-b border-[#e5eeff] flex items-center justify-between">
                      <div>
                        <h2 className="text-[24px] font-serif font-semibold text-black">Media Storage</h2>
                        <p className="text-xs font-[Manrope] text-[#7c839b] mt-0.5">Cloudinary is used to host product images, banners, and all media assets.</p>
                      </div>
                      <StatusBadge ok={cloud} label="" />
                    </div>

                    <div className="p-8 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                          <Field label="Cloud Name" value={cloudName} onChange={setCloudName} placeholder="my-cloud-name" />
                        </div>
                        <Field label="API Key" value={cloudApiKey} onChange={setCloudApiKey}
                          placeholder="123456789012345" />
                        <Field label="API Secret" value={cloudSecret} onChange={setCloudSecret}
                          placeholder="••••••••" masked onReveal={() => setCloudSecret("")} />
                        <div className="sm:col-span-2">
                          <Field label="Upload Preset (optional)" value={cloudPreset} onChange={setCloudPreset}
                            placeholder="luxe_products"
                            hint="Create an unsigned upload preset in Cloudinary Settings → Upload → Upload presets." />
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
                        <span className="material-symbols-outlined text-sm">wifi_tethering</span>
                        Test Connection
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

                {/* ── Payments ── */}
                {activeSection === "payments" && (
                  <div className="space-y-6">
                    {/* Status banner */}
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { label: "Paystack",     ok: paystackConfigured,    icon: "credit_card" },
                        { label: "Flutterwave",  ok: flutterwaveConfigured, icon: "payments"    },
                      ].map(p => (
                        <div key={p.label} className={`rounded-xl border p-4 flex items-center gap-3 ${
                          p.ok ? "border-[#006c49]/20 bg-[#e6f7f1]" : "border-[#e5eeff] bg-white"
                        }`}>
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                            p.ok ? "bg-[#006c49]" : "bg-[#f0f2ff]"
                          }`}>
                            <span className={`material-symbols-outlined text-lg ${p.ok ? "text-white" : "text-[#7c839b]"}`}>{p.icon}</span>
                          </div>
                          <div>
                            <p className="font-[Manrope] font-bold text-sm text-black">{p.label}</p>
                            <p className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest ${p.ok ? "text-[#006c49]" : "text-[#7c839b]"}`}>
                              {p.ok ? "Configured" : "Not configured"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Paystack */}
                    <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                      <div className="px-8 py-5 border-b border-[#e5eeff] flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#f0f2ff] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#006c49]">credit_card</span>
                        </div>
                        <div>
                          <h3 className="font-serif text-[20px] font-semibold text-black">Paystack</h3>
                          <p className="text-xs font-[Manrope] text-[#7c839b]">Accept card payments via Paystack. Get keys from your Paystack dashboard.</p>
                        </div>
                      </div>
                      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field
                          label="Public Key"
                          value={paystackPublicKey}
                          onChange={setPaystackPublicKey}
                          placeholder="pk_live_…"
                          hint="Used on the frontend to initialise the payment popup."
                        />
                        <Field
                          label="Secret Key"
                          value={paystackSecretKey}
                          onChange={setPaystackSecretKey}
                          placeholder="sk_live_…"
                          masked
                          onReveal={() => setPaystackSecretKey("")}
                          hint="Kept server-side only — never exposed to the browser."
                        />
                      </div>
                      <div className="px-8 py-4 border-t border-[#e5eeff] bg-[#f8f9ff]">
                        <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-[Manrope] font-bold text-[#006c49] hover:underline">
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Open Paystack Dashboard → Settings → API Keys &amp; Webhooks
                        </a>
                      </div>
                    </div>

                    {/* Flutterwave */}
                    <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                      <div className="px-8 py-5 border-b border-[#e5eeff] flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#f0f2ff] flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#006c49]">payments</span>
                        </div>
                        <div>
                          <h3 className="font-serif text-[20px] font-semibold text-black">Flutterwave</h3>
                          <p className="text-xs font-[Manrope] text-[#7c839b]">Accept payments via Flutterwave. Get keys from your Flutterwave dashboard.</p>
                        </div>
                      </div>
                      <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Field
                          label="Public Key"
                          value={flutterwavePublicKey}
                          onChange={setFlutterwavePublicKey}
                          placeholder="FLWPUBK_TEST-…"
                          hint="Used on the frontend to initialise the checkout."
                        />
                        <Field
                          label="Secret Key"
                          value={flutterwaveSecretKey}
                          onChange={setFlutterwaveSecretKey}
                          placeholder="FLWSECK_TEST-…"
                          masked
                          onReveal={() => setFlutterwaveSecretKey("")}
                          hint="Kept server-side only — never exposed to the browser."
                        />
                      </div>
                      <div className="px-8 py-4 border-t border-[#e5eeff] bg-[#f8f9ff]">
                        <a href="https://dashboard.flutterwave.com/dashboard/settings/apis" target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-[Manrope] font-bold text-[#006c49] hover:underline">
                          <span className="material-symbols-outlined text-sm">open_in_new</span>
                          Open Flutterwave Dashboard → Settings → API Keys
                        </a>
                      </div>
                    </div>

                    {/* Security note */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-3">
                      <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5 shrink-0">shield</span>
                      <div>
                        <p className="text-xs font-[Manrope] font-bold text-amber-800 mb-1">Keep secret keys safe</p>
                        <p className="text-[11px] font-[Manrope] text-amber-700 leading-relaxed">
                          Secret keys are stored encrypted in your database and are never returned to the browser.
                          Use test keys during development and only switch to live keys when ready to accept real payments.
                        </p>
                      </div>
                    </div>

                    {/* Save bar */}
                    <div className="flex justify-end">
                      <button onClick={savePayments} disabled={saveMutation.isPending}
                        className="px-8 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow disabled:opacity-60 flex items-center gap-2">
                        {saveMutation.isPending
                          ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Saving…</>
                          : savedSection === "payments"
                            ? <><span className="material-symbols-outlined text-sm">check</span> Saved!</>
                            : "Save Payment Keys"
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

                {/* ── API Keys ── */}
                {activeSection === "apikeys" && <ApiKeysPanel />}

              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
