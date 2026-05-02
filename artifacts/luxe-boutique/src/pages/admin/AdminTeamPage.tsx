import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  invitedBy: string | null;
  inviteToken: string | null;
  inviteLink?: string;
  lastLoginAt: string | null;
  createdAt: string;
};

const ROLES = ["Owner", "Admin", "Editor", "Viewer"] as const;
type Role = typeof ROLES[number];

const ROLE_META: Record<Role, { color: string; bg: string; icon: string; desc: string }> = {
  Owner:  { color: "text-[#b45309]", bg: "bg-amber-50 border-amber-200",   icon: "shield_person",  desc: "Full access — billing, team, and all settings." },
  Admin:  { color: "text-[#006c49]", bg: "bg-[#e6f7f1] border-[#c3eed8]", icon: "admin_panel_settings", desc: "Manage products, orders, customers, and channels." },
  Editor: { color: "text-[#1d4ed8]", bg: "bg-blue-50 border-blue-200",    icon: "edit_note",      desc: "Create and edit catalog, blog, and newsletters." },
  Viewer: { color: "text-[#7c839b]", bg: "bg-[#f0f2ff] border-[#c6c6cd]", icon: "visibility",     desc: "Read-only access to all admin sections." },
};

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  active:   { label: "Active",   color: "text-[#006c49]", bg: "bg-[#e6f7f1]", icon: "check_circle"   },
  pending:  { label: "Pending",  color: "text-amber-700", bg: "bg-amber-50",   icon: "schedule"       },
  disabled: { label: "Disabled", color: "text-[#7c839b]", bg: "bg-[#f0f2ff]", icon: "block"          },
};

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    const p = name.trim().split(" ");
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function AvatarCircle({ name, email, size = "md" }: { name: string | null; email: string; size?: "sm" | "md" | "lg" }) {
  const initials = getInitials(name, email);
  const hash = Array.from(email).reduce((a, c) => a + c.charCodeAt(0), 0);
  const palettes = [
    "bg-emerald-700 text-white", "bg-blue-700 text-white", "bg-violet-700 text-white",
    "bg-rose-600 text-white",    "bg-amber-600 text-white", "bg-cyan-700 text-white",
  ];
  const cls = palettes[hash % palettes.length];
  const sz = size === "sm" ? "w-8 h-8 text-[11px]" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} ${cls} rounded-full flex items-center justify-center font-bold shrink-0 select-none`}>
      {initials}
    </div>
  );
}

export default function AdminTeamPage() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite]   = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName,  setInviteName]  = useState("");
  const [inviteRole,  setInviteRole]  = useState<Role>("Editor");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [newLink,     setNewLink]     = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);

  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editRole,    setEditRole]    = useState<Role>("Editor");
  const [removeId,    setRemoveId]    = useState<string | null>(null);
  const [toast,       setToast]       = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3500); };

  const { data: members = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["team"],
    queryFn: async () => {
      const r = await fetch("/api/team");
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
  });

  const inviteMut = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, name: inviteName || undefined, role: inviteRole }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error ?? "Failed"); }
      return r.json() as Promise<TeamMember & { inviteLink: string }>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["team"] });
      setNewLink(data.inviteLink);
      setInviteEmail(""); setInviteName(""); setInviteRole("Editor"); setInviteError(null);
    },
    onError: (e: Error) => setInviteError(e.message),
  });

  const updateMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      const r = await fetch(`/api/team/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team"] }); setEditingId(null); showToast("Role updated."); },
  });

  const statusMut = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const r = await fetch(`/api/team/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!r.ok) throw new Error("Failed");
      return r.json();
    },
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ["team"] });
      showToast(status === "disabled" ? "Member disabled." : "Member re-enabled.");
    },
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/team/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("Failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["team"] }); setRemoveId(null); showToast("Member removed."); },
  });

  const resendMut = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/team/${id}/resend`, { method: "POST" });
      if (!r.ok) throw new Error("Failed");
      return r.json() as Promise<TeamMember & { inviteLink: string }>;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["team"] });
      setNewLink(data.inviteLink);
      setShowInvite(true);
      showToast("Invite resent.");
    },
  });

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(window.location.origin + link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const active  = members.filter(m => m.status === "active").length;
  const pending = members.filter(m => m.status === "pending").length;

  const roleCount = (r: Role) => members.filter(m => m.role === r).length;

  return (
    <AdminLayout sidebar="main">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] bg-black text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 font-[Manrope] text-sm font-bold animate-in slide-in-from-bottom-4">
          <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>
          {toast}
        </div>
      )}

      <div className="p-8 bg-[#f8f9ff] min-h-screen">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-[32px] font-serif font-semibold text-black leading-tight">Team</h1>
            <p className="text-sm font-[Manrope] text-[#7c839b] mt-1">Invite staff, assign roles, and manage admin access.</p>
          </div>
          <button onClick={() => { setShowInvite(true); setNewLink(null); }}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg shadow">
            <span className="material-symbols-outlined text-sm">person_add</span>
            Invite Member
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Members", value: members.length, icon: "group",        color: "text-black"       },
            { label: "Active",        value: active,         icon: "check_circle",  color: "text-[#006c49]"   },
            { label: "Pending Invite",value: pending,        icon: "schedule",      color: "text-amber-600"   },
            { label: "Roles Assigned",value: new Set(members.map(m => m.role)).size, icon: "badge", color: "text-[#1d4ed8]" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-5 flex items-center gap-4">
              <div className="w-10 h-10 bg-[#f0f2ff] rounded-xl flex items-center justify-center shrink-0">
                <span className={`material-symbols-outlined text-lg ${s.color}`}>{s.icon}</span>
              </div>
              <div>
                <p className="text-[28px] font-serif font-bold text-black leading-none">{s.value}</p>
                <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mt-1">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Role legend */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {ROLES.map(r => {
            const m = ROLE_META[r];
            return (
              <div key={r} className={`bg-white border rounded-xl p-4 flex gap-3 shadow-[0px_2px_8px_rgba(15,23,42,0.04)]`}>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${m.bg}`}>
                  <span className={`material-symbols-outlined text-sm ${m.color}`}>{m.icon}</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className={`text-xs font-[Manrope] font-bold ${m.color}`}>{r}</p>
                    <span className="text-[9px] font-[Manrope] font-bold text-[#7c839b] bg-[#f0f2ff] px-1.5 py-0.5 rounded-full">{roleCount(r)}</span>
                  </div>
                  <p className="text-[11px] font-[Manrope] text-[#7c839b] leading-snug">{m.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Members table */}
        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
          <div className="px-8 py-5 border-b border-[#e5eeff] flex items-center justify-between">
            <h2 className="font-serif font-semibold text-[18px]">
              Staff Members
              <span className="ml-2 text-sm text-[#7c839b] font-[Manrope] font-normal">({members.length})</span>
            </h2>
          </div>

          {isLoading ? (
            <div className="py-20 flex items-center justify-center gap-3 text-[#7c839b] font-[Manrope]">
              <span className="material-symbols-outlined animate-spin">autorenew</span> Loading team…
            </div>
          ) : members.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-4 text-center">
              <div className="w-16 h-16 bg-[#f0f2ff] rounded-2xl flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-[#7c839b]">group_add</span>
              </div>
              <div>
                <p className="font-serif text-[20px] font-semibold mb-1">No team members yet</p>
                <p className="text-sm font-[Manrope] text-[#7c839b] max-w-sm">Invite your first staff member to start collaborating on LUXE BOUTIQUE.</p>
              </div>
              <button onClick={() => { setShowInvite(true); setNewLink(null); }}
                className="mt-2 px-6 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">person_add</span>
                Send First Invite
              </button>
            </div>
          ) : (
            <div className="divide-y divide-[#f0f2ff]">
              {/* Table header */}
              <div className="grid grid-cols-12 gap-4 px-8 py-3 bg-[#f8f9ff]">
                <div className="col-span-4 text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Member</div>
                <div className="col-span-2 text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Role</div>
                <div className="col-span-2 text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Status</div>
                <div className="col-span-2 text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Last Active</div>
                <div className="col-span-2 text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">Actions</div>
              </div>

              {members.map(m => {
                const roleMeta   = ROLE_META[m.role as Role]  ?? ROLE_META.Viewer;
                const statusMeta = STATUS_META[m.status] ?? STATUS_META.pending;
                const isEditing  = editingId === m.id;

                return (
                  <div key={m.id} className={`grid grid-cols-12 gap-4 px-8 py-4 items-center hover:bg-[#fafbff] transition-colors ${m.status === "disabled" ? "opacity-60" : ""}`}>
                    {/* Member */}
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <AvatarCircle name={m.name} email={m.email} />
                      <div className="min-w-0">
                        <p className="font-[Manrope] font-bold text-sm text-black truncate">{m.name ?? "—"}</p>
                        <p className="font-[Manrope] text-xs text-[#7c839b] truncate">{m.email}</p>
                        {m.invitedBy && (
                          <p className="text-[10px] font-[Manrope] text-[#c6c6cd] mt-0.5">Invited by {m.invitedBy}</p>
                        )}
                      </div>
                    </div>

                    {/* Role */}
                    <div className="col-span-2">
                      {isEditing ? (
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value as Role)}
                          className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-2 py-1.5 text-xs font-[Manrope] font-bold outline-none focus:border-black"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-[Manrope] font-bold ${roleMeta.bg} ${roleMeta.color}`}>
                          <span className="material-symbols-outlined text-[11px]">{roleMeta.icon}</span>
                          {m.role}
                        </span>
                      )}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-[Manrope] font-bold ${statusMeta.bg} ${statusMeta.color}`}>
                        <span className="material-symbols-outlined text-[11px]">{statusMeta.icon}</span>
                        {statusMeta.label}
                      </span>
                    </div>

                    {/* Last Active */}
                    <div className="col-span-2">
                      <p className="text-xs font-[Manrope] text-[#7c839b]">
                        {m.lastLoginAt ? timeAgo(m.lastLoginAt) : m.status === "pending" ? "Not joined" : "Never"}
                      </p>
                      <p className="text-[10px] font-[Manrope] text-[#c6c6cd] mt-0.5">Joined {timeAgo(m.createdAt)}</p>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center gap-1 flex-wrap">
                      {isEditing ? (
                        <>
                          <button onClick={() => updateMut.mutate({ id: m.id, role: editRole })} disabled={updateMut.isPending}
                            className="px-3 py-1.5 bg-black text-white text-[10px] font-[Manrope] font-bold uppercase tracking-widest rounded-lg hover:bg-[#006c49] transition-all disabled:opacity-60 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">check</span> Save
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="px-3 py-1.5 border border-[#c6c6cd] text-[10px] font-[Manrope] font-bold uppercase tracking-widest rounded-lg hover:bg-[#f0f2ff] transition-all">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(m.id); setEditRole(m.role as Role); }}
                            title="Change role"
                            className="w-8 h-8 rounded-lg hover:bg-[#f0f2ff] flex items-center justify-center text-[#7c839b] hover:text-black transition-colors">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          {m.status === "pending" && (
                            <button onClick={() => resendMut.mutate(m.id)} disabled={resendMut.isPending}
                              title="Resend invite"
                              className="w-8 h-8 rounded-lg hover:bg-[#f0f2ff] flex items-center justify-center text-[#7c839b] hover:text-[#006c49] transition-colors">
                              <span className={`material-symbols-outlined text-sm ${resendMut.isPending ? "animate-spin" : ""}`}>forward_to_inbox</span>
                            </button>
                          )}
                          {m.status === "active" && (
                            <button onClick={() => statusMut.mutate({ id: m.id, status: "disabled" })}
                              title="Disable member"
                              className="w-8 h-8 rounded-lg hover:bg-amber-50 flex items-center justify-center text-[#7c839b] hover:text-amber-600 transition-colors">
                              <span className="material-symbols-outlined text-sm">person_off</span>
                            </button>
                          )}
                          {m.status === "disabled" && (
                            <button onClick={() => statusMut.mutate({ id: m.id, status: "active" })}
                              title="Re-enable member"
                              className="w-8 h-8 rounded-lg hover:bg-[#e6f7f1] flex items-center justify-center text-[#7c839b] hover:text-[#006c49] transition-colors">
                              <span className="material-symbols-outlined text-sm">person_check</span>
                            </button>
                          )}
                          <button onClick={() => setRemoveId(m.id)}
                            title="Remove member"
                            className="w-8 h-8 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#7c839b] hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-sm">person_remove</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Invite Modal ── */}
      {showInvite && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.2)] w-full max-w-lg overflow-hidden">
            <div className="px-8 py-6 border-b border-[#e5eeff] flex items-center justify-between">
              <div>
                <h2 className="font-serif text-[22px] font-semibold">Invite Team Member</h2>
                <p className="text-xs font-[Manrope] text-[#7c839b] mt-0.5">They'll receive a link to join the admin portal.</p>
              </div>
              <button onClick={() => { setShowInvite(false); setNewLink(null); setInviteError(null); }}
                className="w-9 h-9 rounded-full hover:bg-[#f0f2ff] flex items-center justify-center text-[#7c839b] hover:text-black transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {newLink ? (
              <div className="p-8 space-y-5">
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#e6f7f1] flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#006c49] text-3xl">mark_email_read</span>
                  </div>
                  <div>
                    <p className="font-serif text-[20px] font-semibold mb-1">Invite Created!</p>
                    <p className="text-sm font-[Manrope] text-[#7c839b]">Share this link with the new team member.</p>
                  </div>
                </div>

                <div className="bg-[#f8f9ff] border border-[#e5eeff] rounded-xl p-4">
                  <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-2">Invite Link</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-[#006c49] break-all">{window.location.origin}{newLink}</code>
                    <button onClick={() => copyLink(newLink)}
                      className={`shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-[Manrope] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${copied ? "bg-[#006c49] text-white" : "border border-[#c6c6cd] hover:bg-[#f0f2ff]"}`}>
                      <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>

                <p className="text-[11px] font-[Manrope] text-[#7c839b] text-center">
                  Link expires in 7 days. Once accepted, the member's status will change to Active.
                </p>

                <div className="flex gap-3">
                  <button onClick={() => { setNewLink(null); }}
                    className="flex-1 py-2.5 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#f0f2ff] transition-all">
                    Invite Another
                  </button>
                  <button onClick={() => { setShowInvite(false); setNewLink(null); }}
                    className="flex-1 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#006c49] transition-all">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-8 space-y-5">
                <div>
                  <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={e => { setInviteEmail(e.target.value); setInviteError(null); }}
                    placeholder="staff@luxeboutique.com"
                    className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none focus:border-black transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-2">Full Name</label>
                  <input
                    type="text"
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    placeholder="Alex Johnson (optional)"
                    className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-3 font-[Manrope] text-sm outline-none focus:border-black transition-colors"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-2">Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLES.map(r => {
                      const m = ROLE_META[r];
                      const isSelected = inviteRole === r;
                      return (
                        <button key={r} onClick={() => setInviteRole(r)}
                          className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                            isSelected ? "border-black bg-black text-white" : "border-[#e5eeff] hover:border-[#c6c6cd] bg-white"
                          }`}>
                          <span className={`material-symbols-outlined text-sm shrink-0 mt-0.5 ${isSelected ? "text-white" : m.color}`}>{m.icon}</span>
                          <div>
                            <p className={`text-xs font-[Manrope] font-bold ${isSelected ? "text-white" : "text-black"}`}>{r}</p>
                            <p className={`text-[10px] font-[Manrope] leading-snug mt-0.5 ${isSelected ? "text-white/70" : "text-[#7c839b]"}`}>{m.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {inviteError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm font-[Manrope] text-red-600">
                    <span className="material-symbols-outlined text-base shrink-0">error</span>
                    {inviteError}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowInvite(false); setInviteError(null); }}
                    className="flex-1 py-3 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#f0f2ff] transition-all">
                    Cancel
                  </button>
                  <button
                    onClick={() => inviteMut.mutate()}
                    disabled={!inviteEmail.trim() || inviteMut.isPending}
                    className="flex-1 py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#006c49] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                    {inviteMut.isPending
                      ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Sending…</>
                      : <><span className="material-symbols-outlined text-sm">send</span> Send Invite</>
                    }
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Remove Confirm Dialog ── */}
      {removeId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-[0_24px_80px_rgba(15,23,42,0.2)] w-full max-w-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-red-500 text-2xl">person_remove</span>
            </div>
            <div>
              <p className="font-serif text-[20px] font-semibold mb-1">Remove Member?</p>
              <p className="text-sm font-[Manrope] text-[#7c839b]">
                This will permanently remove {members.find(m => m.id === removeId)?.email} from the team. They'll lose all admin access immediately.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRemoveId(null)}
                className="flex-1 py-2.5 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-[#f0f2ff] transition-all">
                Cancel
              </button>
              <button onClick={() => removeMut.mutate(removeId!)} disabled={removeMut.isPending}
                className="flex-1 py-2.5 bg-red-600 text-white font-[Manrope] font-bold text-xs tracking-widest uppercase rounded-lg hover:bg-red-700 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                {removeMut.isPending
                  ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Removing…</>
                  : "Remove"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
