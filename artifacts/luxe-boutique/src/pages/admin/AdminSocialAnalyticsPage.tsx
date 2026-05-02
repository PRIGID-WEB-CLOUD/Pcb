import AdminLayout from "./AdminLayout";

export default function AdminSocialAnalyticsPage() {
  return (
    <AdminLayout sidebar="channels">
      <main className="p-12 max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-[36px] font-serif font-bold text-black">Social Channel Analytics</h2>
            <p className="font-[Manrope] text-[#7c839b] mt-2">Comprehensive performance across your commerce social ecosystem.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-2 border border-[#c6c6cd] rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase text-[#0b1c30] hover:bg-[#f8f9ff] transition-all flex items-center">
              <span className="material-symbols-outlined text-[18px] mr-2">calendar_month</span> Last 30 Days
            </button>
            <button className="px-6 py-2 bg-black text-white rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all flex items-center">
              <span className="material-symbols-outlined text-[18px] mr-2">download</span> Export Report
            </button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: "visibility", label: "Total Reach", value: "2.4M", change: "+12.5%", prev: "v.s. 2.1M previous period", up: true },
            { icon: "thumb_up", label: "Engagements", value: "84.2K", change: "+8.1%", prev: "v.s. 77.9K previous period", up: true },
            { icon: "shopping_bag", label: "Social Revenue", value: "$42,890", change: "+18.4%", prev: "v.s. $36.2K previous period", up: true },
            { icon: "group_add", label: "New Followers", value: "3,841", change: "-2.4%", prev: "v.s. 3,934 previous period", up: false },
          ].map((m) => (
            <div key={m.label} className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] group hover:-translate-y-0.5 transition-transform">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-50 rounded-lg text-black">
                  <span className="material-symbols-outlined">{m.icon}</span>
                </div>
                <span className={`font-[Manrope] font-bold text-xs flex items-center px-2 py-0.5 rounded-full ${m.up ? "bg-[#6cf8bb] text-[#00714d]" : "bg-[#ffdad6] text-[#93000a]"}`}>{m.change}</span>
              </div>
              <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-1">{m.label}</p>
              <h3 className="text-[24px] font-serif font-semibold text-[#0b1c30]">{m.value}</h3>
              <p className="text-[11px] text-[#7c839b] mt-2 font-[Manrope]">{m.prev}</p>
            </div>
          ))}
        </div>

        {/* Channel Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2 bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-xl">
            <h3 className="text-[24px] font-serif font-semibold mb-6">Channel Performance Breakdown</h3>
            <div className="space-y-6">
              {[
                { channel: "Instagram", icon: "photo_camera", reach: "1.2M", engagement: "5.4%", revenue: "$22,400", barW: "80%", color: "bg-[#006c49]" },
                { channel: "Facebook", icon: "storefront", reach: "840K", engagement: "3.2%", revenue: "$14,200", barW: "60%", color: "bg-[#131b2e]" },
                { channel: "X (Twitter)", icon: "share", reach: "280K", engagement: "2.8%", revenue: "$4,100", barW: "25%", color: "bg-slate-400" },
                { channel: "WhatsApp", icon: "chat", reach: "80K", engagement: "62%", revenue: "$2,190", barW: "15%", color: "bg-emerald-400" },
              ].map((c) => (
                <div key={c.channel} className="flex items-center gap-4">
                  <div className="p-2 bg-[#f8f9ff] rounded-lg w-10 h-10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[#7c839b]">{c.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-[Manrope] font-bold text-sm">{c.channel}</span>
                      <span className="font-[Manrope] font-bold text-sm">{c.reach}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${c.color} h-full rounded-full`} style={{ width: c.barW }}></div>
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] font-[Manrope] text-[#7c839b]">
                      <span>Eng: {c.engagement}</span>
                      <span>Rev: {c.revenue}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Best Performing Content */}
          <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-xl">
            <h3 className="text-[24px] font-serif font-semibold mb-6">Top Content</h3>
            <div className="space-y-4">
              {[
                { type: "Instagram Reel", title: "SS24 Collection Drop", likes: "12.4K", icon: "play_circle" },
                { type: "Facebook Post", title: "Behind the Craft", likes: "8.2K", icon: "article" },
                { type: "X Thread", title: "Sustainability Story", likes: "5.1K", icon: "thread_unread" },
                { type: "WhatsApp Blast", title: "VIP Early Access", likes: "98% read", icon: "mark_chat_read" },
              ].map((p) => (
                <div key={p.title} className="p-4 bg-[#f8f9ff] rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-white rounded-md shadow-sm">
                      <span className="material-symbols-outlined text-[#7c839b] text-base">{p.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-[Manrope] font-bold text-xs tracking-widest uppercase text-[#7c839b]">{p.type}</p>
                      <p className="font-[Manrope] font-semibold text-sm mt-0.5">{p.title}</p>
                    </div>
                    <span className="font-[Manrope] font-bold text-sm text-[#006c49]">{p.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Engagement Heatmap placeholder */}
        <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-xl">
          <h3 className="text-[24px] font-serif font-semibold mb-2">Weekly Engagement Pattern</h3>
          <p className="text-sm text-[#7c839b] font-[Manrope] mb-6">Optimal posting windows across all channels</p>
          <div className="grid grid-cols-7 gap-2">
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((day) => (
              <div key={day} className="text-center">
                <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-2">{day}</p>
                <div className="space-y-1.5">
                  {[0.3,0.6,0.4,0.9,0.7,0.5,0.8,0.3].map((opacity, i) => (
                    <div key={i} className="h-6 rounded" style={{ backgroundColor: `rgba(0, 108, 73, ${opacity})` }}></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 justify-end">
            <span className="text-xs font-[Manrope] text-[#7c839b]">Low</span>
            <div className="flex gap-1">
              {[0.1,0.3,0.5,0.7,0.9].map((o, i) => (
                <div key={i} className="w-6 h-4 rounded" style={{ backgroundColor: `rgba(0, 108, 73, ${o})` }}></div>
              ))}
            </div>
            <span className="text-xs font-[Manrope] text-[#7c839b]">High</span>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}
