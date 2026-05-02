import AdminLayout from "./AdminLayout";

export default function AdminFacebookPage() {
  return (
    <AdminLayout sidebar="channels">
      <div className="p-12 max-w-[1280px] mx-auto">
        <div className="mb-12">
          <h2 className="text-[36px] font-serif font-bold text-[#0b1c30] mb-2">Meta Commerce Manager</h2>
          <p className="font-[Manrope] text-[18px] text-[#7c839b] max-w-2xl">Manage your Facebook and Instagram shop presence, synchronize product catalogs, and automate social distribution through a unified editorial dashboard.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Catalog Sync */}
          <section className="col-span-12 lg:col-span-7 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-6 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <span className="material-symbols-outlined text-[120px]">sync</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-[#eff4ff] rounded-lg text-[#006c49]">
                  <span className="material-symbols-outlined">database</span>
                </div>
                <h3 className="text-[24px] font-serif font-semibold">Catalog Sync</h3>
              </div>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="p-4 bg-white border border-slate-100 rounded-lg">
                  <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#818486] mb-2">Sync Status</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#006c49]"></div>
                    <span className="font-[Manrope] font-bold">Healthy & Live</span>
                  </div>
                </div>
                <div className="p-4 bg-white border border-slate-100 rounded-lg">
                  <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#818486] mb-2">Total Items</p>
                  <span className="font-[Manrope] font-bold">1,248 Products</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-lg mb-8">
                <div>
                  <p className="font-[Manrope] font-semibold">Last sync completed</p>
                  <p className="text-sm text-[#7c839b] font-[Manrope]">Today at 10:42 AM</p>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <button className="bg-black text-white px-6 py-3 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-[#006c49] transition-all">
                <span className="material-symbols-outlined text-sm">refresh</span> Run Manual Sync
              </button>
              <button className="border border-[#c6c6cd] text-[#0b1c30] px-6 py-3 rounded-lg font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all">
                View Catalog
              </button>
            </div>
          </section>

          {/* Connection Status */}
          <section className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-6">
            <h3 className="text-[24px] font-serif font-semibold mb-6">Connection Status</h3>
            <div className="space-y-4">
              {[
                { label: "Facebook Shop", status: "Active", statusCls: "bg-[#6cf8bb] text-[#00714d]", icon: "storefront" },
                { label: "Instagram Shopping", status: "Active", statusCls: "bg-[#6cf8bb] text-[#00714d]", icon: "photo_camera" },
                { label: "Pixel Tracking", status: "Active", statusCls: "bg-[#6cf8bb] text-[#00714d]", icon: "track_changes" },
                { label: "Messenger Bot", status: "Paused", statusCls: "bg-amber-100 text-amber-700", icon: "chat" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between p-4 bg-[#f8f9ff] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg">
                      <span className="material-symbols-outlined text-[#7c839b]">{item.icon}</span>
                    </div>
                    <span className="font-[Manrope] font-semibold">{item.label}</span>
                  </div>
                  <span className={`px-3 py-1 ${item.statusCls} font-[Manrope] font-bold text-[10px] tracking-widest uppercase rounded-full`}>{item.status}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Ad Performance */}
          <section className="col-span-12 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-8">
            <h3 className="text-[24px] font-serif font-semibold mb-6">Ad Performance Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { label: "Impressions", value: "2.4M", change: "+12.5%", up: true },
                { label: "Click-Through Rate", value: "3.8%", change: "+0.4%", up: true },
                { label: "Cost Per Click", value: "$0.42", change: "-0.08%", up: false },
                { label: "ROAS", value: "4.2x", change: "+0.6x", up: true },
              ].map((m) => (
                <div key={m.label} className="p-4 bg-[#f8f9ff] rounded-lg">
                  <p className="font-[Manrope] font-bold text-[10px] tracking-widest uppercase text-[#7c839b] mb-2">{m.label}</p>
                  <p className="text-[24px] font-serif font-semibold">{m.value}</p>
                  <p className={`text-xs font-[Manrope] font-bold mt-1 flex items-center gap-1 ${m.up ? "text-[#006c49]" : "text-[#ba1a1a]"}`}>
                    <span className="material-symbols-outlined text-xs">{m.up ? "trending_up" : "trending_down"}</span> {m.change}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}
