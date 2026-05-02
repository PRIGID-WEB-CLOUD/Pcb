import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ConnectionKey = "facebook" | "instagram" | "pixel" | "messenger";
type SyncState = "idle" | "syncing" | "done";
type ActiveTab = "catalog" | "pixel" | "audiences" | "ads";

const connectionMeta: { key: ConnectionKey; label: string; icon: string }[] = [
  { key: "facebook", label: "Facebook Shop", icon: "storefront" },
  { key: "instagram", label: "Instagram Shopping", icon: "photo_camera" },
  { key: "pixel", label: "Pixel Tracking", icon: "track_changes" },
  { key: "messenger", label: "Messenger Bot", icon: "chat" },
];

const allCategories = ["Ready-to-Wear", "Footwear", "Accessories", "Bags & Luggage", "Jewellery", "Outerwear", "Swimwear"];

const pixelEventMap: { store: string; fb: string; enabled: boolean }[] = [
  { store: "Product Viewed",    fb: "ViewContent",    enabled: true  },
  { store: "Add to Cart",       fb: "AddToCart",      enabled: true  },
  { store: "Checkout Started",  fb: "InitiateCheckout", enabled: true },
  { store: "Order Completed",   fb: "Purchase",       enabled: true  },
  { store: "Wishlist Added",    fb: "AddToWishlist",  enabled: false },
  { store: "Search Performed",  fb: "Search",         enabled: false },
  { store: "Account Created",   fb: "CompleteRegistration", enabled: true },
];

interface Audience {
  id: string;
  name: string;
  size: string;
  type: "Lookalike" | "Custom" | "Retargeting";
  status: "Active" | "Building" | "Paused";
}

const initialAudiences: Audience[] = [
  { id: "a1", name: "Past 30-Day Purchasers", size: "4,820", type: "Custom", status: "Active" },
  { id: "a2", name: "Lookalike — Top LTV", size: "180K", type: "Lookalike", status: "Active" },
  { id: "a3", name: "Cart Abandoners (7d)", size: "1,240", type: "Retargeting", status: "Active" },
  { id: "a4", name: "VIP Segment Lookalike", size: "92K", type: "Lookalike", status: "Building" },
];

const adRanges: Record<string, { impressions: string; ctr: string; cpc: string; roas: string }> = {
  "7":  { impressions: "620K", ctr: "4.1%", cpc: "$0.38", roas: "4.8x" },
  "30": { impressions: "2.4M", ctr: "3.8%", cpc: "$0.42", roas: "4.2x" },
  "90": { impressions: "6.8M", ctr: "3.5%", cpc: "$0.47", roas: "3.9x" },
};

const audienceTypeStyle: Record<Audience["type"], string> = {
  Custom:     "bg-blue-50 text-blue-700",
  Lookalike:  "bg-purple-50 text-purple-700",
  Retargeting:"bg-amber-50 text-amber-700",
};
const audienceStatusStyle: Record<Audience["status"], string> = {
  Active:   "bg-[#6cf8bb] text-[#00714d]",
  Building: "bg-amber-100 text-amber-700",
  Paused:   "bg-slate-100 text-slate-500",
};

export default function AdminFacebookPage() {
  const [connections, setConnections] = useState<Record<ConnectionKey, boolean>>({ facebook: true, instagram: true, pixel: true, messenger: false });
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [lastSync, setLastSync] = useState("Today at 10:42 AM");
  const [adRange, setAdRange] = useState<"7" | "30" | "90">("30");
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("catalog");
  const [includedCategories, setIncludedCategories] = useState<Set<string>>(new Set(allCategories));
  const [minPrice, setMinPrice] = useState("0");
  const [maxPrice, setMaxPrice] = useState("5000");
  const [pixelEvents, setPixelEvents] = useState(pixelEventMap);
  const [audiences, setAudiences] = useState<Audience[]>(initialAudiences);
  const [newAudName, setNewAudName] = useState("");
  const [newAudType, setNewAudType] = useState<Audience["type"]>("Custom");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const runSync = () => {
    if (syncState === "syncing") return;
    setSyncState("syncing");
    setTimeout(() => {
      setSyncState("done");
      setLastSync(`Today at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
      showToast(`Catalog sync complete — ${includedCategories.size} categories, ${includedCategories.size * 180} products.`);
      setTimeout(() => setSyncState("idle"), 3000);
    }, 2500);
  };

  const toggleCategory = (cat: string) => {
    setIncludedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) { next.delete(cat); } else { next.add(cat); }
      return next;
    });
  };

  const togglePixelEvent = (i: number) => {
    setPixelEvents((prev) => prev.map((e, idx) => idx === i ? { ...e, enabled: !e.enabled } : e));
    showToast(`Pixel event "${pixelEvents[i].store}" ${pixelEvents[i].enabled ? "disabled" : "enabled"}.`);
  };

  const createAudience = () => {
    if (!newAudName.trim()) return;
    const aud: Audience = { id: Date.now().toString(), name: newAudName.trim(), size: "Building…", type: newAudType, status: "Building" };
    setAudiences((prev) => [aud, ...prev]);
    setNewAudName("");
    showToast(`Audience "${aud.name}" creation started.`);
  };

  const pauseAudience = (id: string) => {
    setAudiences((prev) => prev.map((a) => a.id === id ? { ...a, status: a.status === "Active" ? "Paused" : "Active" } : a));
  };

  const deleteAudience = (id: string) => {
    const a = audiences.find((x) => x.id === id)!;
    setAudiences((prev) => prev.filter((x) => x.id !== id));
    showToast(`Audience "${a.name}" deleted.`);
  };

  const adData = adRanges[adRange];
  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: "catalog",   label: "Catalog Rules",   icon: "database"       },
    { key: "pixel",     label: "Pixel Events",    icon: "track_changes"  },
    { key: "audiences", label: "Audiences",        icon: "group"          },
    { key: "ads",       label: "Ad Performance",   icon: "bar_chart"      },
  ];

  return (
    <AdminLayout sidebar="channels">
      <div className="p-10 max-w-[1280px] mx-auto">
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>{toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-10 flex justify-between items-start">
          <div>
            <Link href="/admin/channels" className="inline-flex items-center gap-1.5 text-[#7c839b] hover:text-[#006c49] transition-colors font-[Manrope] font-bold text-xs tracking-widest uppercase mb-4 no-underline">
              <span className="material-symbols-outlined text-base">arrow_back</span> Channel Hub
            </Link>
            <h2 className="text-[36px] font-serif font-bold text-[#0b1c30] mb-2">Meta Commerce Manager</h2>
            <p className="font-[Manrope] text-[16px] text-[#7c839b] max-w-2xl">Manage Facebook & Instagram shop presence, pixel events, product catalog rules, and custom audiences.</p>
          </div>
          <div className="flex flex-col items-end gap-2 pt-8">
            {connectionMeta.slice(0, 2).map((item) => (
              <div key={item.key} className="flex items-center gap-2 text-xs font-[Manrope]">
                <span className={`w-1.5 h-1.5 rounded-full ${connections[item.key] ? "bg-[#006c49]" : "bg-amber-500"}`}></span>
                <span className="text-[#7c839b]">{item.label}</span>
                <span className={`font-bold ${connections[item.key] ? "text-[#006c49]" : "text-amber-600"}`}>{connections[item.key] ? "Active" : "Paused"}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Connection toggles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {connectionMeta.map((item) => {
            const active = connections[item.key];
            return (
              <div key={item.key} className="bg-white p-4 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`material-symbols-outlined text-lg ${active ? "text-[#006c49]" : "text-slate-300"}`}>{item.icon}</span>
                  <span className="font-[Manrope] font-semibold text-sm">{item.label}</span>
                </div>
                <button
                  onClick={() => { const next = !active; setConnections((p) => ({ ...p, [item.key]: next })); showToast(`${item.label} ${next ? "activated" : "paused"}.`); }}
                  className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${active ? "bg-[#006c49]" : "bg-slate-300"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${active ? "translate-x-5" : "translate-x-0.5"}`}></span>
                </button>
              </div>
            );
          })}
        </div>

        {/* Tabbed Logic Panel */}
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
            {/* Catalog Rules */}
            {activeTab === "catalog" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-7 space-y-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Category Filter</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope] mb-4">Select which product categories sync to Facebook Commerce.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {allCategories.map((cat) => {
                        const on = includedCategories.has(cat);
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
                      <div className="flex-1 space-y-1">
                        <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Min Price</label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                          <span className="text-slate-400 font-[Manrope]">$</span>
                          <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)}
                            className="bg-transparent outline-none font-[Manrope] text-sm w-full" />
                        </div>
                      </div>
                      <span className="text-slate-300 mt-5">—</span>
                      <div className="flex-1 space-y-1">
                        <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Max Price</label>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                          <span className="text-slate-400 font-[Manrope]">$</span>
                          <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)}
                            className="bg-transparent outline-none font-[Manrope] text-sm w-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-5 space-y-4">
                  <div className="p-5 bg-[#f8f9ff] rounded-xl">
                    <h4 className="font-serif font-semibold mb-3">Sync Preview</h4>
                    <div className="space-y-2 text-sm font-[Manrope]">
                      <div className="flex justify-between"><span className="text-[#7c839b]">Categories included</span><span className="font-bold">{includedCategories.size}/{allCategories.length}</span></div>
                      <div className="flex justify-between"><span className="text-[#7c839b]">Est. products to sync</span><span className="font-bold">{includedCategories.size * 178}</span></div>
                      <div className="flex justify-between"><span className="text-[#7c839b]">Price range</span><span className="font-bold">${minPrice} – ${maxPrice}</span></div>
                      <div className="flex justify-between"><span className="text-[#7c839b]">Last sync</span><span className="font-bold">{lastSync}</span></div>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl overflow-hidden relative" style={{ background: "linear-gradient(135deg,#0b1c30,#006c49)" }}>
                    <p className="text-white font-serif text-[15px] font-semibold mb-1">Ready to push?</p>
                    <p className="text-white/60 text-xs font-[Manrope] mb-4">Sync {includedCategories.size} categories to Facebook Commerce.</p>
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
                    <p className="text-sm text-[#7c839b] font-[Manrope]">Map your store events to Facebook Pixel standard events for precise ad attribution.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-[Manrope] font-bold text-[#7c839b] uppercase tracking-widest block">Pixel ID</span>
                    <code className="text-sm font-mono text-[#006c49]">FB-PX-8841029384</code>
                  </div>
                </div>
                <div className="space-y-2">
                  {pixelEvents.map((ev, i) => (
                    <div key={ev.store} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${ev.enabled ? "bg-[#f8f9ff] border-slate-100" : "bg-white border-dashed border-slate-200 opacity-60"}`}>
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-0.5">Store Event</p>
                          <p className="font-[Manrope] font-semibold text-sm">{ev.store}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward</span>
                          <div>
                            <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-0.5">Facebook Event</p>
                            <code className="font-mono text-sm text-[#006c49]">{ev.fb}</code>
                          </div>
                        </div>
                      </div>
                      <button onClick={() => togglePixelEvent(i)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${ev.enabled ? "bg-[#006c49]" : "bg-slate-300"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${ev.enabled ? "translate-x-5" : "translate-x-0.5"}`}></span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-sm font-[Manrope] text-amber-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">info</span>
                    Changes take effect on the next page load. Test events with Facebook Events Manager before going live.
                  </p>
                </div>
              </div>
            )}

            {/* Audiences */}
            {activeTab === "audiences" && (
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Custom Audiences</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">Sync your customer segments to Facebook for precision ad targeting.</p>
                  </div>
                </div>
                {/* Create new */}
                <div className="flex gap-3 mb-6 p-4 bg-[#f8f9ff] rounded-xl">
                  <input value={newAudName} onChange={(e) => setNewAudName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && createAudience()}
                    placeholder="Audience name…" className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]" />
                  <select value={newAudType} onChange={(e) => setNewAudType(e.target.value as Audience["type"])}
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
                            <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${audienceTypeStyle[a.type]}`}>{a.type}</span>
                            <span className="text-xs text-[#7c839b] font-[Manrope]">{a.size} users</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${audienceStatusStyle[a.status]}`}>{a.status}</span>
                        <button onClick={() => pauseAudience(a.id)} className="text-xs font-[Manrope] text-[#7c839b] hover:text-[#006c49] border border-slate-200 px-3 py-1 rounded transition-colors">
                          {a.status === "Active" ? "Pause" : "Resume"}
                        </button>
                        <button onClick={() => deleteAudience(a.id)} className="text-[#7c839b] hover:text-red-500 transition-colors">
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
                      { name: "SS25 Collection — Retargeting", spend: "$4,820", roas: "5.2x", status: "Active" },
                      { name: "Lookalike — High LTV Prospecting", spend: "$2,140", roas: "3.8x", status: "Active" },
                      { name: "Cart Recovery Automation", spend: "$980", roas: "6.1x", status: "Active" },
                      { name: "Brand Awareness — Broad", spend: "$1,560", roas: "2.1x", status: "Paused" },
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
