import { useState } from "react";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type ChannelFilter = "all" | "instagram" | "facebook" | "twitter" | "whatsapp";

const channelTabs: { key: ChannelFilter; label: string; icon: string; href?: string }[] = [
  { key: "all",       label: "All",       icon: "hub"          },
  { key: "instagram", label: "Instagram", icon: "photo_camera", href: "/admin/channels/facebook" },
  { key: "facebook",  label: "Facebook",  icon: "storefront",   href: "/admin/channels/facebook" },
  { key: "twitter",   label: "X",         icon: "share",        href: "/admin/channels/twitter"  },
  { key: "whatsapp",  label: "WhatsApp",  icon: "chat",         href: "/admin/channels/whatsapp" },
];

export default function AdminSocialAnalyticsPage() {
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");

  return (
    <AdminLayout sidebar="channels">
      <main className="p-12 max-w-[1280px] mx-auto">
        <div className="mb-10 flex justify-between items-end">
          <div>
            <h2 className="text-[36px] font-serif font-bold text-black">Social Channel Analytics</h2>
            <p className="font-[Manrope] text-[#7c839b] mt-2">Comprehensive performance across your commerce social ecosystem.</p>
          </div>
        </div>

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

        <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-16 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-5">
            <span className="material-symbols-outlined text-3xl text-slate-300">hub</span>
          </div>
          <h3 className="font-serif text-[22px] font-semibold text-[#0b1c30] mb-2">No social data connected</h3>
          <p className="font-[Manrope] text-[#7c839b] max-w-sm mx-auto mb-8">
            Connect your social channels and configure your API credentials to start seeing live reach, engagement, and revenue metrics here.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-lg mx-auto mb-8">
            {[
              { icon: "storefront",   label: "Meta & Facebook", href: "/admin/channels/facebook" },
              { icon: "chat",         label: "WhatsApp",        href: "/admin/channels/whatsapp" },
              { icon: "share",        label: "X (Twitter)",     href: "/admin/channels/twitter"  },
            ].map((ch) => (
              <Link key={ch.label} href={ch.href}>
                <div className="p-4 border border-slate-100 rounded-xl hover:border-[#006c49] hover:bg-[#f0faf6] transition-all cursor-pointer group">
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-[#006c49] text-2xl block mb-2 transition-colors">{ch.icon}</span>
                  <p className="font-[Manrope] font-bold text-xs text-[#45464d]">{ch.label}</p>
                </div>
              </Link>
            ))}
          </div>
          <Link href="/admin/channels">
            <button className="px-8 py-3 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors rounded-lg">
              Go to Channel Hub
            </button>
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
          {["Total Reach", "Engagements", "Social Revenue", "New Followers"].map((label) => (
            <div key={label} className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-3">{label}</p>
              <h3 className="text-[26px] font-serif font-semibold text-slate-200">—</h3>
              <p className="text-[11px] text-slate-300 mt-2 font-[Manrope]">No channel connected</p>
            </div>
          ))}
        </div>
      </main>
    </AdminLayout>
  );
}
