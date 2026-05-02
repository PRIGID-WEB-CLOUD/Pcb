import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

const channels = [
  { icon: "social_leaderboard", title: "Meta & Facebook", desc: "Primary marketing and ad pixel synchronization.", sync: "4m ago", href: "/admin/channels/facebook", status: "CONNECTED", statusCls: "bg-[#6cf8bb] text-[#00714d]" },
  { icon: "storefront", title: "Meta Commerce", desc: "Inventory and product catalog direct feed.", sync: "12m ago", href: "/admin/channels/facebook", status: "CONNECTED", statusCls: "bg-[#6cf8bb] text-[#00714d]" },
  { icon: "chat", title: "WhatsApp API", desc: "Automated customer journeys and order notifications.", sync: "2m ago", href: "/admin/channels/whatsapp", status: "CONNECTED", statusCls: "bg-[#6cf8bb] text-[#00714d]" },
  { icon: "share", title: "X Social", desc: "Automated product drops and hashtag management.", sync: "1h ago", href: "/admin/channels/twitter", status: "ACTIVE", statusCls: "bg-[#6cf8bb] text-[#00714d]" },
];

export default function AdminChannelHubPage() {
  return (
    <AdminLayout sidebar="channels">
      <div className="p-12 max-w-[1280px] mx-auto">
        {/* Header */}
        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-[48px] font-serif font-bold text-[#0b1c30] mb-2">Omnichannel Hub</h1>
            <p className="text-[18px] font-[Manrope] text-[#7c839b] max-w-2xl">Manage your global brand presence across integrated ecosystems. Real-time synchronization and status monitoring for all retail endpoints.</p>
          </div>
          <div className="text-right">
            <span className="block font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#818486]">Global Status</span>
            <span className="text-[#006c49] font-bold flex items-center gap-1 justify-end font-[Manrope] mt-1">
              <span className="w-2 h-2 rounded-full bg-[#006c49]"></span> Operational
            </span>
          </div>
        </header>

        {/* Channel Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {channels.map((ch) => (
            <div key={ch.title} className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] flex flex-col group hover:-translate-y-1 transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="w-12 h-12 bg-[#eff4ff] flex items-center justify-center rounded-xl">
                  <span className="material-symbols-outlined text-black text-3xl">{ch.icon}</span>
                </div>
                <span className={`px-3 py-1 ${ch.statusCls} text-[10px] font-[Manrope] font-bold rounded-full tracking-widest`}>{ch.status}</span>
              </div>
              <h3 className="text-[24px] font-serif font-semibold mb-1">{ch.title}</h3>
              <p className="text-[#45464d] text-sm mb-6 flex-1 font-[Manrope]">{ch.desc}</p>
              <div className="mt-auto border-t border-slate-50 pt-4 flex justify-between items-center">
                <span className="text-xs text-[#818486] italic font-[Manrope]">Last sync: {ch.sync}</span>
                <Link href={ch.href}>
                  <button className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-black hover:text-[#006c49] transition-colors underline decoration-slate-200 underline-offset-4">MANAGE</button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Status Overview */}
        <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
          <h3 className="text-[24px] font-serif font-semibold mb-6">Integration Health</h3>
          <div className="space-y-4">
            {[
              { label: "API Response Time", value: "142ms", bar: "w-[85%]", barCls: "bg-[#006c49]" },
              { label: "Catalog Sync Rate", value: "99.8%", bar: "w-[99%]", barCls: "bg-[#006c49]" },
              { label: "Message Delivery Rate", value: "97.2%", bar: "w-[97%]", barCls: "bg-[#006c49]" },
              { label: "Error Rate", value: "0.2%", bar: "w-[2%]", barCls: "bg-[#ba1a1a]" },
            ].map((m) => (
              <div key={m.label} className="flex items-center gap-4">
                <span className="font-[Manrope] text-sm w-48 text-[#45464d]">{m.label}</span>
                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${m.bar} ${m.barCls} rounded-full`}></div>
                </div>
                <span className="font-[Manrope] font-bold text-sm w-16 text-right">{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
