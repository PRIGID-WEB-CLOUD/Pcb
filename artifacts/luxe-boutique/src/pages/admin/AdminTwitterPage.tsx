import { useState, useRef } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

const MAX_CHARS = 280;
const INITIAL_HASHTAGS = ["#LuxeFashion", "#EditorialStyle", "#SlowFashion", "#LuxeAesthetic", "#FashionWeek", "#CoutureLuxe"];

type DropFrequency = "Real-time (Immediate)" | "Daily Digest (6 PM)" | "Weekly Roundup";
type ImageStyle = "Single Product High-Res" | "Grid (4-up)" | "Carousel Thread";
type ActiveTab = "composer" | "rules" | "queue" | "templates";

interface ScheduledTweet {
  id: number;
  text: string;
  scheduledFor: string;
  status: "Queued" | "Sent" | "Failed";
  imageStyle: string;
}

interface AutoRule {
  id: string;
  trigger: string;
  action: string;
  template: string;
  active: boolean;
}

interface ContentTemplate {
  id: string;
  name: string;
  body: string;
  usageCount: number;
}

const initialRules: AutoRule[] = [
  { id: "r1", trigger: "New Product Published",    action: "Post immediately",       template: "new_arrival",     active: true  },
  { id: "r2", trigger: "Price Drop > 20%",         action: "Post in 30 minutes",     template: "price_drop",      active: true  },
  { id: "r3", trigger: "Back In Stock",            action: "Post immediately",       template: "restock_alert",   active: false },
  { id: "r4", trigger: "Order Milestone (100/wk)", action: "Post weekly digest",     template: "weekly_recap",    active: false },
];

const initialQueue: ScheduledTweet[] = [
  { id: 1, text: "✨ NEW ARRIVAL — Introducing the Silk Evening Blazer. Crafted from premium mulberry silk, this piece redefines modern elegance. #LuxeFashion #EditorialStyle", scheduledFor: "Today 6:00 PM", status: "Queued", imageStyle: "Single Product High-Res" },
  { id: 2, text: "🖤 PRICE DROP — The Cashmere Overcoat is now 25% off. Timeless investment dressing at its finest. #SlowFashion #CoutureLuxe", scheduledFor: "Tomorrow 9:00 AM", status: "Queued", imageStyle: "Single Product High-Res" },
  { id: 3, text: "SS25 COLLECTION — 12 new arrivals just dropped. Explore the full lookbook at luxeboutique.com/ss25 #FashionWeek #LuxeAesthetic", scheduledFor: "Yesterday 7:00 PM", status: "Sent", imageStyle: "Grid (4-up)" },
  { id: 4, text: "🔁 RESTOCKED — The Milanese Reserve Tote is back. Limited inventory. #LuxeFashion", scheduledFor: "Yesterday 9:00 AM", status: "Sent", imageStyle: "Single Product High-Res" },
];

const initialTemplates: ContentTemplate[] = [
  { id: "c1", name: "new_arrival",   body: "✨ NEW ARRIVAL — Introducing the {{product_name}}. {{product_description}} Available now. {{hashtags}}", usageCount: 42 },
  { id: "c2", name: "price_drop",    body: "🖤 PRICE DROP — The {{product_name}} is now {{discount}}% off. {{product_description}} {{hashtags}}",   usageCount: 18 },
  { id: "c3", name: "restock_alert", body: "🔁 RESTOCKED — The {{product_name}} is back. Limited inventory. {{hashtags}}",                           usageCount: 7  },
  { id: "c4", name: "weekly_recap",  body: "This week at Luxe Boutique: {{new_count}} new arrivals, {{orders}} orders fulfilled. Explore now. {{hashtags}}", usageCount: 12 },
];

export default function AdminTwitterPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("composer");
  const [hashtags, setHashtags] = useState<string[]>(INITIAL_HASHTAGS);
  const [newTag, setNewTag] = useState("");
  const [tweetText, setTweetText] = useState("✨ NEW ARRIVAL — Introducing the Silk Evening Blazer. Crafted from premium mulberry silk, this piece redefines modern elegance. Available now. #LuxeFashion #EditorialStyle");
  const [schedulerOn, setSchedulerOn] = useState(true);
  const [dropFreq, setDropFreq] = useState<DropFrequency>("Real-time (Immediate)");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("Single Product High-Res");
  const [queue, setQueue] = useState<ScheduledTweet[]>(initialQueue);
  const [scheduling, setScheduling] = useState(false);
  const [rules, setRules] = useState<AutoRule[]>(initialRules);
  const [templates, setTemplates] = useState<ContentTemplate[]>(initialTemplates);
  const [toast, setToast] = useState<string | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  // New rule
  const [showNewRule, setShowNewRule] = useState(false);
  const [newRuleTrigger, setNewRuleTrigger] = useState("New Product Published");
  const [newRuleAction, setNewRuleAction] = useState("Post immediately");
  // New template
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTplName, setNewTplName] = useState("");
  const [newTplBody, setNewTplBody] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const addHashtag = () => {
    if (!newTag.trim()) return;
    const tag = newTag.trim().startsWith("#") ? newTag.trim() : `#${newTag.trim()}`;
    if (hashtags.includes(tag)) { showToast("That hashtag already exists."); return; }
    if (hashtags.length >= 10) { showToast("Maximum 10 hashtags."); return; }
    setHashtags((p) => [...p, tag]); setNewTag(""); tagInputRef.current?.focus();
  };

  const scheduleTweet = () => {
    if (!tweetText.trim() || tweetText.length > MAX_CHARS) return;
    setScheduling(true);
    setTimeout(() => {
      const scheduledFor = dropFreq === "Real-time (Immediate)" ? "Posting now…" : dropFreq === "Daily Digest (6 PM)" ? "Today 6:00 PM" : "Next Monday 9:00 AM";
      const tweet: ScheduledTweet = { id: Date.now(), text: tweetText, scheduledFor, status: "Queued", imageStyle };
      setQueue((p) => [tweet, ...p]);
      setScheduling(false);
      showToast("Tweet added to queue.");
      if (dropFreq === "Real-time (Immediate)") {
        setTimeout(() => setQueue((p) => p.map((t) => t.id === tweet.id ? { ...t, status: "Sent", scheduledFor: "Just now" } : t)), 2500);
      }
    }, 1500);
  };

  const cancelTweet = (id: number) => { setQueue((p) => p.filter((t) => t.id !== id)); showToast("Tweet removed from queue."); };
  const retryTweet = (id: number) => { setQueue((p) => p.map((t) => t.id === id ? { ...t, status: "Queued" } : t)); showToast("Tweet re-queued."); };

  const toggleRule = (id: string) => {
    const r = rules.find((x) => x.id === id)!;
    setRules((p) => p.map((x) => x.id === id ? { ...x, active: !x.active } : x));
    showToast(`Auto-post rule "${r.trigger}" ${r.active ? "disabled" : "enabled"}.`);
  };

  const addRule = () => {
    const rule: AutoRule = { id: Date.now().toString(), trigger: newRuleTrigger, action: newRuleAction, template: "new_arrival", active: true };
    setRules((p) => [...p, rule]); setShowNewRule(false); showToast("Auto-post rule created.");
  };

  const useTemplate = (tpl: ContentTemplate) => {
    setTweetText(tpl.body); setActiveTab("composer");
    setTemplates((p) => p.map((t) => t.id === tpl.id ? { ...t, usageCount: t.usageCount + 1 } : t));
    showToast(`Template "${tpl.name}" loaded into composer.`);
  };

  const addTemplate = () => {
    if (!newTplName.trim() || !newTplBody.trim()) { showToast("Name and body required."); return; }
    const tpl: ContentTemplate = { id: Date.now().toString(), name: newTplName.toLowerCase().replace(/\s+/g, "_"), body: newTplBody, usageCount: 0 };
    setTemplates((p) => [...p, tpl]); setNewTplName(""); setNewTplBody(""); setShowNewTemplate(false);
    showToast(`Template "${tpl.name}" saved.`);
  };

  const charsLeft = MAX_CHARS - tweetText.length;
  const overLimit = charsLeft < 0;
  const r = 10, circ = 2 * Math.PI * r;
  const circlePercent = Math.min(100, (tweetText.length / MAX_CHARS) * 100);
  const circleColor = charsLeft <= 20 ? (overLimit ? "#ba1a1a" : "#f59e0b") : "#006c49";

  const queuedCount = queue.filter((t) => t.status === "Queued").length;
  const sentCount = queue.filter((t) => t.status === "Sent").length;

  const tabs: { key: ActiveTab; label: string; icon: string; badge?: number }[] = [
    { key: "composer",  label: "Composer",       icon: "edit_note"      },
    { key: "queue",     label: "Queue",           icon: "queue",         badge: queuedCount },
    { key: "rules",     label: "Auto-post Rules", icon: "rule"           },
    { key: "templates", label: "Templates",       icon: "description"    },
  ];

  const statusStyle: Record<ScheduledTweet["status"], string> = {
    Queued: "bg-blue-50 text-blue-700",
    Sent:   "bg-[#6cf8bb] text-[#00714d]",
    Failed: "bg-red-100 text-red-600",
  };

  return (
    <AdminLayout sidebar="channels">
      <div className="px-8 py-10 max-w-[1280px] mx-auto">
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>{toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-10 flex justify-between items-end">
          <div>
            <Link href="/admin/channels" className="inline-flex items-center gap-1.5 text-[#7c839b] hover:text-[#006c49] transition-colors font-[Manrope] font-bold text-xs tracking-widest uppercase mb-4 no-underline">
              <span className="material-symbols-outlined text-base">arrow_back</span> Channel Hub
            </Link>
            <h2 className="text-[36px] font-serif font-bold text-[#0b1c30] mb-2">X (Twitter) Settings</h2>
            <p className="font-[Manrope] text-[#7c839b] max-w-2xl">Compose & schedule tweets, manage auto-post rules, and maintain a content template library.</p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#6cf8bb]/30 border border-[#6cf8bb] rounded-full">
              <span className="flex h-2 w-2 rounded-full bg-[#006c49]"></span>
              <span className="text-[#006c49] font-[Manrope] font-bold text-[11px] tracking-widest uppercase">API Connected</span>
            </div>
            <div className="flex gap-4 text-xs font-[Manrope] text-[#7c839b]">
              <span><strong className="text-black">{queuedCount}</strong> queued</span>
              <span><strong className="text-black">{sentCount}</strong> sent today</span>
              <span><strong className="text-black">{rules.filter((r) => r.active).length}</strong> rules active</span>
            </div>
          </div>
        </div>

        {/* Product Drop Scheduler toggle — always visible */}
        <div className="bg-white p-5 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-lg transition-colors ${schedulerOn ? "bg-[#6cf8bb]" : "bg-slate-100"}`}>
              <span className={`material-symbols-outlined ${schedulerOn ? "text-[#006c49]" : "text-slate-400"}`}>inventory_2</span>
            </div>
            <div>
              <h3 className="font-serif font-semibold text-base">Product Drop Scheduler</h3>
              <p className="text-xs text-[#7c839b] font-[Manrope]">Auto-post new inventory arrivals · currently <strong>{schedulerOn ? "ON" : "OFF"}</strong></p>
            </div>
          </div>
          <div className={`flex items-center gap-4 transition-opacity ${schedulerOn ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <select value={dropFreq} onChange={(e) => setDropFreq(e.target.value as DropFrequency)} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-sm font-[Manrope] outline-none">
              {["Real-time (Immediate)", "Daily Digest (6 PM)", "Weekly Roundup"].map((o) => <option key={o}>{o}</option>)}
            </select>
            <select value={imageStyle} onChange={(e) => setImageStyle(e.target.value as ImageStyle)} className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-sm font-[Manrope] outline-none">
              {["Single Product High-Res", "Grid (4-up)", "Carousel Thread"].map((o) => <option key={o}>{o}</option>)}
            </select>
          </div>
          <button onClick={() => { setSchedulerOn((v) => !v); showToast(`Scheduler ${schedulerOn ? "paused" : "activated"}.`); }}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${schedulerOn ? "bg-[#006c49]" : "bg-slate-300"}`}>
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${schedulerOn ? "translate-x-5" : "translate-x-0.5"}`}></span>
          </button>
        </div>

        {/* Main tabs */}
        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
          <div className="flex border-b border-slate-100">
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-2 px-6 py-4 font-[Manrope] font-bold text-xs tracking-widest uppercase transition-colors relative ${activeTab === t.key ? "border-b-2 border-[#006c49] text-[#006c49]" : "text-[#7c839b] hover:text-black"}`}>
                <span className="material-symbols-outlined text-sm">{t.icon}</span>{t.label}
                {t.badge !== undefined && t.badge > 0 && (
                  <span className="ml-1 bg-[#006c49] text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{t.badge}</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-8">
            {/* COMPOSER */}
            {activeTab === "composer" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 lg:col-span-7 space-y-6">
                  {/* Hashtag bank */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-serif font-semibold text-lg">Hashtag Bank <span className="text-[#7c839b] text-sm font-[Manrope] font-normal">{hashtags.length}/10</span></h3>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3 min-h-[36px]">
                      {hashtags.map((tag) => (
                        <span key={tag} className="bg-[#eff4ff] text-[#0b1c30] px-3 py-1.5 rounded-full text-xs font-[Manrope] font-bold flex items-center gap-1">
                          {tag}
                          <button onClick={() => setHashtags((p) => p.filter((t) => t !== tag))} className="text-[#45464d] hover:text-red-500 ml-1 transition-colors">
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </span>
                      ))}
                      {hashtags.length === 0 && <span className="text-sm text-[#7c839b] italic font-[Manrope]">No hashtags yet.</span>}
                    </div>
                    <div className="flex gap-2">
                      <input ref={tagInputRef} value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addHashtag())}
                        placeholder="Add hashtag…" className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]" />
                      <button onClick={addHashtag} className="px-4 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg">Add</button>
                    </div>
                  </div>

                  {/* Composer */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-serif font-semibold text-lg">Tweet Composer</h3>
                      <div className="flex items-center gap-2">
                        <svg width="26" height="26" viewBox="0 0 26 26">
                          <circle cx="13" cy="13" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                          <circle cx="13" cy="13" r={r} fill="none" stroke={circleColor} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={circ - (circ * circlePercent) / 100} strokeLinecap="round" transform="rotate(-90 13 13)" style={{ transition: "stroke-dashoffset 0.2s, stroke 0.2s" }} />
                        </svg>
                        <span className={`font-[Manrope] font-bold text-sm ${overLimit ? "text-[#ba1a1a]" : charsLeft <= 20 ? "text-amber-600" : "text-[#7c839b]"}`}>{charsLeft}</span>
                      </div>
                    </div>
                    {/* Preview */}
                    <div className="border border-slate-200 rounded-xl p-4 mb-3">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0">LB</div>
                        <div>
                          <p className="font-bold text-sm">Luxe Boutique</p>
                          <p className="text-xs text-slate-400 font-[Manrope]">@luxeboutique · {dropFreq === "Real-time (Immediate)" ? "now" : dropFreq === "Daily Digest (6 PM)" ? "6:00 PM" : "Mon 9:00 AM"}</p>
                        </div>
                      </div>
                      <p className="text-sm font-[Manrope] mb-3 whitespace-pre-wrap break-words min-h-[36px]">{tweetText || <span className="text-slate-300">Start typing…</span>}</p>
                      <div className="bg-slate-100 rounded-lg h-24 flex items-center justify-center">
                        <span className="text-xs text-slate-300 font-[Manrope]">{imageStyle}</span>
                      </div>
                    </div>
                    <textarea className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm font-[Manrope] outline-none focus:border-[#006c49] resize-none transition-colors" rows={3}
                      placeholder="Compose your tweet…" value={tweetText} onChange={(e) => setTweetText(e.target.value)} />
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => { const tags = hashtags.slice(0, 3).join(" "); setTweetText((p) => p.includes(tags) ? p : `${p} ${tags}`.trim()); }}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-[Manrope] font-bold uppercase tracking-widest hover:border-[#006c49] hover:text-[#006c49] transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">tag</span> Insert Tags
                      </button>
                      <button onClick={() => { setTweetText(""); }}
                        className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-[Manrope] font-bold uppercase tracking-widest hover:border-red-300 hover:text-red-500 transition-colors">
                        Clear
                      </button>
                      <button onClick={scheduleTweet} disabled={overLimit || !tweetText.trim() || scheduling}
                        className="flex-1 bg-black text-white py-2 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                        {scheduling ? <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Scheduling…</> : <><span className="material-symbols-outlined text-sm">schedule_send</span> Add to Queue</>}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right col */}
                <div className="col-span-12 lg:col-span-5 space-y-5">
                  <div className="bg-white border border-slate-100 rounded-xl p-5">
                    <h3 className="font-serif font-semibold mb-4">Channel Performance</h3>
                    {[{ label: "Followers", value: "48.2K", change: "+1.2K", up: true }, { label: "Avg. Impressions/Post", value: "12.4K", change: "+8.4%", up: true }, { label: "Engagement Rate", value: "4.8%", change: "+0.3%", up: true }, { label: "Link Clicks", value: "2,841", change: "+22%", up: true }].map((s) => (
                      <div key={s.label} className="flex justify-between items-center py-2.5 border-b border-slate-50 last:border-0">
                        <span className="font-[Manrope] text-sm text-[#45464d]">{s.label}</span>
                        <div className="text-right">
                          <span className="font-[Manrope] font-bold">{s.value}</span>
                          <span className={`text-xs font-[Manrope] font-bold ml-2 ${s.up ? "text-[#006c49]" : "text-[#ba1a1a]"}`}>{s.change}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white border border-slate-100 rounded-xl p-5">
                    <h3 className="font-serif font-semibold mb-3">Best Times to Post</h3>
                    {[{ time: "9:00 AM", day: "Tue–Thu", score: 92 }, { time: "7:00 PM", day: "Fri–Sat", score: 88 }, { time: "12:00 PM", day: "Monday", score: 74 }].map((t) => (
                      <div key={t.time} className="flex items-center justify-between p-3 bg-[#f8f9ff] rounded-lg mb-2 last:mb-0">
                        <div><span className="font-[Manrope] font-bold text-sm">{t.time}</span><span className="text-xs text-[#7c839b] font-[Manrope] ml-2">{t.day}</span></div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="bg-[#006c49] h-full rounded-full" style={{ width: `${t.score}%` }}></div></div>
                          <span className="text-xs font-[Manrope] font-bold text-[#006c49]">{t.score}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* QUEUE */}
            {activeTab === "queue" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Tweet Queue</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">{queuedCount} scheduled · {sentCount} sent</p>
                  </div>
                  <button onClick={() => setActiveTab("composer")} className="px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">edit_note</span> New Tweet
                  </button>
                </div>
                <div className="space-y-3">
                  {queue.length === 0 && <div className="text-center py-16 text-[#7c839b] font-[Manrope]">No tweets in queue.</div>}
                  {queue.map((tw) => (
                    <div key={tw.id} className={`p-5 rounded-xl border flex items-start gap-4 ${tw.status === "Queued" ? "bg-[#f8f9ff] border-slate-100" : tw.status === "Sent" ? "bg-emerald-50/50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                      <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0">LB</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-[Manrope] text-[#0b1c30] line-clamp-2 mb-2">{tw.text}</p>
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-[Manrope] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${statusStyle[tw.status]}`}>{tw.status}</span>
                          <span className="text-xs text-[#7c839b] font-[Manrope]">{tw.scheduledFor}</span>
                          <span className="text-xs text-[#7c839b] font-[Manrope]">· {tw.imageStyle}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {tw.status === "Queued" && (
                          <button onClick={() => cancelTweet(tw.id)} className="text-xs font-[Manrope] text-[#7c839b] hover:text-red-500 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">Cancel</button>
                        )}
                        {tw.status === "Failed" && (
                          <button onClick={() => retryTweet(tw.id)} className="text-xs font-[Manrope] font-bold text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">Retry</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AUTO-POST RULES */}
            {activeTab === "rules" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Auto-post Rules</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">Automatically tweet when store events occur. {rules.filter((r) => r.active).length}/{rules.length} active.</p>
                  </div>
                  <button onClick={() => setShowNewRule((v) => !v)} className="px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span> New Rule
                  </button>
                </div>
                {showNewRule && (
                  <div className="mb-6 p-5 bg-[#f8f9ff] rounded-xl border border-dashed border-slate-200 space-y-4">
                    <h4 className="font-serif font-semibold">Create Rule</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Trigger</label>
                        <select value={newRuleTrigger} onChange={(e) => setNewRuleTrigger(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]">
                          {["New Product Published", "Price Drop > 20%", "Back In Stock", "Order Milestone (100/wk)", "New Collection Live"].map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Action</label>
                        <select value={newRuleAction} onChange={(e) => setNewRuleAction(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]">
                          {["Post immediately", "Post in 30 minutes", "Post in 1 hour", "Post daily digest", "Post weekly digest"].map((o) => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={addRule} className="px-5 py-2 bg-[#006c49] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-black transition-colors rounded-lg">Save Rule</button>
                      <button onClick={() => setShowNewRule(false)} className="px-5 py-2 border border-slate-200 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-colors rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {rules.map((rule) => (
                    <div key={rule.id} className={`p-5 rounded-xl border flex items-center gap-4 transition-all ${rule.active ? "bg-[#f8f9ff] border-slate-100" : "bg-white border-dashed border-slate-200 opacity-60"}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${rule.active ? "bg-[#006c49]" : "bg-slate-200"}`}>
                        <span className="material-symbols-outlined text-white text-sm">rule</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-[Manrope] font-bold text-sm">When: {rule.trigger}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#7c839b] font-[Manrope]">
                          <span>→ {rule.action}</span>
                          <span>· Template: <code className="font-mono text-[#006c49]">{rule.template}</code></span>
                        </div>
                      </div>
                      <button onClick={() => toggleRule(rule.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${rule.active ? "bg-[#006c49]" : "bg-slate-300"}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${rule.active ? "translate-x-5" : "translate-x-0.5"}`}></span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TEMPLATES */}
            {activeTab === "templates" && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="font-serif text-[20px] font-semibold mb-1">Content Templates</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">Reusable tweet skeletons with dynamic variables. Click "Use" to load into composer.</p>
                  </div>
                  <button onClick={() => setShowNewTemplate((v) => !v)} className="px-5 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span> New Template
                  </button>
                </div>
                {showNewTemplate && (
                  <div className="mb-6 p-5 bg-[#f8f9ff] rounded-xl border border-dashed border-slate-200 space-y-4">
                    <h4 className="font-serif font-semibold">Create Template</h4>
                    <div className="space-y-1">
                      <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Template Name</label>
                      <input value={newTplName} onChange={(e) => setNewTplName(e.target.value)} placeholder="e.g. flash_sale" className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]" />
                    </div>
                    <div className="space-y-1">
                      <label className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Body (use &#123;&#123;variable&#125;&#125;)</label>
                      <textarea value={newTplBody} onChange={(e) => setNewTplBody(e.target.value)} rows={3} placeholder="⚡ FLASH SALE — {{product_name}} is {{discount}}% off for 24h. {{hashtags}}"
                        className="w-full bg-white border border-slate-200 rounded-lg px-4 py-3 text-sm font-[Manrope] outline-none focus:border-[#006c49] resize-none" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={addTemplate} className="px-5 py-2 bg-[#006c49] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-black transition-colors rounded-lg">Save Template</button>
                      <button onClick={() => setShowNewTemplate(false)} className="px-5 py-2 border border-slate-200 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-colors rounded-lg">Cancel</button>
                    </div>
                  </div>
                )}
                <div className="space-y-3">
                  {templates.map((tpl) => (
                    <div key={tpl.id} className="p-5 bg-white border border-slate-100 rounded-xl">
                      <div className="flex items-start justify-between mb-2">
                        <code className="font-mono text-sm font-bold text-[#0b1c30]">{tpl.name}</code>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-[Manrope] text-[#7c839b]">Used {tpl.usageCount}×</span>
                          <button onClick={() => useTemplate(tpl)} className="px-4 py-1.5 bg-black text-white font-[Manrope] font-bold text-[10px] tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg">Use</button>
                        </div>
                      </div>
                      <p className="text-sm font-[Manrope] text-[#45464d] bg-[#f8f9ff] px-4 py-3 rounded-lg border-l-2 border-[#006c49]">{tpl.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
