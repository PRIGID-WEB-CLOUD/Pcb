import { useState, useEffect } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type Tab = "credentials" | "account" | "media" | "publish";

interface IgAccount {
  instagram_business_account?: {
    id: string; name: string; username: string;
    profile_picture_url: string; followers_count: number; media_count: number;
  };
}

interface IgMedia {
  id: string; caption?: string; media_type: string; media_url?: string;
  thumbnail_url?: string; timestamp: string; like_count: number;
  comments_count: number; permalink: string;
}

const CHANNEL = "instagram";

function CredField({ label, hint, value, onChange, type = "text" }: {
  label: string; hint: string; value: string;
  onChange: (v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={hint}
        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49]/20 focus:border-[#006c49] font-mono"
      />
    </div>
  );
}

export default function AdminInstagramPage() {
  const [tab, setTab] = useState<Tab>("credentials");
  const [creds, setCreds] = useState({ ig_user_id: "", page_access_token: "" });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [account, setAccount] = useState<IgAccount | null>(null);
  const [accountErr, setAccountErr] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [media, setMedia] = useState<IgMedia[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaErr, setMediaErr] = useState("");
  const [caption, setCaption] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState("");

  useEffect(() => {
    fetch("/api/channels/credentials/instagram", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Record<string, string>) => {
        setCreds({
          ig_user_id: data.ig_user_id ?? "",
          page_access_token: data.page_access_token ?? "",
        });
      })
      .catch(() => {});
  }, []);

  async function saveCreds() {
    setSaving(true); setSaveMsg("");
    try {
      await fetch(`/api/channels/credentials/${CHANNEL}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(creds),
      });
      setSaveMsg("Credentials saved.");
    } catch { setSaveMsg("Save failed."); }
    setSaving(false);
  }

  async function fetchAccount() {
    setAccountLoading(true); setAccountErr("");
    try {
      const r = await fetch("/api/facebook/instagram/account", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) { setAccountErr(d.error ?? "Failed"); }
      else setAccount(d);
    } catch { setAccountErr("Network error"); }
    setAccountLoading(false);
  }

  async function fetchMedia() {
    setMediaLoading(true); setMediaErr("");
    try {
      const r = await fetch("/api/facebook/instagram/media", { credentials: "include" });
      const d = await r.json();
      if (!r.ok) { setMediaErr(d.error ?? "Failed"); setMedia([]); }
      else setMedia(d.data ?? []);
    } catch { setMediaErr("Network error"); }
    setMediaLoading(false);
  }

  async function publishPost() {
    if (!imageUrl.trim()) { setPublishMsg("Image URL is required."); return; }
    setPublishing(true); setPublishMsg("");
    try {
      const r = await fetch("/api/facebook/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl: imageUrl.trim(), caption: caption.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setPublishMsg(d.error ?? "Publish failed"); }
      else {
        setPublishMsg(`Published! Media ID: ${d.mediaId}`);
        setCaption(""); setImageUrl("");
      }
    } catch { setPublishMsg("Network error"); }
    setPublishing(false);
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "credentials", label: "Credentials", icon: "key" },
    { id: "account",     label: "Account",     icon: "account_circle" },
    { id: "media",       label: "Media Feed",  icon: "photo_library" },
    { id: "publish",     label: "Publish",     icon: "upload" },
  ];

  const ig = account?.instagram_business_account;

  return (
    <AdminLayout sidebar="channels">
      <div className="flex-1 ml-0 p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/channels" className="text-slate-400 hover:text-slate-600 transition-colors">
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888] flex items-center justify-center text-white">
            <span className="material-symbols-outlined text-xl">photo_camera</span>
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900" style={{ fontFamily: "Noto Serif, serif" }}>Instagram Business</h1>
            <p className="text-xs text-slate-500">Publish posts, view media feed, and manage your Instagram account</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === "account") fetchAccount(); if (t.id === "media") fetchMedia(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              <span className="material-symbols-outlined text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "credentials" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1">Instagram API Credentials</h2>
            <p className="text-sm text-slate-500 mb-5">
              Get your Instagram Business Account ID and Page Access Token from{" "}
              <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-[#006c49] underline">Meta Developer Console</a>.
              Your Instagram account must be connected to a Facebook Page.
            </p>
            <div className="space-y-4 max-w-lg">
              <CredField label="Instagram Business Account ID" hint="17841400000000000" value={creds.ig_user_id} onChange={(v) => setCreds((p) => ({ ...p, ig_user_id: v }))} />
              <CredField label="Page Access Token" hint="EAABsbCS..." value={creds.page_access_token} onChange={(v) => setCreds((p) => ({ ...p, page_access_token: v }))} type="password" />
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button onClick={saveCreds} disabled={saving} className="px-5 py-2 bg-[#006c49] text-white text-sm font-medium rounded-lg hover:bg-[#005a3d] disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : "Save Credentials"}
              </button>
              {saveMsg && <span className="text-sm text-[#006c49]">{saveMsg}</span>}
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-semibold text-slate-700 mb-2">How to get your Instagram Business Account ID</p>
              <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                <li>Go to Meta Developer Console → Your App → Instagram API</li>
                <li>Connect your Facebook Page (must have linked Instagram account)</li>
                <li>Use the Graph API Explorer: <code className="bg-white px-1 rounded border">GET /&#123;page-id&#125;?fields=instagram_business_account</code></li>
                <li>Copy the nested <code className="bg-white px-1 rounded border">id</code> — that is your IG Business Account ID</li>
                <li>Generate a long-lived Page Access Token for your Page</li>
              </ol>
            </div>
          </div>
        )}

        {tab === "account" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Account Overview</h2>
              <button onClick={fetchAccount} disabled={accountLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-base">refresh</span>
                {accountLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
            {accountErr && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">{accountErr}</div>
            )}
            {!ig && !accountErr && !accountLoading && (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-3 block">photo_camera</span>
                <p className="text-sm">Click Refresh to load your Instagram account</p>
              </div>
            )}
            {ig && (
              <div className="flex items-start gap-5">
                <img src={ig.profile_picture_url} alt={ig.username} className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                <div className="flex-1">
                  <p className="text-lg font-semibold text-slate-900">@{ig.username}</p>
                  <p className="text-sm text-slate-500 mb-4">{ig.name}</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                      <p className="text-xl font-bold text-slate-900">{ig.followers_count?.toLocaleString() ?? "—"}</p>
                      <p className="text-xs text-slate-500">Followers</p>
                    </div>
                    <div className="text-center p-3 bg-slate-50 rounded-xl">
                      <p className="text-xl font-bold text-slate-900">{ig.media_count?.toLocaleString() ?? "—"}</p>
                      <p className="text-xs text-slate-500">Posts</p>
                    </div>
                    <div className="text-center p-3 bg-[#006c49]/5 rounded-xl">
                      <p className="text-xl font-bold text-[#006c49]">Active</p>
                      <p className="text-xs text-slate-500">Status</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "media" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-slate-900">Media Feed</h2>
              <button onClick={fetchMedia} disabled={mediaLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                <span className="material-symbols-outlined text-base">refresh</span>
                {mediaLoading ? "Loading…" : "Refresh"}
              </button>
            </div>
            {mediaErr && <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 mb-4">{mediaErr}</div>}
            {!media.length && !mediaErr && (
              <div className="text-center py-12 text-slate-400">
                <span className="material-symbols-outlined text-4xl mb-3 block">photo_library</span>
                <p className="text-sm">Click Refresh to load your Instagram media</p>
              </div>
            )}
            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {media.map((m) => (
                  <a key={m.id} href={m.permalink} target="_blank" rel="noreferrer" className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 block">
                    {(m.media_url || m.thumbnail_url) && (
                      <img src={m.media_url ?? m.thumbnail_url} alt={m.caption ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                      <div className="p-2 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-3 text-white text-xs font-semibold">
                          <span>♥ {m.like_count}</span>
                          <span>💬 {m.comments_count}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "publish" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-xl">
            <h2 className="text-base font-semibold text-slate-900 mb-5">Publish to Instagram</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Image URL <span className="text-red-500">*</span></label>
                <input
                  value={imageUrl} onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://your-cdn.com/image.jpg"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49]/20 focus:border-[#006c49]"
                />
                <p className="text-xs text-slate-400 mt-1">Must be a publicly accessible URL (JPEG/PNG recommended)</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Caption</label>
                <textarea
                  value={caption} onChange={(e) => setCaption(e.target.value)}
                  rows={4} maxLength={2200}
                  placeholder="Write your caption here…"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#006c49]/20 focus:border-[#006c49] resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">{caption.length}/2200</p>
              </div>
              {imageUrl && (
                <div className="rounded-xl overflow-hidden bg-slate-100 aspect-square max-w-xs">
                  <img src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = ""; }} />
                </div>
              )}
              <button
                onClick={publishPost} disabled={publishing}
                className="w-full py-2.5 bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {publishing ? "Publishing…" : "Publish to Instagram"}
              </button>
              {publishMsg && (
                <p className={`text-sm ${publishMsg.startsWith("Published") ? "text-[#006c49]" : "text-red-600"}`}>{publishMsg}</p>
              )}
              <p className="text-xs text-slate-400">
                Note: Instagram requires a 3-second processing window between container creation and publishing. Large images may take longer.
              </p>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
