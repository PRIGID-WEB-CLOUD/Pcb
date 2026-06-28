import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type Provider = {
  id: string;
  name: string;
  label: string;
  description: string;
  logoUrl: string | null;
  enabled: boolean;
  connected: boolean;
  apiKey: string | null;
  apiSecret: string | null;
  storeId: string | null;
  webhookUrl: string | null;
  lastSyncAt: string | null;
  lastError: string | null;
  updatedAt: string;
};

const PROVIDER_ICONS: Record<string, string> = {
  printful: "🖨️",
  eprolo:   "📦",
  shipbob:  "🚚",
  gooten:   "🏭",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminProvidersPage() {
  const queryClient = useQueryClient();
  const [activeProvider, setActiveProvider] = useState<Provider | null>(null);
  const [formKey, setFormKey]   = useState("");
  const [formSecret, setFormSecret] = useState("");
  const [formStore, setFormStore]   = useState("");
  const [testing, setTesting]   = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});

  const { data: providers = [], isLoading } = useQuery<Provider[]>({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const res = await fetch("/api/providers");
      if (!res.ok) throw new Error("Failed to load providers");
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ name, updates }: { name: string; updates: Record<string, unknown> }) => {
      const res = await fetch(`/api/providers/${name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    },
  });

  const toggleEnabled = (p: Provider) => {
    saveMutation.mutate({ name: p.name, updates: { enabled: !p.enabled } });
  };

  const handleConnect = async (p: Provider) => {
    setTesting(p.name);
    try {
      const res = await fetch(`/api/providers/${p.name}/connect`, { method: "POST" });
      const data = await res.json();
      setTestResult(prev => ({
        ...prev,
        [p.name]: { ok: data.connected, msg: data.connected ? "Connected successfully!" : (data.error || "Connection failed") },
      }));
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    } catch {
      setTestResult(prev => ({ ...prev, [p.name]: { ok: false, msg: "Connection test failed" } }));
    } finally {
      setTesting(null);
    }
  };

  const handleDisconnect = async (p: Provider) => {
    await fetch(`/api/providers/${p.name}/disconnect`, { method: "POST" });
    queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
    setTestResult(prev => ({ ...prev, [p.name]: { ok: false, msg: "" } }));
  };

  const handleSaveKeys = () => {
    if (!activeProvider) return;
    saveMutation.mutate({
      name: activeProvider.name,
      updates: {
        apiKey:    formKey    || null,
        apiSecret: formSecret || null,
        storeId:   formStore  || null,
      },
    });
    setActiveProvider(null);
  };

  const openConfig = (p: Provider) => {
    setActiveProvider(p);
    setFormKey(p.apiKey ?? "");
    setFormSecret(p.apiSecret ?? "");
    setFormStore(p.storeId ?? "");
  };

  const connected = providers.filter(p => p.connected).length;
  const enabled   = providers.filter(p => p.enabled).length;

  return (
    <AdminLayout sidebar="main">
      <div className="p-8 bg-[#f8f9ff] min-h-screen">

        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-2">Integrations</p>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-black">Providers</h1>
            <p className="text-sm font-[Manrope] text-[#45464d] mt-1">Connect fulfilment partners, drop-shipping, and print-on-demand providers.</p>
          </div>
          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="text-[32px] font-serif font-bold text-black leading-none">{connected}</p>
              <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mt-1">Connected</p>
            </div>
            <div className="w-px h-10 bg-[#e5eeff]" />
            <div>
              <p className="text-[32px] font-serif font-bold text-black leading-none">{enabled}</p>
              <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mt-1">Enabled</p>
            </div>
            <div className="w-px h-10 bg-[#e5eeff]" />
            <div>
              <p className="text-[32px] font-serif font-bold text-black leading-none">{providers.length}</p>
              <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mt-1">Available</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {providers.map(p => {
              const result = testResult[p.name];
              const isConnecting = testing === p.name;
              return (
                <div key={p.name} className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#f8f9ff] flex items-center justify-center text-2xl">
                          {p.logoUrl ? (
                            <img src={p.logoUrl} alt={p.label} className="w-8 h-8 object-contain" onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <span>{PROVIDER_ICONS[p.name] ?? "🔌"}</span>
                          )}
                        </div>
                        <div>
                          <h3 className="text-[17px] font-serif font-semibold text-black">{p.label}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-[Manrope] font-bold uppercase tracking-widest ${
                              p.connected ? "text-[#006c49] bg-[#e6f7f1]" : "text-[#7c839b] bg-[#f8f9ff]"
                            }`}>
                              <span className="material-symbols-outlined text-[12px]">{p.connected ? "check_circle" : "radio_button_unchecked"}</span>
                              {p.connected ? "Connected" : "Disconnected"}
                            </span>
                            {p.enabled && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-blue-600 bg-blue-50">
                                <span className="material-symbols-outlined text-[12px]">power</span>
                                Enabled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Enable toggle */}
                      <button
                        type="button"
                        onClick={() => toggleEnabled(p)}
                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${p.enabled ? "bg-[#006c49]" : "bg-[#c6c6cd]"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${p.enabled ? "right-0.5" : "left-0.5"}`} />
                      </button>
                    </div>

                    <p className="text-[13px] font-[Manrope] text-[#45464d] leading-relaxed mb-4">{p.description}</p>

                    {/* Result banner */}
                    {result?.msg && (
                      <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-xs font-[Manrope] font-bold ${
                        result.ok ? "bg-[#e6f7f1] text-[#006c49]" : "bg-[#ffdad6] text-[#ba1a1a]"
                      }`}>
                        <span className="material-symbols-outlined text-sm">{result.ok ? "check_circle" : "error"}</span>
                        {result.msg}
                      </div>
                    )}

                    {/* Error from last attempt */}
                    {p.lastError && !result && (
                      <div className="mb-4 p-3 rounded-lg bg-[#ffdad6] text-[#ba1a1a] text-xs font-[Manrope]">
                        Last error: {p.lastError}
                      </div>
                    )}

                    {/* Last sync */}
                    {p.lastSyncAt && (
                      <p className="text-[11px] font-[Manrope] text-[#7c839b] mb-4">
                        Last synced: {fmtDate(p.lastSyncAt)}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => openConfig(p)}
                        className="px-4 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all rounded-lg flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">settings</span>
                        Configure
                      </button>
                      {p.connected ? (
                        <>
                          <button onClick={() => handleConnect(p)} disabled={isConnecting}
                            className="px-4 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#e6f7f1] hover:text-[#006c49] hover:border-[#006c49] transition-all rounded-lg flex items-center gap-1.5 disabled:opacity-50">
                            <span className={`material-symbols-outlined text-sm ${isConnecting ? "animate-spin" : ""}`}>{isConnecting ? "autorenew" : "sync"}</span>
                            {isConnecting ? "Testing…" : "Re-test"}
                          </button>
                          <button onClick={() => handleDisconnect(p)}
                            className="px-4 py-2 border border-[#ba1a1a]/30 text-[#ba1a1a] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#ffdad6] transition-all rounded-lg flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">link_off</span>
                            Disconnect
                          </button>
                        </>
                      ) : (
                        <button onClick={() => handleConnect(p)} disabled={isConnecting || !p.apiKey}
                          className="px-4 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg flex items-center gap-1.5 disabled:opacity-40">
                          <span className={`material-symbols-outlined text-sm ${isConnecting ? "animate-spin" : ""}`}>{isConnecting ? "autorenew" : "link"}</span>
                          {isConnecting ? "Connecting…" : p.apiKey ? "Connect" : "Add API Key First"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Configure Modal */}
        {activeProvider && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-[20px] font-serif font-bold text-black">
                  Configure {activeProvider.label}
                </h3>
                <button onClick={() => setActiveProvider(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f8f9ff] transition-colors">
                  <span className="material-symbols-outlined text-[#45464d]">close</span>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-1.5">
                    API Key <span className="text-[#ba1a1a]">*</span>
                  </label>
                  <input
                    type="password"
                    className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-2.5 font-[Manrope] text-sm outline-none focus:border-black transition-colors"
                    placeholder="Enter API key…"
                    value={formKey}
                    onChange={e => setFormKey(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-1.5">
                    API Secret
                  </label>
                  <input
                    type="password"
                    className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-2.5 font-[Manrope] text-sm outline-none focus:border-black transition-colors"
                    placeholder="Enter API secret…"
                    value={formSecret}
                    onChange={e => setFormSecret(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-1.5">
                    Store ID
                  </label>
                  <input
                    className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-2.5 font-[Manrope] text-sm outline-none focus:border-black transition-colors"
                    placeholder="e.g. 12345678"
                    value={formStore}
                    onChange={e => setFormStore(e.target.value)}
                  />
                </div>
                <div className="pt-2 flex gap-3">
                  <button onClick={() => setActiveProvider(null)}
                    className="flex-1 px-6 py-3 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#f8f9ff] transition-all rounded-lg">
                    Cancel
                  </button>
                  <button onClick={handleSaveKeys} disabled={saveMutation.isPending}
                    className="flex-1 px-6 py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow disabled:opacity-50">
                    {saveMutation.isPending ? "Saving…" : "Save Keys"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
