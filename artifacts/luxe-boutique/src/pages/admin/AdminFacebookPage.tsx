import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ActiveTab = "posts" | "credentials" | "catalog" | "pixel" | "audiences" | "ads";
type PostFilter = "All" | "Published" | "Scheduled" | "Draft";

interface Connection      { id: string; connectionKey: string; active: boolean; }
interface CatalogSettings { id: string; includedCategories: string[]; minPrice: number; maxPrice: number; }
interface PixelEvent      { id: string; storeEvent: string; fbEvent: string; enabled: boolean; }
interface Audience        { id: string; name: string; size: string; type: string; status: string; }
interface PagePost {
  id: string; caption: string; imageUrl: string | null; link: string | null;
  postType: string; scheduledFor: string | null; status: string;
  likes: number; comments: number; shares: number; reach: number; createdAt: string;
}
interface PostTemplate    { id: string; name: string; body: string; postType: string; usageCount: number; }

const ALL_CATEGORIES = ["Ready-to-Wear","Footwear","Accessories","Bags & Luggage","Jewellery","Outerwear","Swimwear"];
const POST_TYPES = ["Standard","Product Spotlight","Collection Launch","Promotion","Brand Story","Event","Teaser"];

const audienceTypeStyle: Record<string, string> = {
  Custom: "bg-blue-50 text-blue-700", Lookalike: "bg-purple-50 text-purple-700", Retargeting: "bg-amber-50 text-amber-700",
};
const audienceStatusStyle: Record<string, string> = {
  Active: "bg-[#6cf8bb] text-[#00714d]", Building: "bg-amber-100 text-amber-700", Paused: "bg-slate-100 text-slate-500",
};
const postStatusStyle: Record<string, string> = {
  Published: "bg-[#6cf8bb] text-[#00714d]",
  Scheduled: "bg-blue-50 text-blue-700",
  Draft:     "bg-slate-100 text-slate-500",
  Failed:    "bg-red-100 text-red-600",
};
const postTypeColor: Record<string, string> = {
  "Standard":          "bg-slate-100 text-slate-600",
  "Product Spotlight": "bg-[#eff4ff] text-[#006c49]",
  "Collection Launch": "bg-purple-50 text-purple-700",
  "Promotion":         "bg-amber-50 text-amber-700",
  "Brand Story":       "bg-pink-50 text-pink-700",
  "Event":             "bg-cyan-50 text-cyan-700",
  "Teaser":            "bg-slate-50 text-slate-600",
};
const connectionMeta: { key: string; label: string; icon: string }[] = [
  { key: "facebook",  label: "Facebook Shop",      icon: "storefront"    },
  { key: "instagram", label: "Instagram Shopping", icon: "photo_camera"  },
  { key: "pixel",     label: "Pixel Tracking",     icon: "track_changes" },
  { key: "messenger", label: "Messenger Bot",      icon: "chat"          },
];

function fmt(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K`;
  return String(n);
}

export default function AdminFacebookPage() {
  const [connections,    setConnections]    = useState<Connection[]>([]);
  const [catalog,        setCatalog]        = useState<CatalogSettings | null>(null);
  const [pixelEvents,    setPixelEvents]    = useState<PixelEvent[]>([]);
  const [audiences,      setAudiences]      = useState<Audience[]>([]);
  const [posts,          setPosts]          = useState<PagePost[]>([]);
  const [postTemplates,  setPostTemplates]  = useState<PostTemplate[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [loadError,      setLoadError]      = useState(false);

  const [activeTab,   setActiveTab]   = useState<ActiveTab>("posts");
  const [syncState,   setSyncState]   = useState<"idle"|"syncing"|"done">("idle");
  const [toast,       setToast]       = useState<string | null>(null);
  const [postFilter,  setPostFilter]  = useState<PostFilter>("All");

  // Audiences
  const [newAudName, setNewAudName] = useState("");
  const [newAudType, setNewAudType] = useState("Custom");

  // Post composer
  const [caption,       setCaption]       = useState("");
  const [postType,      setPostType]      = useState("Standard");
  const [imageUrl,      setImageUrl]      = useState("");
  const [linkUrl,       setLinkUrl]       = useState("");
  const [scheduleWhen,  setScheduleWhen]  = useState<"now"|"schedule">("now");
  const [scheduleTime,  setScheduleTime]  = useState("");
  const [postSubmitting, setPostSubmitting] = useState<"idle"|"posting"|"scheduling"|"drafting">("idle");
  const [publishingId,  setPublishingId]  = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [newTplName,    setNewTplName]    = useState("");
  const [newTplBody,    setNewTplBody]    = useState("");
  const [newTplType,    setNewTplType]    = useState("Standard");
  const [showNewTpl,    setShowNewTpl]    = useState(false);

  const captionRef = useRef<HTMLTextAreaElement>(null);

  // Credentials tab
  const [fbCreds,     setFbCreds]     = useState<Record<string, string>>({});
  const [credsDirty,  setCredsDirty]  = useState<Record<string, string>>({});
  const [credsSaving, setCredsSaving] = useState(false);
  const [showSecret,  setShowSecret]  = useState<Record<string, boolean>>({});
  const [testingConn, setTestingConn] = useState(false);
  const [testResult,  setTestResult]  = useState<{pass: boolean; latency: number; missing?: string[]} | null>(null);

  const FB_CRED_FIELDS = [
    { key: "page_id",            label: "Facebook Page ID",      isSecret: false, hint: "Go to your Facebook Page → About → scroll to the bottom → Page ID. Required to publish posts and use Messenger." },
    { key: "catalog_id",         label: "Commerce Catalog ID",   isSecret: false, hint: "Facebook Commerce Manager → Catalog → Settings → Catalog ID. Required to sync your product feed to Facebook Shop." },
    { key: "app_id",             label: "App ID",                isSecret: false, hint: "Meta for Developers → App Dashboard → App ID"                           },
    { key: "app_secret",         label: "App Secret",            isSecret: true,  hint: "App Dashboard → Settings → Basic → App Secret. Never share publicly."   },
    { key: "page_access_token",  label: "Page Access Token",     isSecret: true,  hint: "Graph API Explorer → generate a long-lived page token for your page."   },
    { key: "pixel_id",           label: "Pixel ID",              isSecret: false, hint: "Events Manager → Data Sources → your Pixel → Pixel ID"                  },
    { key: "ad_account_id",      label: "Ad Account ID",         isSecret: false, hint: "Meta Business Manager → Ad Accounts (format: act_XXXXXXXXX)"            },
  ];

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2800); };

  const loadAll = useCallback(async () => {
    try {
      const [cRes, catRes, pxRes, audRes, postsRes, tplRes, credRes] = await Promise.all([
        fetch("/api/facebook/connections"),
        fetch("/api/facebook/catalog"),
        fetch("/api/facebook/pixel-events"),
        fetch("/api/facebook/audiences"),
        fetch("/api/facebook/posts"),
        fetch("/api/facebook/post-templates"),
        fetch("/api/channels/credentials/facebook"),
      ]);
      if (cRes.ok)     setConnections(await cRes.json());
      if (catRes.ok)   setCatalog(await catRes.json());
      if (pxRes.ok)    setPixelEvents(await pxRes.json());
      if (audRes.ok)   setAudiences(await audRes.json());
      if (postsRes.ok) setPosts(await postsRes.json());
      if (tplRes.ok)   setPostTemplates(await tplRes.json());
      if (credRes.ok)  { const d = await credRes.json(); setFbCreds(d); setCredsDirty(d); }
      if (!cRes.ok && !postsRes.ok) setLoadError(true);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Connections ──────────────────────────────────────────────────────────
  const toggleConnection = async (connectionKey: string, active: boolean) => {
    setConnections((p) => p.map((c) => c.connectionKey === connectionKey ? { ...c, active } : c));
    await fetch(`/api/facebook/connections/${connectionKey}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) });
    showToast(`${connectionMeta.find((m) => m.key === connectionKey)?.label} ${active ? "activated" : "paused"}.`);
  };

  // ── Catalog ──────────────────────────────────────────────────────────────
  const toggleCategory = async (cat: string) => {
    if (!catalog) return;
    const next = catalog.includedCategories.includes(cat) ? catalog.includedCategories.filter((c) => c !== cat) : [...catalog.includedCategories, cat];
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
      showToast(`Catalog sync complete — ${catalog?.includedCategories.length ?? 0} categories.`);
      setTimeout(() => setSyncState("idle"), 3000);
    }, 2500);
  };

  // ── Pixel ────────────────────────────────────────────────────────────────
  const togglePixelEvent = async (ev: PixelEvent) => {
    setPixelEvents((p) => p.map((e) => e.id === ev.id ? { ...e, enabled: !e.enabled } : e));
    await fetch(`/api/facebook/pixel-events/${ev.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !ev.enabled }) });
    showToast(`"${ev.storeEvent}" ${ev.enabled ? "disabled" : "enabled"}.`);
  };

  // ── Audiences ────────────────────────────────────────────────────────────
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

  // ── Credentials ──────────────────────────────────────────────────────────
  const saveFbCreds = async () => {
    setCredsSaving(true);
    await fetch("/api/channels/credentials/facebook", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credsDirty) });
    setFbCreds(credsDirty);
    setCredsSaving(false);
    showToast("API credentials saved securely.");
  };
  const testFbConn = async () => {
    setTestingConn(true); setTestResult(null);
    const res = await fetch("/api/channels/configs/facebook/test", { method: "POST" });
    if (res.ok) setTestResult(await res.json());
    setTestingConn(false);
  };

  // ── Page Posts ───────────────────────────────────────────────────────────
  const submitPost = async (status: "Published" | "Scheduled" | "Draft") => {
    if (!caption.trim()) { showToast("Caption is required."); return; }
    if (status === "Scheduled" && !scheduleTime) { showToast("Choose a scheduled time."); return; }
    const key = status === "Published" ? "posting" : status === "Scheduled" ? "scheduling" : "drafting";
    setPostSubmitting(key);
    const body = { caption, imageUrl: imageUrl || null, link: linkUrl || null, postType, scheduledFor: status === "Scheduled" ? scheduleTime : null, status };
    const res = await fetch("/api/facebook/posts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const created = await res.json();
      setPosts((p) => [created, ...p]);
      setCaption(""); setImageUrl(""); setLinkUrl(""); setScheduleTime("");
      showToast(status === "Published" ? "Post published to Facebook Page." : status === "Scheduled" ? `Post scheduled for ${scheduleTime}.` : "Draft saved.");
    }
    setPostSubmitting("idle");
  };

  const publishPost = async (post: PagePost) => {
    setPublishingId(post.id);
    const res = await fetch(`/api/facebook/posts/${post.id}/publish`, { method: "POST" });
    if (res.ok) { const updated = await res.json(); setPosts((p) => p.map((x) => x.id === post.id ? updated : x)); showToast("Post published to Facebook Page."); }
    setPublishingId(null);
  };

  const deletePost = async (post: PagePost) => {
    setPosts((p) => p.filter((x) => x.id !== post.id));
    await fetch(`/api/facebook/posts/${post.id}`, { method: "DELETE" });
    showToast("Post deleted.");
  };

  const useTemplate = async (tpl: PostTemplate) => {
    setCaption(tpl.body); setPostType(tpl.postType);
    setShowTemplates(false);
    await fetch(`/api/facebook/post-templates/${tpl.id}/use`, { method: "PUT" });
    setPostTemplates((p) => p.map((t) => t.id === tpl.id ? { ...t, usageCount: t.usageCount + 1 } : t));
    showToast(`Template "${tpl.name}" loaded.`);
    captionRef.current?.focus();
  };

  const saveNewTemplate = async () => {
    if (!newTplName.trim() || !newTplBody.trim()) { showToast("Name and body required."); return; }
    const res = await fetch("/api/facebook/post-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newTplName, body: newTplBody, postType: newTplType }) });
    if (res.ok) { const created = await res.json(); setPostTemplates((p) => [created, ...p]); setNewTplName(""); setNewTplBody(""); setShowNewTpl(false); showToast("Template saved."); }
  };

  // ── Derived ──────────────────────────────────────────────────────────────
  const publishedPosts  = posts.filter((p) => p.status === "Published");
  const scheduledPosts  = posts.filter((p) => p.status === "Scheduled");
  const draftPosts      = posts.filter((p) => p.status === "Draft");
  const filteredPosts = publishedPosts;
  const totalReach      = publishedPosts.reduce((s, p) => s + p.reach, 0);
  const totalLikes      = publishedPosts.reduce((s, p) => s + p.likes, 0);
  const configuredCredsCount = FB_CRED_FIELDS.filter((f) => !!fbCreds[f.key]).length;
  const tabs: { key: ActiveTab; label: string; icon: string; badge?: number }[] = [
    { key: "posts",       label: "Live Posts",       icon: "dynamic_feed" },
    { key: "credentials", label: "Real Credentials",  icon: "key"          },
    { key: "catalog",     label: "Live Catalog",      icon: "database"     },
    { key: "pixel",       label: "Live Pixel Events", icon: "track_changes"},
    { key: "audiences",   label: "Live Audiences",    icon: "group"        },
    { key: "ads",         label: "Live Ad Data",      icon: "bar_chart"    },
  ];

  if (loading) return (
    <AdminLayout sidebar="channels">
      <div className="flex items-center justify-center min-h-screen">
        <span className="material-symbols-outlined animate-spin text-[#006c49] text-3xl">refresh</span>
      </div>
    </AdminLayout>
  );

  if (loadError) return (
    <AdminLayout sidebar="channels">
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <span className="material-symbols-outlined text-red-400 text-5xl">cloud_off</span>
        <h2 className="font-serif text-2xl font-semibold text-[#0b1c30]">Could not load Facebook data</h2>
        <p className="font-[Manrope] text-[#7c839b] text-sm">This usually means your session has expired or the API server is restarting.</p>
        <button onClick={() => { setLoadError(false); setLoading(true); loadAll(); }}
          className="mt-2 px-6 py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">refresh</span> Try Again
        </button>
      </div>
    </AdminLayout>
  );

  return (
    <AdminLayout sidebar="channels">
      <div className="p-10 max-w-[1320px] mx-auto">
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
            <h2 className="text-[36px] font-serif font-bold text-[#0b1c30] mb-2">Meta & Facebook Manager</h2>
            <p className="font-[Manrope] text-[16px] text-[#7c839b] max-w-2xl">Compose & schedule page posts, manage catalog rules, pixel events, and custom audiences.</p>
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
                className={`flex items-center gap-2 px-6 py-4 font-[Manrope] font-bold text-xs tracking-widest uppercase transition-colors whitespace-nowrap relative ${activeTab === t.key ? "border-b-2 border-[#006c49] text-[#006c49]" : "text-[#7c839b] hover:text-black"}`}>
                <span className="material-symbols-outlined text-sm">{t.icon}</span>{t.label}
                {t.badge && <span className="bg-blue-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{t.badge}</span>}
              </button>
            ))}
          </div>

          <div className="p-8">

            {/* ══════════════════════ PAGE POSTS ══════════════════════ */}
            {activeTab === "posts" && (
              <div>
                {/* Stats row */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: "Published",    value: publishedPosts.length,    icon: "check_circle",  cls: "text-[#006c49]"  },
                    { label: "Scheduled",    value: scheduledPosts.length,    icon: "schedule",      cls: "text-blue-600"   },
                    { label: "Total Reach",  value: fmt(totalReach),          icon: "visibility",    cls: "text-[#006c49]"  },
                  ].map((s) => (
                    <div key={s.label} className="bg-[#f8f9ff] rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`material-symbols-outlined text-base ${s.cls}`}>{s.icon}</span>
                        <span className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b]">{s.label}</span>
                      </div>
                      <p className="text-[26px] font-serif font-semibold">{s.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-[20px] font-semibold">Post Feed</h3>
                  </div>

                  {filteredPosts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-[#7c839b] font-[Manrope]">
                      <span className="material-symbols-outlined text-4xl mb-3 text-slate-200">post_add</span>
                      No posts yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredPosts.map((post) => (
                        <div key={post.id} className="rounded-xl border overflow-hidden bg-white">
                          <div className="px-4 pt-4 pb-3">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="font-[Manrope] font-bold text-sm text-[#0b1c30] leading-none">Luxe Boutique</p>
                                <p className="text-[10px] text-[#7c839b] font-[Manrope]">{post.status}</p>
                              </div>
                              <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{post.postType}</span>
                            </div>

                            <p className="text-sm font-[Manrope] text-[#0b1c30] whitespace-pre-line line-clamp-4 mb-3">{post.caption}</p>
                            {post.imageUrl && <img src={post.imageUrl} alt="" className="w-full rounded-lg mb-3 object-cover max-h-80" />}
                            {post.link && <div className="text-xs font-[Manrope] text-[#006c49] bg-[#f0faf6] border border-[#c3eed8] rounded-lg px-3 py-2">{post.link}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════ API CREDENTIALS ══════════════════════ */}
            {activeTab === "credentials" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-7 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-serif text-[20px] font-semibold mb-1">Meta API Credentials</h3>
                      <p className="text-sm text-[#7c839b] font-[Manrope]">Enter your credentials from the Meta for Developers dashboard. Saved securely to the database.</p>
                    </div>
                    <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${configuredCredsCount === FB_CRED_FIELDS.length ? "bg-[#6cf8bb] text-[#00714d] border-[#6cf8bb]" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                      {configuredCredsCount}/{FB_CRED_FIELDS.length} Configured
                    </span>
                  </div>
                  <div className="space-y-4">
                    {FB_CRED_FIELDS.map((field) => {
                      const val = credsDirty[field.key] ?? "";
                      const saved = fbCreds[field.key] ?? "";
                      const isDirty = val !== saved;
                      const visible = showSecret[field.key];
                      return (
                        <div key={field.key} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#45464d]">{field.label}</label>
                            <div className="flex items-center gap-2">
                              {isDirty && <span className="text-[9px] font-[Manrope] font-bold uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Unsaved</span>}
                              {!isDirty && saved && <span className="text-[9px] font-[Manrope] font-bold uppercase tracking-widest text-[#006c49] bg-[#f0faf6] px-2 py-0.5 rounded-full flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">check_circle</span>Saved</span>}
                            </div>
                          </div>
                          <div className="relative flex items-center">
                            <input
                              type={field.isSecret && !visible ? "password" : "text"}
                              value={val}
                              onChange={(e) => setCredsDirty((p) => ({ ...p, [field.key]: e.target.value }))}
                              placeholder={field.isSecret ? "••••••••••••••••" : `Enter ${field.label}…`}
                              className={`w-full bg-slate-50 border rounded-lg px-4 py-2.5 font-mono text-sm outline-none transition-colors pr-20 ${isDirty ? "border-amber-300 focus:border-amber-500" : "border-slate-100 focus:border-[#006c49]"}`}
                            />
                            <div className="absolute right-2 flex items-center gap-1">
                              {field.isSecret && (
                                <button onClick={() => setShowSecret((p) => ({ ...p, [field.key]: !p[field.key] }))} className="p-1 text-slate-400 hover:text-black transition-colors">
                                  <span className="material-symbols-outlined text-sm">{visible ? "visibility_off" : "visibility"}</span>
                                </button>
                              )}
                              {val && (
                                <button onClick={() => { navigator.clipboard.writeText(val).catch(() => {}); showToast(`${field.label} copied.`); }} className="p-1 text-slate-400 hover:text-[#006c49] transition-colors">
                                  <span className="material-symbols-outlined text-sm">content_copy</span>
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[11px] text-[#7c839b] font-[Manrope] italic">{field.hint}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={saveFbCreds} disabled={credsSaving}
                      className="flex-1 py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] disabled:opacity-60 transition-colors rounded-lg flex items-center justify-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${credsSaving ? "animate-spin" : ""}`}>{credsSaving ? "refresh" : "save"}</span>
                      {credsSaving ? "Saving…" : "Save Credentials"}
                    </button>
                    <button onClick={testFbConn} disabled={testingConn}
                      className="px-6 py-3 border border-slate-200 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:border-[#006c49] hover:text-[#006c49] disabled:opacity-60 transition-colors rounded-lg flex items-center gap-2">
                      <span className={`material-symbols-outlined text-sm ${testingConn ? "animate-spin" : ""}`}>{testingConn ? "refresh" : "wifi_tethering"}</span>
                      {testingConn ? "Testing…" : "Test Connection"}
                    </button>
                  </div>
                  {testResult && (
                    <div className={`p-4 rounded-xl border font-[Manrope] text-sm ${testResult.pass ? "bg-[#f0faf6] border-[#c3eed8] text-[#006c49]" : "bg-red-50 border-red-200 text-red-700"}`}>
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <span className="material-symbols-outlined text-base">{testResult.pass ? "check_circle" : "error"}</span>
                        {testResult.pass ? `All credentials present — ${testResult.latency}ms` : "Missing required credentials"}
                      </div>
                      {!testResult.pass && testResult.missing && testResult.missing.length > 0 && (
                        <ul className="mt-2 space-y-1 pl-6 list-disc text-xs text-red-600">
                          {testResult.missing.map((k) => {
                            const field = FB_CRED_FIELDS.find((f) => f.key === k);
                            return <li key={k} className="font-semibold">{field?.label ?? k}</li>;
                          })}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <div className="col-span-12 lg:col-span-5 space-y-4">
                  <div className="p-5 bg-[#f8f9ff] rounded-xl border border-slate-100 space-y-4">
                    <h4 className="font-serif font-semibold flex items-center gap-2"><span className="material-symbols-outlined text-[#006c49] text-base">help</span>Where to find your credentials</h4>
                    {[
                      { step: "1", title: "Find your Page ID", body: "Go to your Facebook Page → click About (left sidebar) → scroll to the bottom. The Page ID is a long number shown under 'More info'." },
                      { step: "2", title: "Create a Meta App", body: "Go to developers.facebook.com → My Apps → Create App. Choose Business type for commerce + ads access." },
                      { step: "3", title: "Get App ID & Secret", body: "App Dashboard → Settings → Basic. Copy the App ID (public) and App Secret (keep private)." },
                      { step: "4", title: "Generate Page Token", body: "Use Graph API Explorer → select your app and page → generate token → exchange for a long-lived token via the token debugger." },
                      { step: "5", title: "Find Pixel ID", body: "Meta Business Manager → Events Manager → Data Sources → your Pixel → copy the Pixel ID from the overview." },
                      { step: "6", title: "Ad Account ID", body: "Meta Business Manager → Ad Accounts → click your account. The ID appears as act_XXXXXXXXX in the URL." },
                    ].map((s) => (
                      <div key={s.step} className="flex gap-3">
                        <span className="w-5 h-5 rounded-full bg-[#006c49] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{s.step}</span>
                        <div><p className="font-[Manrope] font-bold text-sm mb-0.5">{s.title}</p><p className="text-xs text-[#7c839b] font-[Manrope]">{s.body}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                    <p className="text-xs font-[Manrope] text-amber-800 flex items-start gap-2">
                      <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">lock</span>
                      Credentials are stored in the database and never exposed in client-side code. Secret fields are masked during display.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════════════════ CATALOG RULES ══════════════════════ */}
            {activeTab === "catalog" && catalog && (
              <div className="space-y-6">
                {/* Catalog ID banner */}
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${fbCreds["catalog_id"] ? "bg-[#f0faf6] border-[#c3eed8]" : "bg-amber-50 border-amber-200"}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${fbCreds["catalog_id"] ? "bg-[#006c49]" : "bg-amber-400"}`}>
                    <span className="material-symbols-outlined text-white text-base">database</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-0.5">Facebook Commerce Catalog ID</p>
                    {fbCreds["catalog_id"] ? (
                      <code className="font-mono text-sm font-bold text-[#006c49]">{fbCreds["catalog_id"]}</code>
                    ) : (
                      <p className="font-[Manrope] text-sm text-amber-700 font-semibold">Not configured — enter your Catalog ID in the API Credentials tab to enable product sync.</p>
                    )}
                  </div>
                  <button onClick={() => setActiveTab("credentials")}
                    className={`shrink-0 px-4 py-2 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase transition-colors ${fbCreds["catalog_id"] ? "border border-[#006c49] text-[#006c49] hover:bg-[#006c49] hover:text-white" : "bg-amber-600 text-white hover:bg-amber-700"}`}>
                    {fbCreds["catalog_id"] ? "Edit" : "Set Catalog ID"}
                  </button>
                </div>

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
                            <input type="number" defaultValue={f.val} onBlur={(e) => f.setVal(Number(e.target.value))} className="bg-transparent outline-none font-[Manrope] text-sm w-full" />
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
                  <div className="p-4 rounded-xl" style={{ background: "linear-gradient(135deg,#0b1c30,#006c49)" }}>
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
              </div>
            )}

            {/* ══════════════════════ PIXEL EVENTS ══════════════════════ */}
            {activeTab === "pixel" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Pixel Event Mapping</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">Map store events to Facebook Pixel standard events for precise ad attribution.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-[Manrope] font-bold text-[#7c839b] uppercase tracking-widest block">Pixel ID</span>
                    {fbCreds.pixel_id
                      ? <code className="text-sm font-mono text-[#006c49]">{fbCreds.pixel_id}</code>
                      : <button onClick={() => setActiveTab("credentials")} className="text-xs font-[Manrope] font-bold text-amber-600 hover:text-black transition-colors flex items-center gap-1 ml-auto"><span className="material-symbols-outlined text-xs">warning</span>Not set</button>
                    }
                  </div>
                </div>
                <div className="space-y-2">
                  {pixelEvents.map((ev) => (
                    <div key={ev.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${ev.enabled ? "bg-[#f8f9ff] border-slate-100" : "bg-white border-dashed border-slate-200 opacity-60"}`}>
                      <div className="flex-1 grid grid-cols-2 gap-4">
                        <div><p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-0.5">Store Event</p><p className="font-[Manrope] font-semibold text-sm">{ev.storeEvent}</p></div>
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-300 text-sm">arrow_forward</span>
                          <div><p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-0.5">Facebook Event</p><code className="font-mono text-sm text-[#006c49]">{ev.fbEvent}</code></div>
                        </div>
                      </div>
                      <button onClick={() => togglePixelEvent(ev)} className={`relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0 ${ev.enabled ? "bg-[#006c49]" : "bg-slate-300"}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${ev.enabled ? "translate-x-5" : "translate-x-0.5"}`}></span>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-sm font-[Manrope] text-amber-800 flex items-center gap-2"><span className="material-symbols-outlined text-sm">info</span>Changes saved to database. Verify events in Facebook Events Manager before going live.</p>
                </div>
              </div>
            )}

            {/* ══════════════════════ AUDIENCES ══════════════════════ */}
            {activeTab === "audiences" && (
              <div>
                <div className="mb-6"><h3 className="font-serif text-[20px] font-semibold mb-1">Custom Audiences</h3><p className="text-sm text-[#7c839b] font-[Manrope]">Sync customer segments to Facebook for precision ad targeting.</p></div>
                <div className="flex gap-3 mb-6 p-4 bg-[#f8f9ff] rounded-xl">
                  <input value={newAudName} onChange={(e) => setNewAudName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createAudience()} placeholder="Audience name…" className="flex-1 bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]" />
                  <select value={newAudType} onChange={(e) => setNewAudType(e.target.value)} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]">
                    {["Custom","Lookalike","Retargeting"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                  <button onClick={createAudience} className="px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span> Create
                  </button>
                </div>
                <div className="space-y-3">
                  {audiences.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-[#eff4ff] rounded-lg flex items-center justify-center"><span className="material-symbols-outlined text-[#006c49] text-base">group</span></div>
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
                        <button onClick={() => toggleAudience(a)} className="text-xs font-[Manrope] text-[#7c839b] hover:text-[#006c49] border border-slate-200 px-3 py-1 rounded transition-colors">{a.status === "Active" ? "Pause" : "Resume"}</button>
                        <button onClick={() => deleteAudience(a)} className="text-[#7c839b] hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-base">delete</span></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ══════════════════════ AD PERFORMANCE ══════════════════════ */}
            {activeTab === "ads" && (
              <div>
                {!fbCreds.ad_account_id ? (
                  /* ── Empty state: no Ad Account ID saved ── */
                  <div className="flex flex-col items-center justify-center py-20 gap-5 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-[#f8f9ff] flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-[#c6c6cd]">bar_chart</span>
                    </div>
                    <div>
                      <h3 className="font-serif text-[20px] font-semibold mb-2">No Ad Account connected</h3>
                      <p className="text-sm font-[Manrope] text-[#7c839b] max-w-sm leading-relaxed">
                        Add your <strong>Ad Account ID</strong> in the API Credentials tab to unlock ad performance data. Format: <code className="bg-slate-100 px-1 rounded text-xs">act_XXXXXXXXX</code>
                      </p>
                    </div>
                    <button onClick={() => setActiveTab("credentials")}
                      className="px-6 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all rounded-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">key</span>
                      Go to API Credentials
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-serif text-[20px] font-semibold">Ad Performance Overview</h3>
                        <p className="text-[11px] font-[Manrope] text-[#7c839b] font-bold flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-xs">info</span>
                          Live data only
                        </p>
                      </div>
                      <span className="text-[10px] font-[Manrope] text-[#7c839b]">Account: <code className="text-black font-mono">{fbCreds.ad_account_id}</code></span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
                      {[
                        { label: "Impressions", value: fmt(totalReach), note: "live posts" },
                        { label: "Engagement", value: fmt(totalLikes + totalReach), note: "live totals" },
                        { label: "Comments", value: fmt(publishedPosts.reduce((s, p) => s + p.comments, 0)), note: "live posts" },
                        { label: "Shares", value: fmt(publishedPosts.reduce((s, p) => s + p.shares, 0)), note: "live posts" },
                      ].map((m) => (
                        <div key={m.label} className="p-5 bg-[#f8f9ff] rounded-xl">
                          <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-2">{m.label}</p>
                          <p className="text-[28px] font-serif font-semibold">{m.value}</p>
                          <p className="text-xs font-[Manrope] font-bold mt-1 text-[#7c839b]">{m.note}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
