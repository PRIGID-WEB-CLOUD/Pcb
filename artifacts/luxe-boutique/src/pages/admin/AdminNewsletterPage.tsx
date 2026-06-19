import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type Subscriber  = { id: string; email: string; createdAt: string };
type GrowthPoint = { month: string; count: number };
type Campaign    = { id: string; subject: string; body: string; recipientCount: number; sentCount: number; status: string; sentAt: string | null; scheduledFor: string | null; createdAt: string; updatedAt: string };
type NewsletterData = {
  subscribers: Subscriber[];
  total: number;
  thisMonth: number;
  thisWeek: number;
  growth: GrowthPoint[];
  smtpConfigured: boolean;
};

type Tab = "compose" | "subscribers" | "campaigns";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

const STATUS_CFG: Record<string, { label: string; cls: string; icon: string }> = {
  DRAFT:     { label: "Draft",     cls: "text-[#45464d] bg-[#e5eeff]",   icon: "draft"        },
  SCHEDULED: { label: "Scheduled", cls: "text-purple-600 bg-purple-50",  icon: "schedule_send"},
  SENDING:   { label: "Sending",   cls: "text-blue-600 bg-blue-50",      icon: "autorenew"    },
  SENT:      { label: "Sent",      cls: "text-[#006c49] bg-[#e6f7f1]",   icon: "check_circle" },
  PARTIAL:   { label: "Partial",   cls: "text-amber-600 bg-amber-50",    icon: "warning"      },
  FAILED:    { label: "Failed",    cls: "text-[#ba1a1a] bg-[#ffdad6]",   icon: "error"        },
};

export default function AdminNewsletterPage() {
  const queryClient = useQueryClient();
  const [tab, setTab]           = useState<Tab>("compose");
  const [search, setSearch]     = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied]     = useState(false);

  const [subject, setSubject] = useState("");
  const [body, setBody]       = useState("");
  const [preview, setPreview] = useState(false);
  const [sent, setSent]       = useState<{ count: number; draft?: boolean } | null>(null);

  const [deleteCampaignId, setDeleteCampaignId]   = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign]     = useState<Campaign | null>(null);
  const [editSubject, setEditSubject]             = useState("");
  const [editBody, setEditBody]                   = useState("");

  const { data, isLoading } = useQuery<NewsletterData>({
    queryKey: ["admin-newsletter"],
    queryFn: async () => {
      const res = await fetch("/api/newsletter");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ["admin-campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/newsletter/campaigns");
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

  const sendMutation = useMutation({
    mutationFn: async (opts?: { draft?: boolean }) => {
      const res = await fetch("/api/newsletter/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, saveAsDraft: opts?.draft }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: (d, vars) => {
      setSent({ count: d.recipientCount ?? 0, draft: vars?.draft });
      setSubject("");
      setBody("");
      setPreview(false);
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/newsletter/campaigns/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setDeleteCampaignId(null);
    },
  });

  const resendMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/newsletter/campaigns/${id}/resend`, { method: "POST" });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] }),
  });

  const editCampaignMutation = useMutation({
    mutationFn: async () => {
      if (!editingCampaign) return;
      const res = await fetch(`/api/newsletter/campaigns/${editingCampaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: editSubject, body: editBody }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error || "Failed"); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      setEditingCampaign(null);
    },
  });

  const subscribers  = data?.subscribers ?? [];
  const growth       = data?.growth ?? [];
  const smtpReady    = data?.smtpConfigured ?? false;

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
    a.href = url; a.download = `newsletter-subscribers-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(subscribers.map(s => s.email).join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const charCount = body.length;

  const stats = [
    { label: "Total Subscribers", value: data?.total ?? 0,      icon: "group",          color: "text-[#006c49] bg-[#e6f7f1]" },
    { label: "Joined This Month",  value: data?.thisMonth ?? 0,  icon: "calendar_month", color: "text-blue-600 bg-blue-50"     },
    { label: "Joined This Week",   value: data?.thisWeek ?? 0,   icon: "trending_up",    color: "text-purple-600 bg-purple-50" },
    { label: "Campaigns Sent",     value: campaigns.filter(c => c.status === "SENT").length, icon: "send", color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <AdminLayout sidebar="main">
      <div className="p-8 bg-[#f8f9ff] min-h-screen">

        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-2">Marketing</p>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-black">Newsletter</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleCopyAll}
              className="px-5 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all flex items-center gap-2 rounded-lg">
              <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
              {copied ? "Copied!" : "Copy Emails"}
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

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1.5 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] mb-6 w-fit">
          {(["compose", "subscribers", "campaigns"] as Tab[]).map(t => (
            <button key={t} onClick={() => { setTab(t); setSent(null); }}
              className={`px-6 py-2 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase transition-all ${
                tab === t ? "bg-black text-white shadow" : "text-[#7c839b] hover:text-black"
              }`}>
              {t === "compose" ? "Compose" : t === "subscribers" ? `Subscribers (${data?.total ?? 0})` : `Campaigns (${campaigns.length})`}
            </button>
          ))}
        </div>

        {/* ── Compose Tab ── */}
        {tab === "compose" && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-7">

              {!smtpReady && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600 text-xl mt-0.5">warning</span>
                  <div>
                    <p className="text-sm font-[Manrope] font-bold text-amber-800 mb-1">SMTP not configured</p>
                    <p className="text-xs font-[Manrope] text-amber-700">
                      Add <code className="bg-amber-100 px-1 rounded">SMTP_HOST</code>, <code className="bg-amber-100 px-1 rounded">SMTP_USER</code>, and <code className="bg-amber-100 px-1 rounded">SMTP_PASS</code> secrets to start sending real emails.
                      In development, campaigns are logged to the server console.
                    </p>
                  </div>
                </div>
              )}

              {sent && (
                <div className="mb-6 p-4 bg-[#e6f7f1] border border-[#6cf8bb]/40 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#006c49] text-xl">check_circle</span>
                  <p className="text-sm font-[Manrope] font-bold text-[#006c49]">
                    {sent.draft ? "Draft saved!" : `Campaign sent to ${sent.count} subscriber${sent.count !== 1 ? "s" : ""}!`}
                  </p>
                </div>
              )}

              {sendMutation.isError && (
                <div className="mb-6 p-4 bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-xl">error</span>
                  <p className="text-sm font-[Manrope] font-bold text-[#ba1a1a]">{(sendMutation.error as Error).message}</p>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e5eeff]">
                  <h3 className="text-[18px] font-serif font-semibold text-black">New Campaign</h3>
                  <button onClick={() => setPreview(p => !p)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[11px] font-[Manrope] font-bold uppercase tracking-widest transition-all ${
                      preview ? "bg-black text-white" : "border border-[#c6c6cd] text-[#45464d] hover:bg-[#eff4ff]"
                    }`}>
                    <span className="material-symbols-outlined text-sm">{preview ? "edit" : "visibility"}</span>
                    {preview ? "Edit" : "Preview"}
                  </button>
                </div>

                {preview ? (
                  /* Email preview */
                  <div className="p-6">
                    <div className="border border-[#e5eeff] rounded-xl overflow-hidden max-w-lg mx-auto">
                      <div className="bg-[#080e0b] px-8 py-5 text-center">
                        <span className="text-white text-[12px] font-bold tracking-[0.2em] uppercase">✦ Luxe Boutique</span>
                      </div>
                      <div className="bg-white p-8">
                        <p className="text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-1">Subject</p>
                        <p className="text-lg font-serif font-semibold text-black mb-6">{subject || "—"}</p>
                        <div className="text-sm font-[Manrope] text-[#2d3748] leading-relaxed whitespace-pre-wrap border-t border-[#f1f3f9] pt-6">
                          {body || <span className="text-[#c6c6cd]">No body written yet.</span>}
                        </div>
                      </div>
                      <div className="bg-[#f8f9ff] px-8 py-4 text-center border-t border-[#f1f3f9]">
                        <p className="text-[10px] font-[Manrope] text-[#b0b8cc]">
                          You're receiving this because you subscribed at Luxe Boutique.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Composer */
                  <div className="p-6 space-y-5">
                    <div>
                      <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-2">
                        Subject line <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <input
                        className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none focus:border-black transition-colors"
                        placeholder="e.g. New arrivals just dropped — shop the edit"
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d]">
                          Message body <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <span className="text-[10px] font-[Manrope] text-[#7c839b]">{wordCount} words · {charCount} chars</span>
                      </div>
                      <textarea
                        className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none focus:border-black transition-colors resize-none leading-relaxed"
                        rows={14}
                        placeholder={"Dear subscriber,\n\nWe're excited to share what's new at Luxe Boutique…\n\nWith love,\nThe Luxe Boutique Team"}
                        value={body}
                        onChange={e => setBody(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Footer send bar */}
                <div className="px-6 py-4 border-t border-[#e5eeff] bg-[#f8f9ff] flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-[11px] font-[Manrope] text-[#7c839b]">
                    <span className="material-symbols-outlined text-base text-[#006c49]">group</span>
                    Sending to <strong className="text-black">{data?.total ?? 0}</strong> subscriber{(data?.total ?? 0) !== 1 ? "s" : ""}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => sendMutation.mutate({ draft: true })}
                      disabled={!subject.trim() || !body.trim() || sendMutation.isPending}
                      className="px-5 py-2.5 border border-[#c6c6cd] text-[#45464d] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all rounded-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">draft</span> Save Draft
                    </button>
                    <button
                      onClick={() => sendMutation.mutate({})}
                      disabled={!subject.trim() || !body.trim() || sendMutation.isPending || (data?.total ?? 0) === 0}
                      className="px-8 py-2.5 bg-[#006c49] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-black transition-all rounded-lg shadow disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2">
                      {sendMutation.isPending
                        ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Sending…</>
                        : <><span className="material-symbols-outlined text-sm">send</span> Send Campaign</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: tips + growth chart */}
            <div className="col-span-12 lg:col-span-5 flex flex-col gap-6">
              <div className="bg-white rounded-xl p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[16px] font-serif font-semibold text-black mb-4">Writing tips</h3>
                <ul className="space-y-3">
                  {[
                    { icon: "subject",       tip: "Keep subject lines under 50 characters for best open rates." },
                    { icon: "waving_hand",   tip: "Open with a warm greeting — it increases engagement." },
                    { icon: "call_to_action",tip: "Always include a clear call-to-action (shop, read, explore)." },
                    { icon: "schedule",      tip: "Send Tuesday–Thursday mornings for highest click-through." },
                    { icon: "preview",       tip: "Use the Preview button to see exactly how subscribers will read it." },
                  ].map(({ icon, tip }) => (
                    <li key={icon} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#006c49] text-base mt-0.5 shrink-0">{icon}</span>
                      <p className="text-xs font-[Manrope] text-[#45464d] leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[16px] font-serif font-semibold text-black mb-5">Growth (last 6 months)</h3>
                {growth.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-[#7c839b]">
                    <span className="material-symbols-outlined text-3xl text-[#c6c6cd] mb-2">bar_chart</span>
                    <p className="text-xs font-[Manrope]">No data yet</p>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 h-28">
                    {growth.map(g => (
                      <div key={g.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] font-[Manrope] font-bold text-[#7c839b]">{g.count}</span>
                        <div
                          className="w-full bg-[#006c49] rounded-t-sm hover:bg-[#00a36d] transition-colors"
                          style={{ height: `${Math.max(4, (g.count / maxGrowth) * 90)}px` }}
                          title={`${fmtMonth(g.month)}: ${g.count}`}
                        />
                        <span className="text-[9px] font-[Manrope] text-[#7c839b]">{fmtMonth(g.month)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Subscribers Tab ── */}
        {tab === "subscribers" && (
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
                <span className="font-[Manrope] text-sm">Loading…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#7c839b]">
                <span className="material-symbols-outlined text-5xl text-[#c6c6cd]">mail</span>
                <p className="font-[Manrope] font-bold text-sm">{search ? "No results" : "No subscribers yet"}</p>
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
                        <button onClick={() => setDeleteId(s.id)}
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
        )}

        {/* ── Campaigns Tab ── */}
        {tab === "campaigns" && (
          <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="p-6 border-b border-[#e5eeff]">
              <h3 className="text-[18px] font-serif font-semibold text-black">Campaign History</h3>
            </div>
            {campaigns.length === 0 ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-[#7c839b]">
                <span className="material-symbols-outlined text-5xl text-[#c6c6cd]">campaign</span>
                <p className="font-[Manrope] font-bold text-sm">No campaigns sent yet</p>
                <button onClick={() => setTab("compose")}
                  className="mt-2 px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg">
                  Compose First Campaign
                </button>
              </div>
            ) : (
              <div className="divide-y divide-[#f0f2ff]">
                {campaigns.map(c => {
                  const cfg = STATUS_CFG[c.status] ?? STATUS_CFG.SENT;
                  const canResend = ["FAILED", "PARTIAL", "SENT"].includes(c.status);
                  const canEdit   = ["DRAFT", "FAILED"].includes(c.status);
                  return (
                    <div key={c.id} className="px-6 py-5 hover:bg-[#f8f9ff] transition-colors">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-[Manrope] font-bold text-sm text-[#0a0f0d] truncate">{c.subject}</p>
                          <p className="text-[12px] font-[Manrope] text-[#7c839b] mt-0.5 line-clamp-1">{c.body}</p>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-[Manrope] font-bold uppercase tracking-widest ${cfg.cls}`}>
                          <span className={`material-symbols-outlined text-[12px] ${c.status === "SENDING" ? "animate-spin" : ""}`}>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-5 text-[11px] font-[Manrope] text-[#7c839b]">
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">group</span>
                            {c.sentCount} / {c.recipientCount} delivered
                          </span>
                          {c.sentAt && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">schedule</span>
                              {fmtDate(c.sentAt)}
                            </span>
                          )}
                          {c.status === "DRAFT" && (
                            <span className="text-[#45464d]">Draft — not yet sent</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {canEdit && (
                            <button
                              onClick={() => { setEditingCampaign(c); setEditSubject(c.subject); setEditBody(c.body); }}
                              className="p-1.5 rounded-lg text-[#7c839b] hover:text-black hover:bg-[#eff4ff] transition-all"
                              title="Edit campaign">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                          )}
                          {canResend && (
                            <button
                              onClick={() => resendMutation.mutate(c.id)}
                              disabled={resendMutation.isPending}
                              className="p-1.5 rounded-lg text-[#7c839b] hover:text-[#006c49] hover:bg-[#e6f7f1] transition-all"
                              title="Resend campaign">
                              <span className={`material-symbols-outlined text-[16px] ${resendMutation.isPending ? "animate-spin" : ""}`}>
                                {resendMutation.isPending ? "autorenew" : "refresh"}
                              </span>
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteCampaignId(c.id)}
                            className="p-1.5 rounded-lg text-[#7c839b] hover:text-[#ba1a1a] hover:bg-[#ffdad6] transition-all"
                            title="Delete campaign">
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">delete</span>
            </div>
            <h3 className="text-[20px] font-serif font-bold text-black mb-2">Remove subscriber?</h3>
            <p className="text-sm font-[Manrope] text-[#45464d] mb-6">
              <strong>{subscribers.find(s => s.id === deleteId)?.email}</strong> will be unsubscribed. This cannot be undone.
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

      {/* Delete Campaign modal */}
      {deleteCampaignId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">campaign</span>
            </div>
            <h3 className="text-[20px] font-serif font-bold text-black mb-2">Delete campaign?</h3>
            <p className="text-sm font-[Manrope] text-[#45464d] mb-6">
              <strong>"{campaigns.find(c => c.id === deleteCampaignId)?.subject}"</strong> will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteCampaignId(null)}
                className="flex-1 py-2.5 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all rounded-lg">
                Cancel
              </button>
              <button onClick={() => deleteCampaignMutation.mutate(deleteCampaignId!)}
                disabled={deleteCampaignMutation.isPending}
                className="flex-1 py-2.5 bg-[#ba1a1a] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#93000a] transition-all rounded-lg disabled:opacity-60">
                {deleteCampaignMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Campaign modal */}
      {editingCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[20px] font-serif font-bold text-black">Edit Campaign</h3>
              <button onClick={() => setEditingCampaign(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#f8f9ff] transition-colors">
                <span className="material-symbols-outlined text-[#45464d]">close</span>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-1.5">
                  Subject line
                </label>
                <input
                  className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-2.5 font-[Manrope] text-sm outline-none focus:border-black"
                  value={editSubject}
                  onChange={e => setEditSubject(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-1.5">
                  Message body
                </label>
                <textarea
                  className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-2.5 font-[Manrope] text-sm outline-none focus:border-black resize-none"
                  rows={8}
                  value={editBody}
                  onChange={e => setEditBody(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setEditingCampaign(null)}
                  className="flex-1 py-3 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#f8f9ff] transition-all rounded-lg">
                  Cancel
                </button>
                <button onClick={() => editCampaignMutation.mutate()}
                  disabled={editCampaignMutation.isPending || !editSubject.trim() || !editBody.trim()}
                  className="flex-1 py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow disabled:opacity-50">
                  {editCampaignMutation.isPending ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
