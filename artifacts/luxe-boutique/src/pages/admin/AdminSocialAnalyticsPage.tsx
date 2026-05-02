import { useState } from "react";
import AdminLayout from "./AdminLayout";

type Range = "7" | "30" | "90";
type ChannelFilter = "all" | "instagram" | "facebook" | "twitter" | "whatsapp";

const metricsData: Record<Range, { reach: string; reachPrev: string; reachChange: string; reachUp: boolean; eng: string; engPrev: string; engChange: string; engUp: boolean; rev: string; revPrev: string; revChange: string; revUp: boolean; followers: string; followersPrev: string; followersChange: string; followersUp: boolean }> = {
  "7":  { reach: "560K",  reachPrev: "v.s. 490K previous period",   reachChange: "+14.3%", reachUp: true,  eng: "19.2K", engPrev: "v.s. 16.8K previous period",  engChange: "+14.3%", engUp: true,  rev: "$9,840",  revPrev: "v.s. $7.9K previous period",  revChange: "+24.6%", revUp: true,  followers: "812",   followersPrev: "v.s. 920 previous period",  followersChange: "-11.7%", followersUp: false },
  "30": { reach: "2.4M",  reachPrev: "v.s. 2.1M previous period",   reachChange: "+12.5%", reachUp: true,  eng: "84.2K", engPrev: "v.s. 77.9K previous period",  engChange: "+8.1%",  engUp: true,  rev: "$42,890", revPrev: "v.s. $36.2K previous period", revChange: "+18.4%", revUp: true,  followers: "3,841", followersPrev: "v.s. 3,934 previous period", followersChange: "-2.4%",  followersUp: false },
  "90": { reach: "6.8M",  reachPrev: "v.s. 5.9M previous period",   reachChange: "+15.3%", reachUp: true,  eng: "241K", engPrev: "v.s. 210K previous period",   engChange: "+14.8%", engUp: true,  rev: "$128K",   revPrev: "v.s. $102K previous period",  revChange: "+25.5%", revUp: true,  followers: "11.2K", followersPrev: "v.s. 9.8K previous period",  followersChange: "+14.3%", followersUp: true  },
};

const channelData: Record<ChannelFilter, { channel: string; icon: string; reach: string; engagement: string; revenue: string; barW: number; color: string }[]> = {
  all: [
    { channel: "Instagram",   icon: "photo_camera", reach: "1.2M",  engagement: "5.4%", revenue: "$22,400", barW: 80, color: "bg-[#006c49]" },
    { channel: "Facebook",    icon: "storefront",   reach: "840K",  engagement: "3.2%", revenue: "$14,200", barW: 60, color: "bg-[#131b2e]" },
    { channel: "X (Twitter)", icon: "share",        reach: "280K",  engagement: "2.8%", revenue: "$4,100",  barW: 25, color: "bg-slate-400"  },
    { channel: "WhatsApp",    icon: "chat",         reach: "80K",   engagement: "62%",  revenue: "$2,190",  barW: 15, color: "bg-emerald-400"},
  ],
  instagram:  [{ channel: "Instagram",   icon: "photo_camera", reach: "1.2M",  engagement: "5.4%", revenue: "$22,400", barW: 100, color: "bg-[#006c49]" }],
  facebook:   [{ channel: "Facebook",    icon: "storefront",   reach: "840K",  engagement: "3.2%", revenue: "$14,200", barW: 100, color: "bg-[#131b2e]" }],
  twitter:    [{ channel: "X (Twitter)", icon: "share",        reach: "280K",  engagement: "2.8%", revenue: "$4,100",  barW: 100, color: "bg-slate-400"  }],
  whatsapp:   [{ channel: "WhatsApp",    icon: "chat",         reach: "80K",   engagement: "62%",  revenue: "$2,190",  barW: 100, color: "bg-emerald-400"}],
};

const topContent: Record<ChannelFilter, { type: string; title: string; likes: string; icon: string }[]> = {
  all: [
    { type: "Instagram Reel",  title: "SS24 Collection Drop",    likes: "12.4K",    icon: "play_circle"     },
    { type: "Facebook Post",   title: "Behind the Craft",         likes: "8.2K",     icon: "article"         },
    { type: "X Thread",        title: "Sustainability Story",     likes: "5.1K",     icon: "thread_unread"   },
    { type: "WhatsApp Blast",  title: "VIP Early Access",         likes: "98% read", icon: "mark_chat_read"  },
  ],
  instagram: [
    { type: "Instagram Reel",  title: "SS24 Collection Drop",    likes: "12.4K",    icon: "play_circle"     },
    { type: "Instagram Post",  title: "New Arrivals Grid",        likes: "9.8K",     icon: "photo_camera"    },
    { type: "Instagram Story", title: "Behind the Scenes",        likes: "4.2K",     icon: "add_circle"      },
  ],
  facebook: [
    { type: "Facebook Post",   title: "Behind the Craft",         likes: "8.2K",     icon: "article"         },
    { type: "Facebook Ad",     title: "Spring Campaign",           likes: "6.1K",     icon: "ads_click"       },
  ],
  twitter: [
    { type: "X Thread",        title: "Sustainability Story",     likes: "5.1K",     icon: "thread_unread"   },
    { type: "X Post",          title: "Silk Blazer Launch",        likes: "3.4K",     icon: "send"            },
  ],
  whatsapp: [
    { type: "WhatsApp Blast",  title: "VIP Early Access",         likes: "98% read", icon: "mark_chat_read"  },
    { type: "Automation",      title: "Cart Recovery Flow",        likes: "62% read", icon: "shopping_cart"   },
  ],
};

const heatmapData: Record<ChannelFilter, number[][]> = {
  all:       [[0.3,0.6,0.4,0.9,0.7,0.5,0.8],[0.2,0.5,0.8,0.6,0.9,0.7,0.4],[0.4,0.7,0.5,0.8,0.6,0.9,0.3],[0.3,0.4,0.6,0.7,0.8,0.6,0.5],[0.5,0.8,0.7,0.9,0.6,0.4,0.3],[0.2,0.4,0.6,0.5,0.7,0.8,0.6],[0.6,0.9,0.8,0.7,0.5,0.3,0.4],[0.4,0.6,0.5,0.8,0.9,0.7,0.5]],
  instagram: [[0.3,0.7,0.5,0.9,0.8,0.6,0.4],[0.4,0.6,0.9,0.7,0.8,0.5,0.3],[0.5,0.8,0.6,0.9,0.7,0.4,0.2],[0.3,0.5,0.7,0.8,0.9,0.6,0.4],[0.6,0.9,0.8,0.7,0.5,0.3,0.2],[0.2,0.4,0.5,0.6,0.7,0.9,0.8],[0.5,0.7,0.8,0.9,0.6,0.4,0.3],[0.4,0.6,0.7,0.8,0.9,0.5,0.3]],
  facebook:  [[0.2,0.5,0.4,0.7,0.6,0.4,0.6],[0.3,0.4,0.6,0.5,0.7,0.6,0.3],[0.3,0.6,0.4,0.7,0.5,0.8,0.4],[0.2,0.3,0.5,0.6,0.7,0.5,0.4],[0.4,0.6,0.5,0.7,0.5,0.3,0.2],[0.1,0.3,0.5,0.4,0.6,0.7,0.5],[0.4,0.7,0.6,0.5,0.4,0.2,0.3],[0.3,0.5,0.4,0.6,0.7,0.4,0.3]],
  twitter:   [[0.4,0.5,0.3,0.6,0.5,0.4,0.7],[0.2,0.4,0.6,0.4,0.6,0.5,0.3],[0.3,0.5,0.4,0.6,0.4,0.7,0.2],[0.2,0.3,0.4,0.5,0.6,0.4,0.3],[0.3,0.5,0.4,0.6,0.4,0.2,0.2],[0.1,0.2,0.4,0.3,0.5,0.6,0.4],[0.3,0.5,0.5,0.4,0.3,0.2,0.3],[0.3,0.4,0.3,0.5,0.6,0.4,0.3]],
  whatsapp:  [[0.1,0.3,0.2,0.5,0.4,0.2,0.3],[0.1,0.2,0.4,0.3,0.5,0.4,0.2],[0.2,0.4,0.3,0.5,0.3,0.5,0.1],[0.1,0.2,0.3,0.4,0.5,0.3,0.2],[0.2,0.4,0.3,0.5,0.3,0.2,0.1],[0.1,0.2,0.3,0.2,0.4,0.5,0.3],[0.2,0.4,0.4,0.3,0.2,0.1,0.2],[0.2,0.3,0.2,0.4,0.5,0.3,0.2]],
};

const HOURS = ["6am","8am","10am","12pm","2pm","4pm","6pm","8pm"];

export default function AdminSocialAnalyticsPage() {
  const [range, setRange] = useState<Range>("30");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      setExporting(false);
      showToast("Report exported — check your downloads.");
    }, 2000);
  };

  const m = metricsData[range];
  const channels = channelData[channelFilter];
  const content = topContent[channelFilter];
  const heatmap = heatmapData[channelFilter];

  const channelTabs: { key: ChannelFilter; label: string; icon: string }[] = [
    { key: "all",       label: "All",       icon: "hub"         },
    { key: "instagram", label: "Instagram", icon: "photo_camera"},
    { key: "facebook",  label: "Facebook",  icon: "storefront"  },
    { key: "twitter",   label: "X",         icon: "share"       },
    { key: "whatsapp",  label: "WhatsApp",  icon: "chat"        },
  ];

  return (
    <AdminLayout sidebar="channels">
      <main className="p-12 max-w-[1280px] mx-auto">
        {/* Toast */}
        {toast && (
          <div className="fixed top-6 right-6 z-50 bg-black text-white px-6 py-3 rounded-lg shadow-2xl font-[Manrope] text-sm font-bold flex items-center gap-3">
            <span className="material-symbols-outlined text-[#6cf8bb] text-base">check_circle</span>
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-[36px] font-serif font-bold text-black">Social Channel Analytics</h2>
            <p className="font-[Manrope] text-[#7c839b] mt-2">Comprehensive performance across your commerce social ecosystem.</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
              {(["7", "30", "90"] as Range[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-4 py-1.5 text-xs font-[Manrope] font-bold rounded-md transition-all ${range === r ? "bg-white text-black shadow-sm" : "text-[#7c839b] hover:text-black"}`}
                >
                  {r}d
                </button>
              ))}
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-5 py-2 bg-black text-white rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] disabled:opacity-60 transition-all flex items-center gap-2"
            >
              <span className={`material-symbols-outlined text-[16px] ${exporting ? "animate-bounce" : ""}`}>download</span>
              {exporting ? "Exporting…" : "Export Report"}
            </button>
          </div>
        </div>

        {/* Channel Filter Tabs */}
        <div className="flex gap-2 mb-8 border-b border-slate-100 pb-4">
          {channelTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setChannelFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-[Manrope] font-bold uppercase tracking-widest transition-all ${channelFilter === tab.key ? "bg-black text-white" : "bg-slate-100 text-[#7c839b] hover:bg-slate-200 hover:text-black"}`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          {[
            { icon: "visibility",  label: "Total Reach",    value: m.reach,     change: m.reachChange,     prev: m.reachPrev,     up: m.reachUp     },
            { icon: "thumb_up",    label: "Engagements",   value: m.eng,       change: m.engChange,       prev: m.engPrev,       up: m.engUp       },
            { icon: "shopping_bag",label: "Social Revenue", value: m.rev,       change: m.revChange,       prev: m.revPrev,       up: m.revUp       },
            { icon: "group_add",   label: "New Followers", value: m.followers, change: m.followersChange, prev: m.followersPrev, up: m.followersUp },
          ].map((card) => (
            <div key={card.label} className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] hover:-translate-y-0.5 transition-transform">
              <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-50 rounded-lg">
                  <span className="material-symbols-outlined text-black">{card.icon}</span>
                </div>
                <span className={`font-[Manrope] font-bold text-xs flex items-center px-2 py-0.5 rounded-full ${card.up ? "bg-[#6cf8bb] text-[#00714d]" : "bg-[#ffdad6] text-[#93000a]"}`}>
                  {card.change}
                </span>
              </div>
              <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-1">{card.label}</p>
              <h3 className="text-[26px] font-serif font-semibold text-[#0b1c30]">{card.value}</h3>
              <p className="text-[11px] text-[#7c839b] mt-2 font-[Manrope]">{card.prev}</p>
            </div>
          ))}
        </div>

        {/* Channel Breakdown + Top Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-xl">
            <h3 className="text-[22px] font-serif font-semibold mb-6">Channel Performance Breakdown</h3>
            <div className="space-y-6">
              {channels.map((c) => (
                <div key={c.channel} className="flex items-center gap-4">
                  <div className="p-2 bg-[#f8f9ff] rounded-lg w-10 h-10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[#7c839b]">{c.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-[Manrope] font-bold text-sm">{c.channel}</span>
                      <span className="font-[Manrope] font-bold text-sm">{c.reach}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div className={`${c.color} h-full rounded-full transition-all duration-500`} style={{ width: `${c.barW}%` }}></div>
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

          <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-xl">
            <h3 className="text-[22px] font-serif font-semibold mb-6">Top Content</h3>
            <div className="space-y-4">
              {content.map((p) => (
                <div key={p.title} className="p-4 bg-[#f8f9ff] rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-white rounded-md shadow-sm shrink-0">
                      <span className="material-symbols-outlined text-[#7c839b] text-base">{p.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b]">{p.type}</p>
                      <p className="font-[Manrope] font-semibold text-sm mt-0.5 truncate">{p.title}</p>
                    </div>
                    <span className="font-[Manrope] font-bold text-sm text-[#006c49] shrink-0">{p.likes}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Engagement Heatmap */}
        <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-xl">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[22px] font-serif font-semibold mb-1">Weekly Engagement Pattern</h3>
              <p className="text-sm text-[#7c839b] font-[Manrope]">Optimal posting windows — click a cell to schedule a tweet</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs font-[Manrope] text-[#7c839b]">Low</span>
              <div className="flex gap-1">
                {[0.1, 0.3, 0.5, 0.7, 0.9].map((o, i) => (
                  <div key={i} className="w-6 h-4 rounded" style={{ backgroundColor: `rgba(0, 108, 73, ${o})` }}></div>
                ))}
              </div>
              <span className="text-xs font-[Manrope] text-[#7c839b]">High</span>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Hour labels */}
            <div className="flex flex-col justify-around pr-2 shrink-0">
              {HOURS.map((h) => (
                <span key={h} className="font-[Manrope] text-[10px] text-[#7c839b] h-6 flex items-center">{h}</span>
              ))}
            </div>
            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 gap-1.5">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, di) => (
                <div key={day} className="flex flex-col gap-1.5">
                  <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] text-center mb-1">{day}</p>
                  {heatmap.map((row, ri) => (
                    <div
                      key={ri}
                      title={`${day} ${HOURS[ri]}: ${Math.round(row[di] * 100)}% engagement`}
                      className="h-6 rounded cursor-pointer hover:ring-2 hover:ring-[#006c49] hover:ring-offset-1 transition-all"
                      style={{ backgroundColor: `rgba(0, 108, 73, ${row[di]})` }}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}
