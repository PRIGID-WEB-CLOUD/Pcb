import AdminLayout from "./AdminLayout";

export default function AdminWhatsAppPage() {
  return (
    <AdminLayout sidebar="channels">
      <div className="p-12 max-w-[1280px] mx-auto min-h-screen">
        <header className="mb-12">
          <h1 className="text-[48px] font-serif font-bold text-[#0b1c30] mb-2">WhatsApp API Console</h1>
          <p className="font-[Manrope] text-[18px] text-[#7c839b] max-w-2xl">Configure your cloud integration, manage automated customer journeys, and sync your retail catalog directly to the Meta ecosystem.</p>
        </header>

        <div className="grid grid-cols-12 gap-6">
          {/* API Config */}
          <section className="col-span-12 lg:col-span-8 bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-emerald-600">api</span>
                <h3 className="text-[24px] font-serif font-semibold">API Configuration</h3>
              </div>
              <span className="font-[Manrope] font-bold text-[10px] tracking-widest text-[#006c49] bg-emerald-50 px-3 py-1 rounded-full uppercase">CONNECTED</span>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: "Cloud API Phone Number ID", value: "105938472019482" },
                  { label: "WhatsApp Business Account ID", value: "294817502938411" },
                ].map((f) => (
                  <div key={f.label} className="space-y-2">
                    <label className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#45464d] block">{f.label}</label>
                    <div className="relative">
                      <input className="w-full bg-slate-50 border border-slate-100 px-4 py-3 font-mono text-sm focus:outline-none cursor-default" readOnly type="text" defaultValue={f.value} />
                      <button className="absolute right-3 top-3 text-slate-400 hover:text-black transition-colors">
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <label className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#45464d] block">System Access Token</label>
                <div className="relative">
                  <input className="w-full bg-slate-50 border border-slate-100 px-4 py-3 font-mono text-sm focus:outline-none cursor-default" readOnly type="password" defaultValue="EAAQZA7x5ZBm9sBAA..." />
                  <button className="absolute right-12 top-3 text-slate-400 hover:text-black transition-colors">
                    <span className="material-symbols-outlined text-sm">visibility</span>
                  </button>
                  <button className="absolute right-4 top-3 text-slate-400 hover:text-black transition-colors">
                    <span className="material-symbols-outlined text-sm">refresh</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 italic font-[Manrope]">Tokens expire every 60 days. Auto-renew is currently enabled.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-serif font-bold text-sm mb-1">Webhook Endpoint</h4>
                    <code className="text-[#006c49] text-xs">https://api.yourdomain.com/v1/whatsapp/webhook</code>
                  </div>
                  <button className="text-black font-[Manrope] font-bold text-[10px] tracking-widest uppercase border border-black px-3 py-1 hover:bg-black hover:text-white transition-all">CONFIGURE</button>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Stats */}
          <section className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <h3 className="text-[16px] font-serif font-semibold mb-4">Message Stats (30d)</h3>
              <div className="space-y-4">
                {[
                  { label: "Messages Sent", value: "14,820", pct: "+8.2%" },
                  { label: "Delivered", value: "14,711", pct: "99.3%" },
                  { label: "Read Rate", value: "9,108", pct: "61.5%" },
                  { label: "Conversions", value: "482", pct: "+14%" },
                ].map((s) => (
                  <div key={s.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                    <span className="font-[Manrope] text-sm text-[#45464d]">{s.label}</span>
                    <div className="text-right">
                      <span className="font-[Manrope] font-bold">{s.value}</span>
                      <span className="text-xs text-[#006c49] ml-2 font-[Manrope]">{s.pct}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-black text-white p-6 rounded-xl">
              <h3 className="font-serif text-[18px] font-semibold mb-2">Catalog Sync</h3>
              <p className="text-white/60 text-sm font-[Manrope] mb-4">1,248 products synced to Meta</p>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></div>
                <span className="text-sm font-[Manrope] text-[#4edea3]">Live & Synced</span>
              </div>
              <button className="w-full bg-white/10 hover:bg-white/20 transition-colors text-white py-2 px-4 font-[Manrope] font-bold text-xs tracking-widest uppercase">
                Force Resync
              </button>
            </div>
          </section>

          {/* Automated Journeys */}
          <section className="col-span-12 bg-white p-8 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <h3 className="text-[24px] font-serif font-semibold mb-6">Automated Customer Journeys</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { icon: "shopping_cart", title: "Abandoned Cart", desc: "3-step recovery sequence triggered 30min after cart abandonment.", active: true, sent: "2,841" },
                { icon: "local_shipping", title: "Order Tracking", desc: "Real-time shipping updates sent automatically at each milestone.", active: true, sent: "8,102" },
                { icon: "star", title: "VIP Welcome", desc: "Exclusive welcome flow for customers spending over $2,000.", active: false, sent: "142" },
              ].map((j) => (
                <div key={j.title} className="p-6 bg-[#f8f9ff] rounded-xl border border-slate-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <span className="material-symbols-outlined text-[#7c839b]">{j.icon}</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input defaultChecked={j.active} className="sr-only peer" type="checkbox" readOnly />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006c49]"></div>
                    </label>
                  </div>
                  <h4 className="font-serif font-semibold mb-2">{j.title}</h4>
                  <p className="text-sm text-[#7c839b] font-[Manrope] mb-4">{j.desc}</p>
                  <p className="text-[10px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d]">{j.sent} sent this month</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
