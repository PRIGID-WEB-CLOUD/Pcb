import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ActiveTab = "catalog" | "pixel" | "audiences" | "ads";

interface Connection { id: string; connectionKey: string; active: boolean; }
interface CatalogSettings { id: string; includedCategories: string[]; minPrice: number; maxPrice: number; }
interface PixelEvent { id: string; storeEvent: string; fbEvent: string; enabled: boolean; }
interface Audience { id: string; name: string; size: string; type: string; status: string; }

const ALL_CATEGORIES = ["Ready-to-Wear", "Footwear", "Accessories", "Bags & Luggage", "Jewellery", "Outerwear", "Swimwear"];

const adRanges: Record<string, { impressions: string; ctr: string; cpc: string; roas: string }> = {
  "7":  { impressions: "620K",  ctr: "4.1%", cpc: "$0.38", roas: "4.8x" },
  "30": { impressions: "2.4M",  ctr: "3.8%", cpc: "$0.42", roas: "4.2x" },
  "90": { impressions: "6.8M",  ctr: "3.5%", cpc: "$0.47", roas: "3.9x" },
};

const audienceTypeStyle: Record<string, string> = {
  Custom:      "bg-blue-50 text-blue-700",
  Lookalike:   "bg-purple-50 text-purple-700",
  Retargeting: "bg-amber-50 text-amber-700",
};
const audienceStatusStyle: Record<string, string> = {
  Active:   "bg-[#6cf8bb] text-[#00714d]",
  Building: "bg-amber-100 text-amber-700",
  Paused:   "bg-slate-100 text-slate-500",
};

const connectionMeta: { key: string; label: string; icon: string }[] = [
  { key: "facebook",  label: "Facebook Shop",       icon: "storefront"     },
  { key: "instagram", label: "Instagram Shopping",  icon: "photo_camera"   },
  { key: "pixel",     label: "Pixel Tracking",      icon: "track_changes"  },
  { key: "messenger", label: "Messenger Bot",        icon: "chat"           },
];

export default function AdminFacebookPage() {
  const [connections, setConnections]       = useState<Connection[]>([]);
  const [catalog, setCatalog]               = useState<CatalogSettings | null>(null);
  const [pixelEvents, setPixelEvents]       = useState<PixelEvent[]>([]);
  const [audiences, setAudiences]           = useState<Audience[]>([]);
  const [loading, setLoading]               = useState(true);
  const [activeTab, setActiveTab]           = useState<ActiveTab>("catalog");
  const [syncState, setSyncState]           = useState<"idle" | "syncing" | "done">("idle");
  const [adRange, setAdRange]               = useState<"7" | "30" | "90">("30");
  const [toast, setToast]                   = useState<string | null>(null);
  const [newAudName, setNewAudName]         = useState("");
  const [newAudType, setNewAudType]         = useState("Custom");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const loadAll = useCallback(async () => {
    const [cRes, catRes, pxRes, audRes] = await Promise.all([
      fetch("/api/facebook/connections"),
      fetch("/api/facebook/catalog"),
      fetch("/api/facebook/pixel-events"),
      fetch("/api/facebook/audiences"),
    ]);
    if (cRes.ok)   setConnections(await cRes.json());
    if (catRes.ok) setCatalog(await catRes.json());
    if (pxRes.ok)  setPixelEvents(await pxRes.json());
    if (audRes.ok) setAudiences(await audRes.json());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const toggleConnection = async (connectionKey: string, active: boolean) => {
    setConnections((p) => p.map((c) => c.connectionKey === connectionKey ? { ...c, active } : c));
    await fetch(`/api/facebook/connections/${connectionKey}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    const meta = connectionMeta.find((m) => m.key === connectionKey);
    showToast(`${meta?.label} ${active ? "activated" : "paused"}.`);
  };

  const toggleCategory = async (cat: string) => {
    if (!catalog) return;
    const next = catalog.includedCategories.includes(cat)
      ? catalog.includedCategories.filter((c) => c !== cat)
      : [...catalog.includedCategories, cat];
    setCatalog((p) => p ? { ...p, includedCategories: next } : p);
    await fetch("/api/facebook/catalog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...catalog, includedCategories: next }) });
  };

  const updatePriceRange = async (min: number, max: number) => {
    if (!catalog) return;
    const updated = { ...catalog, minPrice: min, maxPrice: max };
    setCatalog(updated);
    await fetch("/api/facebook/catalog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updated) });
  };

  const runSync = () => {
    setSyncState("syncing");
    setTimeout(async () => {
      setSyncState("done");
      showToast(`Catalog sync complete — ${catalog?.includedCategories.length ?? 0} categories, ${(catalog?.includedCategories.length ?? 0) * 178} products.`);
      await fetch("/api/facebook/catalog", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(catalog) });
      setTimeout(() => setSyncState("idle"), 3000);
    }, 2500);
  };

  const togglePixelEvent = async (ev: PixelEvent) => {
    setPixelEvents((p) => p.map((e) => e.id === ev.id ? { ...e, enabled: !e.enabled } : e));
    await fetch(`/api/facebook/pixel-events/${ev.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !ev.enabled }) });
    showToast(`Pixel event "${ev.storeEvent}" ${ev.enabled ? "disabled" : "enabled"}.`);
  };

  const createAudience = async () => {
    if (!newAudName.trim()) return;
    const res = await fetch("/api/facebook/audiences", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newAudName.trim(), type: newAudType }) });
    if (res.ok) { const created = await res.json(); setAudiences((p) => [created, ...p]); setNewAudName(""); showToast(`Audience "${newAudName}" creation started.`); }
  };

  const toggleAudience = async (aud: Audience) => {
    const next = aud.status === "Active" ? "Paused" : "Active";
    setAudiences((p) => p.map((a) => a.id === aud.id ? { ...a, status: next } : a));
    await fetch(`/api/facebook/audiences/${aud.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
  };

  const deleteAudience = async (aud: Audience) => {
    setAudiences((p) => p.filter((a) => a.id !== aud.id));
    await fetch(`/api/facebook/audiences/${aud.id}`, { method: "DELETE" });
    showToast(`Audience "${aud.name}" deleted.`);
  };

  const adData = adRanges[adRange];
  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: "catalog",   label: "Catalog Rules",  icon: "database"      },
    { key: "pixel",     label: "Pixel Events",   icon: "track_changes" },
    { key: "audiences", label: "Audiences",       icon: "group"         },
    { key: "ads",       label: "Ad Performance",  icon: "bar_chart"     },
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
      <div className="p-10 max-w-[1280px] mx-auto">
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>{toast}
          </div>
        )}

        <div className="mb-10 flex justify-between items-start">
          <div>
            <Link href="/admin/channels" className="inline-flex items-center gap-1.5 text-[#7c839b] hover:text-[#006c49] transition-colors font-[Manrope] font-bold text-xs tracking-widest uppercase mb-4 no-underline">
              <span className="material-symbols-outlined text-base">arrow_back</span> Channel Hub
            </Link>
            <h2 className="text-[36px] font-serif font-bold text-[#0b1c30] mb-2">Meta Commerce Manager</h2>
            <p className="font-[Manrope] text-[16px] text-[#7c839b] max-w-2xl">Manage Facebook & Instagram shop presence, pixel events, catalog rules, and custom audiences.</p>
          </div>
          <div className="flex flex-col items-end gap-2 pt-8">
            {connectionMeta.slice(0, 2).map((item) => {
              const conn = connections.find((c) => c.connectionKey === item.key);
              return (
                <div key={item.key} className="flex items-center gap-2 text-xs font-[Manrope]">
                  <span className={`w-1.5 h-1.5 rounded-full ${conn?.active ? "bg-[#006c49]" : "bg-amber-500"}`}></span>
                  <span className="text-[#7c839b]">{item.label}</span>
                  <span className={`font-bold ${conn?.active ? "text-[#006c49]" : "text-amber-600"}`}>{conn?.active ? "Active" : "Paused"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Connection toggles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {connectionMeta.map((item) => {
            const conn = connections.find((c) => c.connectionKey === item.key);
            const active = conn?.active ?? false;
            return (
              <div key={item.key} className="bg-white p-4 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-lg ${active ? "text-[#006c49]" : "text-slate-300"}`}>{item.icon}</span>
                  <span className="font-[Manrope] font-semibold text-sm">{item.label}</span>
                </div>
                <button onClick={() => toggleConnection(item.key, !active)}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${active ? "bg-[#006c49]" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${active ? "translate-x-5" : "translate-x-0.5"}`}></span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Tabbed Panel */}
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
            {/* Catalog Rules */}
            {activeTab === "catalog" && catalog && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-7 space-y-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Category Filter</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope] mb-4">Select which product categories sync to Facebook Commerce.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {ALL_CATEGORIES.map((cat) => {
                        const on = catalog.includedCategories.includes(cat);
                        return (
                          <button key={cat} onClick={() => toggleCategory(cat)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-[Manrope] font-semibold text-left transition-all ${on ? "bg-[#eff4ff] border-[#006c49] text-[#006c49]" : "bg-white border-slate-200 text-slate-400"}`}>
                            <span className="material-symbols-outlined text-sm">{on ? "check_box" : "check_box_outline_blank"}</span>{cat}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-serif text-[18px] font-semibold mb-1">Price Range Filter</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope] mb-3">Only sync products within this price range.</p>
                    <div className="flex items-center gap-4">
                      {[{ label: "Min Price", val: catalog.minPrice, setVal: (v: number) => updatePriceRange(v, catalog.maxPrice) },
                        { label: "Max Price", val: catalog.maxPrice, setVal: (v: number) => updatePriceRange(catalog.minPrice, v) }].map((f, i) => (
                        <div key={i} className="flex-1 space-y-1">
                          <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">{f.label}</label>
                          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                            <span className="text-slate-400 font-[Manrope]">$</span>
                            <input type="number" defaultValue={f.val} onBlur={(e) => f.setVal(Number(e.target.value))}
                              className="bg-transparent outline-none font-[Manrope] text-sm w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-5 space-y-4">
                  <div className="p-5 bg-[#f8f9ff] rounded-xl">
                    <h4 className="font-serif font-semibold mb-3">Sync Preview</h4>
                    <div className="space-y-2 text-sm font-[Manrope]">
                      <div className="flex justify-between"><span className="text-[#7c839b]">Categories included</span><span className="font-bold">{catalog.includedCategories.length}/{ALL_CATEGORIES.length}</span></div>
                      <div className="flex justify-between"><span className="text-[#7c839b]">Est. products to sync</span><span className="font-bold">{catalog.includedCategories.length * 178}</span></div>
                      <div className="flex justify-between"><span className="text-[#7c839b]">Price range</span><span className="font-bold">${catalog.minPrice} – ${catalog.maxPrice}</span></div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl overflow-hidden relative" style={{ background: "linear-gradient(135deg,#0b1c30,#006c49)" }}>
                    <p className="text-white font-serif text-[15px] font-semibold mb-1">Ready to push?</p>
                    <p className="text-white/60 text-xs font-[Manrope] mb-4">Sync {catalog.includedCategories.length} categories to Facebook Commerce.</p>
                    <button onClick={runSync} disabled={syncState === "syncing"}
                      className="w-full bg-white text-black py-2.5 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#6cf8bb] disabled:opacity-60 transition-colors flex items-center justify-center gap-2 rounded-lg">
                      <span className={`material-symbols-outlined text-sm ${syncState === "syncing" ? "animate-spin" : ""}`}>refresh</span>
                      {syncState === "syncing" ? "Syncing…" : syncState === "done" ? "Synced ✓" : "Run Sync"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pixel Events */}
            {activeTab === "pixel" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Pixel Event Mapping</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">Map store events to Facebook Pixel standard events for precise ad attribution.</p>
                  </div>
                  <div className="text-right"><span className="text-[10px] font-[Manrope] font-bold text-[#7c839b] uppercase tracking-widest block">Pixel ID</span><code className="text-sm font-mono text-[#006c49]">FB-PX-8841029384</code></div>
                </div>
                <div className="space-y-2">
                  {pixelEvents.map((ev) => (
                    <div key={ev.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${ev.enabled ? "bg-[#f8f9ff] border-slate-100" : "bg-white border-dashed border-slate-200 opacity-60"}`}>
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-0.5">Store Event</p>
                          <p className="font-[Manrope] font-semibold text-sm">{ev.storeEvent}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward</span>
                          <div>
                            <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-0.5">Facebook Event</p>
                            <code className="font-mono text-sm text-[#006c49]">{ev.fbEvent}</code>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => togglePixelEvent(ev)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${ev.enabled ? "bg-[#006c49]" : "bg-slate-300"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${ev.enabled ? "translate-x-5" : "translate-x-0.5"}`}></span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-sm font-[Manrope] text-amber-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Changes saved to database. Test events with Facebook Events Manager before going live.
                  </p>
                </div>
              </div>
            )}

            {/* Audiences */}
            {activeTab === "audiences" && (
              <div>
                <div className="mb-6">
                  <h3 className="font-serif text-[20px] font-semibold mb-1">Custom Audiences</h3>
                  <p className="text-sm text-[#7c839b] font-[Manrope]">Sync customer segments to Facebook for precision ad targeting.</p>
                </div>
                <div className="flex gap-3 mb-6 p-4 bg-[#f8f9ff] rounded-xl">
                  <input value={newAudName} onChange={(e) => setNewAudName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createAudience()}
                    placeholder="Audience name…" className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]" />
                  <select value={newAudType} onChange={(e) => setNewAudType(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]">
                    {["Custom", "Lookalike", "Retargeting"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <button onClick={createAudience} className="px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span> Create
                  </button>
                </div>
                <div className="space-y-3">
                  {audiences.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#eff4ff] rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#006c49] text-base">group</span>
                        </div>
                        <div>
                          <p className="font-[Manrope] font-bold text-sm">{a.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${audienceTypeStyle[a.type] ?? "bg-slate-100 text-slate-600"}`}>{a.type}</span>
                            <span className="text-xs text-[#7c839b] font-[Manrope]">{a.size} users</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${audienceStatusStyle[a.status] ?? "bg-slate-100 text-slate-500"}`}>{a.status}</span>
                        <button onClick={() => toggleAudience(a)} className="text-xs font-[Manrope] text-[#7c839b] hover:text-[#006c49] border border-slate-200 px-3 py-1 rounded transition-colors">
                          {a.status === "Active" ? "Pause" : "Resume"}
                        </button>
                        <button onClick={() => deleteAudience(a)} className="text-[#7c839b] hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Ad Performance */}
            {activeTab === "ads" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-serif text-[20px] font-semibold">Ad Performance Overview</h3>
                  <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                    {(["7", "30", "90"] as const).map((r) => (
                      <button key={r} onClick={() => setAdRange(r)}
                        className={`px-4 py-1.5 text-xs font-[Manrope] font-bold rounded-md transition-all ${adRange === r ? "bg-white text-black shadow-sm" : "text-[#7c839b] hover:text-black"}`}>{r}d</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
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
                        <span className="material-symbols-outlined text-xs">{m.up ? "trending_up" : "trending_down"}</span>{m.change}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="p-5 bg-[#f8f9ff] rounded-xl">
                  <h4 className="font-serif font-semibold mb-3">Top Performing Campaigns</h4>
                  <div className="space-y-3">
                    {[
                      { name: "SS25 Collection — Retargeting",    spend: "$4,820", roas: "5.2x", status: "Active"  },
                      { name: "Lookalike — High LTV Prospecting", spend: "$2,140", roas: "3.8x", status: "Active"  },
                      { name: "Cart Recovery Automation",          spend: "$980",   roas: "6.1x", status: "Active"  },
                      { name: "Brand Awareness — Broad",           spend: "$1,560", roas: "2.1x", status: "Paused"  },
                    ].map((c) => (
                      <div key={c.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full ${c.status === "Active" ? "bg-[#006c49]" : "bg-slate-300"}`}></span>
                          <span className="font-[Manrope] font-semibold text-sm">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm font-[Manrope]">
                          <span className="text-[#7c839b]">Spend: <strong className="text-black">{c.spend}</strong></span>
                          <span className="text-[#006c49] font-bold">ROAS {c.roas}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
