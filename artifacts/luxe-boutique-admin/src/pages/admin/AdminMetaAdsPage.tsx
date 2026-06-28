import { useState, useEffect } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type Tab = "credentials" | "account" | "insights" | "campaigns";

interface AdAccount { id: string; name: string; currency: string; account_status: number; amount_spent: string; balance: string; }
interface AdInsights { impressions?: string; clicks?: string; spend?: string; ctr?: string; cpc?: string; reach?: string; frequency?: string; }
interface Campaign { id: string; name: string; status: string; objective: string; budget_remaining?: string; daily_budget?: string; }

const DATE_PRESETS = ["today","yesterday","last_7d","last_30d","this_month","last_month"];

function CredField({ label, hint, value, onChange, type = "text" }: { label: string; hint: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={hint}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49]/20 focus:border-[#006c49] font-mono" />
    </div>
  );
}

function MetricCard({ label, value, icon, sub }: { label: string; value: string; icon: string; sub?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="material-symbols-outlined text-lg text-[#1877F2]">{icon}</span>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminMetaAdsPage() {
  const [tab, setTab] = useState<Tab>("credentials");
  const [creds, setCreds] = useState({ ad_account_id: "", page_access_token: "" });
  const [saving, setSaving] = useState(false); const [saveMsg, setSaveMsg] = useState("");
  const [account, setAccount] = useState<AdAccount | null>(null);
  const [accountErr, setAccountErr] = useState(""); const [accountLoading, setAccountLoading] = useState(false);
  const [insights, setInsights] = useState<AdInsights | null>(null);
  const [insightsErr, setInsightsErr] = useState(""); const [insightsLoading, setInsightsLoading] = useState(false);
  const [datePreset, setDatePreset] = useState("last_30d");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false); const [campaignsErr, setCampaignsErr] = useState("");

  useEffect(() => {
    fetch("/api/channels/credentials/ads", { credentials: "include" })
      .then((r) => r.json()).then((d: Record<string, string>) => {
        setCreds({ ad_account_id: d.ad_account_id ?? "", page_access_token: d.page_access_token ?? "" });
      }).catch(() => {});
  }, []);

  async function saveCreds() {
    setSaving(true); setSaveMsg("");
    try {
      await fetch("/api/channels/credentials/ads", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        credentials: "include", body: JSON.stringify(creds),
      });
      setSaveMsg("Credentials saved.");
    } catch { setSaveMsg("Save failed."); }
    setSaving(false);
  }

  async function fetchAccount() {
    setAccountLoading(true); setAccountErr("");
    try {
      const r = await fetch("/api/facebook/ads/account", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) setAccountErr(d.error ?? "Failed"); else setAccount(d);
    } catch { setAccountErr("Network error"); }
    setAccountLoading(false);
  }

  async function fetchInsights() {
    setInsightsLoading(true); setInsightsErr("");
    try {
      const r = await fetch(`/api/facebook/ads/insights?date_preset=${datePreset}`, { credentials: "include" });
      const d = await r.json();
      if (!r.ok) setInsightsErr(d.error ?? "Failed");
      else setInsights((d.data ?? [d])[0] ?? null);
    } catch { setInsightsErr("Network error"); }
    setInsightsLoading(false);
  }

  async function fetchCampaigns() {
    setCampaignsLoading(true); setCampaignsErr("");
    try {
      const r = await fetch("/api/facebook/ads/campaigns", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) setCampaignsErr(d.error ?? "Failed"); else setCampaigns(d.data ?? []);
    } catch { setCampaignsErr("Network error"); }
    setCampaignsLoading(false);
  }

  const accountStatusLabel = (s?: number) => {
    const map: Record<number, string> = { 1: "Active", 2: "Disabled", 3: "Unsettled", 7: "Pending", 9: "In Grace Period", 100: "Pending Closure", 101: "Closed", 201: "Any Active" };
    return s != null ? (map[s] ?? `Status ${s}`) : "—";
  };

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "credentials", label: "Credentials", icon: "key" },
    { id: "account",     label: "Account",     icon: "account_balance" },
    { id: "insights",    label: "Insights",    icon: "bar_chart" },
    { id: "campaigns",   label: "Campaigns",   icon: "campaign" },
  ];

  return (
    <AdminLayout sidebar="channels">
      <div className="flex-1 ml-0 p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/channels" className="text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-[#1877F2] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">campaign</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: "Noto Serif, serif" }}>Meta Ads Manager</h1>
            <p className="text-xs text-slate-500">View real-time ad performance, campaigns, and spend from Meta Ads</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setTab(t.id); if (t.id === "account") fetchAccount(); if (t.id === "campaigns") fetchCampaigns(); if (t.id === "insights") fetchInsights(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              <span className="material-symbols-outlined text-base">{t.icon}</span>{t.label}
            </button>
          ))}
        </div>

        {tab === "credentials" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Meta Ads Credentials</h2>
            <p className="text-sm text-slate-500 mb-5">
              Your Ad Account ID is visible in <a href="https://business.facebook.com/adsmanager" target="_blank" rel="noreferrer" className="text-[#006c49] underline">Meta Ads Manager</a> — look for <code className="bg-slate-100 px-1 rounded text-xs">act_XXXXXXXXX</code>. Enter just the numeric part.
            </p>
            <div className="space-y-4 max-w-lg">
              <CredField label="Ad Account ID (numeric, without act_)" hint="1234567890" value={creds.ad_account_id} onChange={(v) => setCreds((p) => ({ ...p, ad_account_id: v }))} />
              <CredField label="Access Token (with ads_read permission)" hint="EAABsbCS..." value={creds.page_access_token} onChange={(v) => setCreds((p) => ({ ...p, page_access_token: v }))} type="password" />
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
                {["ads_read","ads_management","business_management"].map((p) => (
                  <span key={p} className="px-2 py-0.5 bg-white border border-blue-200 rounded text-xs text-blue-700 font-mono">{p}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "account" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Ad Account</h2>
              <button onClick={fetchAccount} disabled={accountLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                <span className="material-symbols-outlined text-base">refresh</span>{accountLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
            {accountErr && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">{accountErr}</div>}
            {!account && !accountErr && (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-3 block">account_balance</span>
                <p className="text-sm">Click Refresh to load your ad account</p>
              </div>
            )}
            {account && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl col-span-2">
                  <p className="text-xs text-slate-500 mb-1">Account Name</p>
                  <p className="text-lg font-semibold text-slate-900">{account.name}</p>
                  <p className="text-xs font-mono text-slate-400 mt-1">act_{account.id}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${account.account_status === 1 ? "bg-[#6cf8bb] text-[#00714d]" : "bg-red-100 text-red-600"}`}>
                    {accountStatusLabel(account.account_status)}
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Currency</p>
                  <p className="text-sm font-semibold text-slate-900">{account.currency}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Total Spent</p>
                  <p className="text-xl font-bold text-slate-900">{account.amount_spent ? `${(parseFloat(account.amount_spent) / 100).toFixed(2)} ${account.currency}` : "—"}</p>
                </div>
                <div className="p-4 bg-[#006c49]/5 rounded-xl">
                  <p className="text-xs text-slate-500 mb-1">Balance</p>
                  <p className="text-xl font-bold text-[#006c49]">{account.balance ? `${(parseFloat(account.balance) / 100).toFixed(2)} ${account.currency}` : "—"}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "insights" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49]/20">
                {DATE_PRESETS.map((p) => <option key={p} value={p}>{p.replace(/_/g," ")}</option>)}
              </select>
              <button onClick={fetchInsights} disabled={insightsLoading} className="flex items-center gap-2 px-4 py-2 bg-[#1877F2] text-white rounded-lg text-sm font-medium hover:bg-[#1564d3] disabled:opacity-50">
                <span className="material-symbols-outlined text-base">bar_chart</span>{insightsLoading ? "Loading…" : "Load Insights"}
              </button>
            </div>
            {insightsErr && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{insightsErr}</div>}
            {!insights && !insightsErr && (
              <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-200">
                <span className="material-symbols-outlined text-4xl mb-3 block">bar_chart</span>
                <p className="text-sm">Select a date range and click Load Insights</p>
              </div>
            )}
            {insights && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Impressions" value={parseInt(insights.impressions ?? "0").toLocaleString()} icon="visibility" />
                <MetricCard label="Clicks" value={parseInt(insights.clicks ?? "0").toLocaleString()} icon="ads_click" />
                <MetricCard label="Spend" value={`$${parseFloat(insights.spend ?? "0").toFixed(2)}`} icon="payments" />
                <MetricCard label="CTR" value={insights.ctr ? `${parseFloat(insights.ctr).toFixed(2)}%` : "—"} icon="percent" />
                <MetricCard label="CPC" value={insights.cpc ? `$${parseFloat(insights.cpc).toFixed(2)}` : "—"} icon="attach_money" />
                <MetricCard label="Reach" value={parseInt(insights.reach ?? "0").toLocaleString()} icon="people" />
                <MetricCard label="Frequency" value={insights.frequency ? parseFloat(insights.frequency).toFixed(2) : "—"} icon="repeat" sub="avg. times shown per user" />
              </div>
            )}
          </div>
        )}

        {tab === "campaigns" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Campaigns</h2>
              <button onClick={fetchCampaigns} disabled={campaignsLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
                <span className="material-symbols-outlined text-base">refresh</span>{campaignsLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
            {campaignsErr && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">{campaignsErr}</div>}
            {!campaigns.length && !campaignsErr && (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-3 block">campaign</span>
                <p className="text-sm">Click Refresh to load your campaigns</p>
              </div>
            )}
            {campaigns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100 text-xs text-slate-500">
                    <th className="pb-2 text-left">Campaign</th><th className="pb-2 text-left">Status</th><th className="pb-2 text-left">Objective</th><th className="pb-2 text-right">Daily Budget</th><th className="pb-2 text-right">Remaining</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="py-3 font-medium text-slate-800">{c.name}</td>
                        <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${c.status === "ACTIVE" ? "bg-[#6cf8bb] text-[#00714d]" : c.status === "PAUSED" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{c.status}</span></td>
                        <td className="py-3 text-slate-600">{c.objective?.replace(/_/g," ")}</td>
                        <td className="py-3 text-right text-slate-600">{c.daily_budget ? `$${(parseInt(c.daily_budget) / 100).toFixed(2)}` : "—"}</td>
                        <td className="py-3 text-right text-slate-600">{c.budget_remaining ? `$${(parseInt(c.budget_remaining) / 100).toFixed(2)}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
