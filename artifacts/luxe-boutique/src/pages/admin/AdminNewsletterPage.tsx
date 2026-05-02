import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type Subscriber = { id: string; email: string; createdAt: string };
type GrowthPoint  = { month: string; count: number };
type NewsletterData = {
  subscribers: Subscriber[];
  total: number;
  thisMonth: number;
  thisWeek: number;
  growth: GrowthPoint[];
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export default function AdminNewsletterPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]     = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);

  const { data, isLoading } = useQuery<NewsletterData>({
    queryKey: ["admin-newsletter"],
    queryFn: async () => {
      const res = await fetch("/api/newsletter");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/newsletter/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-newsletter"] });
      setDeleteId(null);
    },
  });

  const subscribers = data?.subscribers ?? [];
  const growth      = data?.growth ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? subscribers.filter(s => s.email.toLowerCase().includes(q)) : subscribers;
  }, [subscribers, search]);

  const maxGrowth = Math.max(...growth.map(g => g.count), 1);

  const handleExport = async () => {
    const res = await fetch("/api/newsletter/export");
    if (!res.ok) return;
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `newsletter-subscribers-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    const emails = subscribers.map(s => s.email).join(", ");
    navigator.clipboard.writeText(emails);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stats = [
    { label: "Total Subscribers", value: data?.total ?? 0,      icon: "group",            color: "text-[#006c49] bg-[#e6f7f1]" },
    { label: "Joined This Month",  value: data?.thisMonth ?? 0,  icon: "calendar_month",   color: "text-blue-600 bg-blue-50"     },
    { label: "Joined This Week",   value: data?.thisWeek ?? 0,   icon: "trending_up",      color: "text-purple-600 bg-purple-50" },
    { label: "Avg / Month",        value: growth.length > 0 ? Math.round(growth.reduce((a, g) => a + g.count, 0) / growth.length) : 0,
                                                                  icon: "bar_chart",        color: "text-amber-600 bg-amber-50"   },
  ];

  return (
    <AdminLayout sidebar="main">
      <div className="p-8 bg-[#f8f9ff] min-h-screen">

        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-2">
              Marketing
            </p>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-black">Newsletter</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCopyAll}
              className="px-5 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all flex items-center gap-2 rounded-lg">
              <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
              {copied ? "Copied!" : "Copy All Emails"}
            </button>
            <button onClick={handleExport}
              className="px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all flex items-center gap-2 rounded-lg shadow">
              <span className="material-symbols-outlined text-sm">download</span>
              Export CSV
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${s.color}`}>
                  <span className="material-symbols-outlined text-lg">{s.icon}</span>
                </div>
                <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">{s.label}</p>
              </div>
              <p className="text-[32px] font-serif font-bold text-black leading-none">{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-6 mb-8">

          {/* Growth chart */}
          <div className="col-span-12 lg:col-span-5 bg-white rounded-xl p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <h3 className="text-[18px] font-serif font-semibold text-black mb-6">Subscriber Growth</h3>
            {growth.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#7c839b]">
                <span className="material-symbols-outlined text-4xl text-[#c6c6cd] mb-2">bar_chart</span>
                <p className="text-sm font-[Manrope]">No growth data yet</p>
              </div>
            ) : (
              <div className="flex items-end gap-2 h-40">
                {growth.map(g => (
                  <div key={g.month} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-[Manrope] font-bold text-[#7c839b]">{g.count}</span>
                    <div
                      className="w-full bg-[#006c49] rounded-t-sm transition-all duration-500 hover:bg-[#00a36d]"
                      style={{ height: `${Math.max(4, (g.count / maxGrowth) * 120)}px` }}
                      title={`${fmtMonth(g.month)}: ${g.count} new subscribers`}
                    />
                    <span className="text-[9px] font-[Manrope] text-[#7c839b]">{fmtMonth(g.month)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick info panel */}
          <div className="col-span-12 lg:col-span-7 bg-white rounded-xl p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <h3 className="text-[18px] font-serif font-semibold text-black mb-4">Recent Subscribers</h3>
            {subscribers.slice(0, 6).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#7c839b]">
                <span className="material-symbols-outlined text-4xl text-[#c6c6cd] mb-2">inbox</span>
                <p className="text-sm font-[Manrope]">No subscribers yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subscribers.slice(0, 6).map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[11px] font-[Manrope] font-bold text-[#006c49] uppercase shrink-0">
                        {s.email[0]}
                      </div>
                      <span className="text-sm font-[Manrope] text-[#0a0f0d]">{s.email}</span>
                    </div>
                    <span className="text-[11px] font-[Manrope] text-[#7c839b] whitespace-nowrap">{fmtDate(s.createdAt)}</span>
                  </div>
                ))}
                {subscribers.length > 6 && (
                  <p className="text-[11px] font-[Manrope] text-[#7c839b] pt-1">+{subscribers.length - 6} more in the table below</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Full subscriber table */}
        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
          <div className="p-6 border-b border-[#e5eeff] flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <h3 className="text-[18px] font-serif font-semibold text-black">
              All Subscribers
              <span className="ml-2 text-[13px] font-[Manrope] font-normal text-[#7c839b]">({filtered.length})</span>
            </h3>
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7c839b] text-lg">search</span>
              <input
                className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg pl-9 pr-4 py-2 text-sm font-[Manrope] outline-none focus:border-black transition-colors"
                placeholder="Search by email…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-24 flex items-center justify-center gap-3 text-[#7c839b]">
              <span className="material-symbols-outlined animate-spin text-2xl">autorenew</span>
              <span className="font-[Manrope] text-sm">Loading subscribers…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#7c839b]">
              <span className="material-symbols-outlined text-5xl text-[#c6c6cd]">mail</span>
              <p className="font-[Manrope] font-bold text-sm">{search ? "No subscribers match your search" : "No subscribers yet"}</p>
              <p className="font-[Manrope] text-xs">{search ? "Try a different email" : "Signups from your storefront will appear here"}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#f8f9ff] border-b border-[#e5eeff]">
                <tr>
                  <th className="text-left text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] px-6 py-3">#</th>
                  <th className="text-left text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] px-6 py-3">Email</th>
                  <th className="text-left text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] px-6 py-3">Subscribed</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f2ff]">
                {filtered.map((s, i) => (
                  <tr key={s.id} className="hover:bg-[#f8f9ff] transition-colors group">
                    <td className="px-6 py-4 text-[11px] font-[Manrope] text-[#7c839b]">{i + 1}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#eff4ff] flex items-center justify-center text-[11px] font-[Manrope] font-bold text-[#006c49] uppercase shrink-0">
                          {s.email[0]}
                        </div>
                        <span className="text-sm font-[Manrope] text-[#0a0f0d]">{s.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[13px] font-[Manrope] text-[#45464d]">{fmtDate(s.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteId(s.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity w-8 h-8 rounded-full hover:bg-[#ffdad6] flex items-center justify-center ml-auto">
                        <span className="material-symbols-outlined text-[#ba1a1a] text-base">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">delete</span>
            </div>
            <h3 className="text-[20px] font-serif font-bold text-black mb-2">Remove subscriber?</h3>
            <p className="text-sm font-[Manrope] text-[#45464d] mb-6">
              {subscribers.find(s => s.id === deleteId)?.email} will be removed from the list. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all rounded-lg">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteId!)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-[#ba1a1a] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#93000a] transition-all rounded-lg disabled:opacity-60">
                {deleteMutation.isPending ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
