import { useState, useEffect } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type Tab = "credentials" | "catalog" | "products" | "sync";

interface CatalogInfo { id: string; name: string; product_count: number; }
interface CatalogProduct { id: string; name: string; retailer_id: string; price: string; currency: string; availability: string; image_url?: string; url?: string; }
interface CatalogSettings { id: string; includedCategories: string[]; minPrice: number; maxPrice: number; }

const ALL_CATEGORIES = ["Ready-to-Wear","Footwear","Accessories","Bags & Luggage","Jewellery","Outerwear","Swimwear"];

function CredField({ label, hint, value, onChange, type = "text" }: { label: string; hint: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={hint} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49]/20 focus:border-[#006c49] font-mono" />
    </div>
  );
}

export default function AdminMetaCommercePage() {
  const [tab, setTab] = useState<Tab>("credentials");
  const [creds, setCreds] = useState({ catalog_id: "", page_access_token: "" });
  const [saving, setSaving] = useState(false); const [saveMsg, setSaveMsg] = useState("");
  const [catalogInfo, setCatalogInfo] = useState<CatalogInfo | null>(null);
  const [catalogErr, setCatalogErr] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsErr, setProductsErr] = useState("");
  const [settings, setSettings] = useState<CatalogSettings | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState("");

  useEffect(() => {
    fetch("/api/channels/credentials/commerce", { credentials: "include" })
      .then((r) => r.json()).then((data: Record<string, string>) => {
        setCreds({ catalog_id: data.catalog_id ?? "", page_access_token: data.page_access_token ?? "" });
      }).catch(() => {});
    fetch("/api/facebook/catalog", { credentials: "include" })
      .then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  async function saveCreds() {
    setSaving(true); setSaveMsg("");
    try {
      await fetch("/api/channels/credentials/commerce", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(creds),
      });
      setSaveMsg("Credentials saved.");
    } catch { setSaveMsg("Save failed."); }
    setSaving(false);
  }

  async function fetchCatalog() {
    setCatalogLoading(true); setCatalogErr("");
    try {
      const r = await fetch("/api/facebook/catalog/info", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) setCatalogErr(d.error ?? "Failed"); else setCatalogInfo(d);
    } catch { setCatalogErr("Network error"); }
    setCatalogLoading(false);
  }

  async function fetchProducts() {
    setProductsLoading(true); setProductsErr("");
    try {
      const r = await fetch("/api/facebook/catalog/products", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) setProductsErr(d.error ?? "Failed"); else setProducts(d.data ?? []);
    } catch { setProductsErr("Network error"); }
    setProductsLoading(false);
  }

  async function syncProducts() {
    setSyncing(true); setSyncResult("");
    try {
      const r = await fetch("/api/facebook/catalog/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const d = await r.json();
      if (!r.ok) setSyncResult(`Error: ${d.error}`);
      else setSyncResult(`Synced ${d.synced} products to Meta Commerce catalog.`);
    } catch { setSyncResult("Network error during sync."); }
    setSyncing(false);
  }

  async function saveCatalogSettings() {
    if (!settings) return;
    try {
      await fetch("/api/facebook/catalog", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(settings),
      });
    } catch {}
  }

  function toggleCategory(cat: string) {
    if (!settings) return;
    const has = settings.includedCategories.includes(cat);
    setSettings({ ...settings, includedCategories: has ? settings.includedCategories.filter((c) => c !== cat) : [...settings.includedCategories, cat] });
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "credentials", label: "Credentials", icon: "key" },
    { id: "catalog",     label: "Catalog",     icon: "inventory_2" },
    { id: "products",    label: "Products",    icon: "shopping_bag" },
    { id: "sync",        label: "Sync Rules",  icon: "sync" },
  ];

  return (
    <AdminLayout sidebar="main">
      <div className="flex-1 ml-0 p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/admin/channels" className="text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">storefront</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: "Noto Serif, serif" }}>Meta Commerce</h1>
            <p className="text-xs text-slate-500">Sync your product catalog to Meta Commerce and Facebook Shop</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "catalog") fetchCatalog(); if (t.id === "products") fetchProducts(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <span className="material-symbols-outlined text-base">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {tab === "credentials" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Meta Commerce Credentials</h2>
            <p className="text-sm text-slate-500 mb-5">
              Get your Catalog ID from <a href="https://business.facebook.com/commerce" target="_blank" rel="noreferrer" className="text-[#006c49] underline">Meta Commerce Manager</a>.
              Use a System User Access Token with <code className="bg-slate-100 px-1 rounded text-xs">catalog_management</code> permission.
            </p>
            <div className="space-y-4 max-w-lg">
              <CredField label="Product Catalog ID" hint="1234567890" value={creds.catalog_id} onChange={(v) => setCreds((p) => ({ ...p, catalog_id: v }))} />
              <CredField label="Page Access Token / System User Token" hint="EAABsbCS..." value={creds.page_access_token} onChange={(v) => setCreds((p) => ({ ...p, page_access_token: v }))} type="password" />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button onClick={saveCreds} disabled={saving} className="px-5 py-2 bg-[#006c49] text-white text-sm font-medium rounded-lg hover:bg-[#005a3d] disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : "Save Credentials"}
              </button>
              {saveMsg && <span className="text-sm text-[#006c49]">{saveMsg}</span>}
            </div>
            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
              <p className="text-xs font-semibold text-blue-900 mb-2">Required Permissions</p>
              <div className="flex flex-wrap gap-2">
                {["catalog_management","business_management","pages_read_engagement"].map((p) => (
                  <span key={p} className="px-2 py-0.5 bg-white border border-blue-200 rounded text-xs text-blue-700 font-mono">{p}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "catalog" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Catalog Info</h2>
              <button onClick={fetchCatalog} disabled={catalogLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                <span className="material-symbols-outlined text-base">refresh</span>{catalogLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
            {catalogErr && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">{catalogErr}</div>}
            {!catalogInfo && !catalogErr && (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-3 block">inventory_2</span>
                <p className="text-sm">Click Refresh to load catalog info from Meta</p>
              </div>
            )}
            {catalogInfo && (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Catalog ID</p>
                  <p className="text-sm font-mono font-semibold text-slate-800">{catalogInfo.id}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Name</p>
                  <p className="text-sm font-semibold text-slate-800">{catalogInfo.name}</p>
                </div>
                <div className="p-4 bg-[#006c49]/5 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Products in Catalog</p>
                  <p className="text-2xl font-bold text-[#006c49]">{catalogInfo.product_count?.toLocaleString() ?? 0}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "products" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Catalog Products</h2>
              <div className="flex gap-2">
                <button onClick={fetchProducts} disabled={productsLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                  <span className="material-symbols-outlined text-base">refresh</span>{productsLoading ? "Loading…" : "Refresh"}
                </button>
                <button onClick={syncProducts} disabled={syncing} className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-medium hover:bg-[#1564d3] disabled:opacity-50">
                  <span className="material-symbols-outlined text-base">sync</span>{syncing ? "Syncing…" : "Sync Store"}
                </button>
              </div>
            </div>
            {syncResult && <div className={`p-3 rounded-xl text-sm mb-4 ${syncResult.startsWith("Error") ? "bg-red-50 text-red-600 border border-red-100" : "bg-[#006c49]/5 text-[#006c49] border border-[#006c49]/20"}`}>{syncResult}</div>}
            {productsErr && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">{productsErr}</div>}
            {!products.length && !productsErr && (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-3 block">shopping_bag</span>
                <p className="text-sm">Click Refresh to fetch products from your catalog, or Sync Store to push products</p>
              </div>
            )}
            {products.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="pb-2 text-left">Product</th><th className="pb-2 text-left">Price</th><th className="pb-2 text-left">Availability</th><th className="pb-2 text-left">ID</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 flex items-center gap-3">
                          {p.image_url && <img src={p.image_url} alt={p.name} className="w-10 h-10 rounded-lg object-cover bg-slate-100" />}
                          <span className="font-medium text-slate-800">{p.name}</span>
                        </td>
                        <td className="py-3 text-slate-600">{p.price} {p.currency}</td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${p.availability === "in stock" ? "bg-[#6cf8bb] text-[#00714d]" : "bg-red-100 text-red-600"}`}>{p.availability}</span></td>
                        <td className="py-3 text-xs font-mono text-slate-400">{p.retailer_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "sync" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Category Filter</h2>
              <p className="text-sm text-slate-500 mb-4">Only sync products from these categories to your Meta catalog.</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {ALL_CATEGORIES.map((cat) => (
                  <button key={cat} onClick={() => toggleCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${settings?.includedCategories.includes(cat) ? "bg-[#006c49] text-white border-[#006c49]" : "bg-white text-slate-600 border-slate-200 hover:border-[#006c49]"}`}>
                    {cat}
                  </button>
                ))}
              </div>
              <button onClick={saveCatalogSettings} className="px-5 py-2 bg-[#006c49] text-white text-sm font-medium rounded-lg hover:bg-[#005a3d] transition-colors">
                Save Rules
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Push All Products to Meta</h2>
              <p className="text-sm text-slate-500 mb-5">This will batch-update all filtered store products in your Meta Commerce catalog using the items_batch API.</p>
              <button onClick={syncProducts} disabled={syncing} className="flex items-center gap-2 px-5 py-2.5 bg-[#1877F2] text-white text-sm font-semibold rounded-xl hover:bg-[#1564d3] disabled:opacity-50 transition-colors">
                <span className="material-symbols-outlined text-base">sync</span>{syncing ? "Syncing…" : "Sync Store Products → Meta Catalog"}
              </button>
              {syncResult && <p className={`mt-3 text-sm ${syncResult.startsWith("Error") ? "text-red-600" : "text-[#006c49]"}`}>{syncResult}</p>}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
