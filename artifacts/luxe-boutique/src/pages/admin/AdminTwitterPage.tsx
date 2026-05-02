import { useState, useRef } from "react";
import AdminLayout from "./AdminLayout";

const INITIAL_HASHTAGS = ["#LuxeFashion", "#EditorialStyle", "#SlowFashion", "#LuxeAesthetic", "#FashionWeek", "#CoutureLuxe"];
const MAX_CHARS = 280;
const DEFAULT_TWEET = "✨ NEW ARRIVAL — Introducing the Silk Evening Blazer. Crafted from premium mulberry silk, this piece redefines modern elegance. Available now. #LuxeFashion #EditorialStyle";

type DropFrequency = "Real-time (Immediate)" | "Daily Digest (6 PM)" | "Weekly Roundup";
type ImageStyle = "Single Product High-Res" | "Grid (4-up)" | "Carousel Thread";

interface ScheduledTweet {
  id: number;
  text: string;
  scheduledFor: string;
}

export default function AdminTwitterPage() {
  const [hashtags, setHashtags] = useState<string[]>(INITIAL_HASHTAGS);
  const [newTag, setNewTag] = useState("");
  const [tweetText, setTweetText] = useState(DEFAULT_TWEET);
  const [schedulerOn, setSchedulerOn] = useState(true);
  const [dropFreq, setDropFreq] = useState<DropFrequency>("Real-time (Immediate)");
  const [imageStyle, setImageStyle] = useState<ImageStyle>("Single Product High-Res");
  const [scheduled, setScheduled] = useState<ScheduledTweet[]>([]);
  const [scheduling, setScheduling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const addHashtag = () => {
    if (!newTag.trim()) return;
    const tag = newTag.trim().startsWith("#") ? newTag.trim() : `#${newTag.trim()}`;
    if (hashtags.includes(tag)) { showToast("That hashtag already exists."); return; }
    if (hashtags.length >= 10) { showToast("Maximum 10 hashtags per strategy."); return; }
    setHashtags((prev) => [...prev, tag]);
    setNewTag("");
    tagInputRef.current?.focus();
  };

  const removeHashtag = (tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addHashtag(); }
  };

  const scheduleTweet = () => {
    if (!tweetText.trim() || tweetText.length > MAX_CHARS) return;
    setScheduling(true);
    setTimeout(() => {
      const now = new Date();
      const scheduledFor = dropFreq === "Real-time (Immediate)"
        ? "Posting now…"
        : dropFreq === "Daily Digest (6 PM)"
        ? `Today at 6:00 PM`
        : `${now.toLocaleDateString("en-US", { weekday: "long" })} at 9:00 AM`;
      setScheduled((prev) => [{ id: Date.now(), text: tweetText, scheduledFor }, ...prev.slice(0, 2)]);
      setScheduling(false);
      showToast("Tweet scheduled successfully.");
    }, 1500);
  };

  const charsLeft = MAX_CHARS - tweetText.length;
  const overLimit = charsLeft < 0;
  const circlePercent = Math.min(100, (tweetText.length / MAX_CHARS) * 100);
  const circleColor = charsLeft <= 20 ? (overLimit ? "#ba1a1a" : "#f59e0b") : "#006c49";
  const r = 10;
  const circ = 2 * Math.PI * r;

  return (
    <AdminLayout sidebar="channels">
      <div className="flex-grow px-6 py-12 max-w-[1280px] mx-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-[36px] font-serif font-bold text-[#0b1c30] mb-2">X (Twitter) Settings</h2>
            <p className="font-[Manrope] text-[#7c839b] max-w-2xl">Configure your automated social workflow, schedule high-engagement drops, and manage global hashtag strategies.</p>
          </div>
          <div className="flex items-center gap-3 px-4 py-2 bg-[#6cf8bb]/30 border border-[#6cf8bb] rounded-full">
            <span className="flex h-2 w-2 rounded-full bg-[#006c49]"></span>
            <span className="text-[#006c49] font-[Manrope] font-bold text-[11px] tracking-widest uppercase">API Status: Connected</span>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left column */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Product Drop Scheduler */}
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg transition-colors ${schedulerOn ? "bg-[#6cf8bb]" : "bg-slate-100"}`}>
                    <span className={`material-symbols-outlined ${schedulerOn ? "text-[#006c49]" : "text-slate-400"}`}>inventory_2</span>
                  </div>
                  <div>
                    <h3 className="text-[24px] font-serif font-semibold">Product Drop Scheduler</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">Auto-share new inventory arrivals</p>
                  </div>
                </div>
                <button
                  onClick={() => { setSchedulerOn((v) => !v); showToast(`Product Drop Scheduler ${schedulerOn ? "paused" : "activated"}.`); }}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${schedulerOn ? "bg-[#006c49]" : "bg-slate-300"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${schedulerOn ? "translate-x-5" : "translate-x-0.5"}`}></span>
                </button>
              </div>
              <div className={`grid grid-cols-2 gap-4 transition-opacity ${schedulerOn ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
                <div className="space-y-2">
                  <label className="block font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Drop Frequency</label>
                  <select
                    value={dropFreq}
                    onChange={(e) => setDropFreq(e.target.value as DropFrequency)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]"
                  >
                    {["Real-time (Immediate)", "Daily Digest (6 PM)", "Weekly Roundup"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">Image Style</label>
                  <select
                    value={imageStyle}
                    onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49]"
                  >
                    {["Single Product High-Res", "Grid (4-up)", "Carousel Thread"].map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* Hashtag Management */}
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-[#131b2e] p-3 rounded-lg">
                  <span className="material-symbols-outlined text-white">tag</span>
                </div>
                <div>
                  <h3 className="text-[24px] font-serif font-semibold">Hashtag Strategies</h3>
                  <p className="text-sm text-[#7c839b] font-[Manrope]">Optimize reach with curated sets · {hashtags.length}/10</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4 min-h-[40px]">
                {hashtags.map((tag) => (
                  <span key={tag} className="bg-[#eff4ff] text-[#0b1c30] px-3 py-1.5 rounded-full text-xs font-[Manrope] font-bold flex items-center gap-1 group">
                    {tag}
                    <button
                      onClick={() => removeHashtag(tag)}
                      className="text-[#45464d] hover:text-red-500 ml-1 transition-colors"
                      title="Remove"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                ))}
                {hashtags.length === 0 && (
                  <span className="text-sm text-[#7c839b] font-[Manrope] italic">No hashtags added yet.</span>
                )}
              </div>
              <div className="flex gap-3">
                <input
                  ref={tagInputRef}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-[#006c49] transition-colors"
                  placeholder="Add hashtag… (e.g. LuxeStyle)"
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
                <button
                  onClick={addHashtag}
                  className="bg-black text-white px-4 py-2 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Tweet Composer */}
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-[24px] font-serif font-semibold">Tweet Composer</h3>
                <div className="flex items-center gap-2">
                  <svg width="28" height="28" viewBox="0 0 28 28">
                    <circle cx="14" cy="14" r={r} fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    <circle
                      cx="14" cy="14" r={r} fill="none"
                      stroke={circleColor} strokeWidth="3"
                      strokeDasharray={circ}
                      strokeDashoffset={circ - (circ * circlePercent) / 100}
                      strokeLinecap="round"
                      transform="rotate(-90 14 14)"
                      style={{ transition: "stroke-dashoffset 0.2s, stroke 0.2s" }}
                    />
                  </svg>
                  <span className={`font-[Manrope] font-bold text-sm ${overLimit ? "text-[#ba1a1a]" : charsLeft <= 20 ? "text-amber-600" : "text-[#7c839b]"}`}>
                    {charsLeft}
                  </span>
                </div>
              </div>

              {/* Live Preview */}
              <div className="border border-slate-200 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold shrink-0">LB</div>
                  <div>
                    <p className="font-bold text-sm">Luxe Boutique</p>
                    <p className="text-xs text-slate-400 font-[Manrope]">@luxeboutique · {dropFreq === "Real-time (Immediate)" ? "now" : dropFreq === "Daily Digest (6 PM)" ? "6:00 PM" : "Mon 9:00 AM"}</p>
                  </div>
                </div>
                <p className="text-sm font-[Manrope] mb-3 whitespace-pre-wrap break-words min-h-[40px]">
                  {tweetText || <span className="text-slate-300">Start typing your tweet…</span>}
                </p>
                <div className="bg-slate-100 rounded-lg h-32 flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-slate-300 text-3xl block">image</span>
                    <span className="text-xs text-slate-300 font-[Manrope]">{imageStyle}</span>
                  </div>
                </div>
              </div>

              <textarea
                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-4 py-3 text-sm font-[Manrope] outline-none focus:border-[#006c49] resize-none transition-colors"
                rows={3}
                placeholder="Compose your tweet…"
                value={tweetText}
                onChange={(e) => setTweetText(e.target.value)}
              />

              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => {
                    const tags = hashtags.slice(0, 3).join(" ");
                    setTweetText((prev) => prev.includes(tags) ? prev : `${prev} ${tags}`.trim());
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-[Manrope] font-bold uppercase tracking-widest hover:border-[#006c49] hover:text-[#006c49] transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">tag</span> Insert Tags
                </button>
                <button
                  onClick={scheduleTweet}
                  disabled={overLimit || !tweetText.trim() || scheduling}
                  className="flex-1 bg-black text-white py-2 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {scheduling ? (
                    <><span className="material-symbols-outlined text-sm animate-spin">refresh</span> Scheduling…</>
                  ) : (
                    <><span className="material-symbols-outlined text-sm">schedule_send</span> Schedule Tweet</>
                  )}
                </button>
              </div>

              {/* Scheduled Queue */}
              {scheduled.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b]">Scheduled Queue</p>
                  {scheduled.map((tw) => (
                    <div key={tw.id} className="p-3 bg-[#f8f9ff] rounded-lg flex items-start justify-between gap-3">
                      <p className="text-xs font-[Manrope] text-[#45464d] line-clamp-2 flex-1">{tw.text}</p>
                      <span className="text-[10px] font-[Manrope] font-bold text-[#006c49] shrink-0">{tw.scheduledFor}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            {/* Performance */}
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <h3 className="text-[24px] font-serif font-semibold mb-6">Channel Performance</h3>
              <div className="space-y-4">
                {[
                  { label: "Followers", value: "48.2K", change: "+1.2K", up: true },
                  { label: "Avg. Impressions/Post", value: "12.4K", change: "+8.4%", up: true },
                  { label: "Engagement Rate", value: "4.8%", change: "+0.3%", up: true },
                  { label: "Link Clicks", value: "2,841", change: "+22%", up: true },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center py-3 border-b border-slate-50 last:border-0">
                    <span className="font-[Manrope] text-sm text-[#45464d]">{s.label}</span>
                    <div className="text-right">
                      <span className="font-[Manrope] font-bold">{s.value}</span>
                      <span className={`text-xs font-[Manrope] font-bold ml-2 ${s.up ? "text-[#006c49]" : "text-[#ba1a1a]"}`}>{s.change}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Best Times to Post */}
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <h3 className="font-serif text-[18px] font-semibold mb-4">Best Times to Post</h3>
              <div className="space-y-3">
                {[
                  { time: "9:00 AM", day: "Tuesday–Thursday", score: 92 },
                  { time: "7:00 PM", day: "Friday–Saturday", score: 88 },
                  { time: "12:00 PM", day: "Monday", score: 74 },
                ].map((t) => (
                  <div key={t.time} className="flex items-center justify-between p-3 bg-[#f8f9ff] rounded-lg">
                    <div>
                      <span className="font-[Manrope] font-bold text-sm">{t.time}</span>
                      <span className="text-xs text-[#7c839b] font-[Manrope] ml-2">{t.day}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-[#006c49] h-full rounded-full" style={{ width: `${t.score}%` }}></div>
                      </div>
                      <span className="text-xs font-[Manrope] font-bold text-[#006c49] w-8 text-right">{t.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <h3 className="font-serif text-[18px] font-semibold mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { action: "Tweet posted", detail: "Silk Evening Blazer drop", time: "2h ago", icon: "send" },
                  { action: "Hashtag added", detail: "#CoutureLuxe", time: "5h ago", icon: "tag" },
                  { action: "Auto-post triggered", detail: "New arrival: Cashmere Coat", time: "1d ago", icon: "automation" },
                ].map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#eff4ff] rounded-lg flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[#006c49] text-sm">{a.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-[Manrope] font-bold text-sm">{a.action}</p>
                      <p className="font-[Manrope] text-xs text-[#7c839b]">{a.detail}</p>
                    </div>
                    <span className="text-xs text-[#7c839b] font-[Manrope] shrink-0">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
