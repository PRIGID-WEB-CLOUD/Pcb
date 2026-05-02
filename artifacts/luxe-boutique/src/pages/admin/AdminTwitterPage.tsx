import AdminLayout from "./AdminLayout";

const hashtags = ["#LuxeFashion", "#EditorialStyle", "#SlowFashion", "#LuxeAesthetic", "#FashionWeek", "#CoutureLuxe"];

export default function AdminTwitterPage() {
  return (
    <AdminLayout sidebar="channels">
      <div className="flex-grow px-6 py-12 max-w-[1280px] mx-auto">
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
          {/* Left: Automated Posting */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            {/* Product Drop Scheduler */}
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-[#6cf8bb] p-3 rounded-lg">
                    <span className="material-symbols-outlined text-[#006c49]">inventory_2</span>
                  </div>
                  <div>
                    <h3 className="text-[24px] font-serif font-semibold">Product Drop Scheduler</h3>
                    <p className="text-sm text-[#7c839b] font-[Manrope]">Auto-share new inventory arrivals</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input defaultChecked className="sr-only peer" type="checkbox" readOnly />
                  <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006c49]"></div>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Drop Frequency", options: ["Real-time (Immediate)", "Daily Digest (6 PM)", "Weekly Roundup"] },
                  { label: "Image Style", options: ["Single Product High-Res", "Grid (4-up)", "Carousel Thread"] },
                ].map((f) => (
                  <div key={f.label} className="space-y-2">
                    <label className="block font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#45464d]">{f.label}</label>
                    <select className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-sm font-[Manrope] focus:ring-[#006c49] outline-none">
                      {f.options.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
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
                  <p className="text-sm text-[#7c839b] font-[Manrope]">Optimize reach with curated sets</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {hashtags.map((tag) => (
                  <span key={tag} className="bg-[#eff4ff] text-[#0b1c30] px-3 py-1.5 rounded-full text-xs font-[Manrope] font-bold flex items-center gap-1">
                    {tag}
                    <button className="text-[#45464d] hover:text-black ml-1">
                      <span className="material-symbols-outlined text-xs">close</span>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-3">
                <input className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none" placeholder="Add hashtag..." type="text" />
                <button className="bg-black text-white px-4 py-2 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors">Add</button>
              </div>
            </div>

            {/* Tweet Preview */}
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <h3 className="text-[24px] font-serif font-semibold mb-4">Tweet Preview</h3>
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center text-white text-xs font-bold">LB</div>
                  <div>
                    <p className="font-bold text-sm">Luxe Boutique</p>
                    <p className="text-xs text-slate-400 font-[Manrope]">@luxeboutique</p>
                  </div>
                </div>
                <p className="text-sm font-[Manrope] mb-3">✨ NEW ARRIVAL — Introducing the Silk Evening Blazer. Crafted from premium mulberry silk, this piece redefines modern elegance. Available now. #LuxeFashion #EditorialStyle</p>
                <div className="bg-slate-100 rounded-lg h-40 flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-300 text-4xl">image</span>
                </div>
              </div>
              <button className="mt-4 w-full bg-black text-white py-3 rounded-xl font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors">
                Schedule This Tweet
              </button>
            </div>
          </div>

          {/* Right: Stats & Settings */}
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
                  { time: "9:00 AM", day: "Tuesday–Thursday", score: "92%" },
                  { time: "7:00 PM", day: "Friday–Saturday", score: "88%" },
                  { time: "12:00 PM", day: "Monday", score: "74%" },
                ].map((t) => (
                  <div key={t.time} className="flex items-center justify-between p-3 bg-[#f8f9ff] rounded-lg">
                    <div>
                      <span className="font-[Manrope] font-bold text-sm">{t.time}</span>
                      <span className="text-xs text-[#7c839b] font-[Manrope] ml-2">{t.day}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="bg-[#006c49] h-full" style={{ width: t.score }}></div>
                      </div>
                      <span className="text-xs font-[Manrope] font-bold text-[#006c49]">{t.score}</span>
                    </div>
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
