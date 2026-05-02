import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

export default function AdminDashboardPage() {
  return (
    <AdminLayout sidebar="main">
      <div className="p-10 bg-slate-50/30 min-h-screen">
        {/* Header */}
        <section className="mb-10 flex justify-between items-end">
          <div>
            <span className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Daily Summary</span>
            <h2 className="text-[36px] font-serif font-bold leading-tight mt-1">Executive Overview</h2>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2.5 bg-white border border-slate-200 text-xs font-[Manrope] font-bold tracking-widest uppercase hover:bg-slate-50 transition-colors">
              Export Report
            </button>
            <button className="px-6 py-2.5 bg-black text-white text-xs font-[Manrope] font-bold tracking-widest uppercase hover:bg-[#006c49] transition-colors">
              Add Inventory
            </button>
          </div>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm border-l-4 border-emerald-600 group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Total Revenue</span>
              <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">trending_up</span> 12.5%
              </span>
            </div>
            <h3 className="text-[24px] font-serif font-semibold">$482,921.00</h3>
            <div className="mt-4 h-8 flex items-end gap-0.5">
              <div className="bg-emerald-100 w-full h-1/2 rounded-t-sm group-hover:h-3/4 transition-all duration-500"></div>
              <div className="bg-emerald-200 w-full h-2/3 rounded-t-sm group-hover:h-5/6 transition-all duration-500"></div>
              <div className="bg-emerald-300 w-full h-3/4 rounded-t-sm group-hover:h-2/3 transition-all duration-500"></div>
              <div className="bg-emerald-400 w-full h-1/2 rounded-t-sm group-hover:h-full transition-all duration-500"></div>
              <div className="bg-emerald-500 w-full h-4/5 rounded-t-sm group-hover:h-3/4 transition-all duration-500"></div>
              <div className="bg-emerald-600 w-full h-full rounded-t-sm"></div>
            </div>
          </div>

          <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Orders</span>
              <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">trending_up</span> 8.2%
              </span>
            </div>
            <h3 className="text-[24px] font-serif font-semibold">1,482</h3>
            <div className="mt-4 h-8 flex items-end gap-0.5 opacity-40">
              <div className="bg-slate-300 w-full h-1/3 rounded-t-sm"></div>
              <div className="bg-slate-400 w-full h-2/3 rounded-t-sm"></div>
              <div className="bg-slate-300 w-full h-1/2 rounded-t-sm"></div>
              <div className="bg-slate-500 w-full h-5/6 rounded-t-sm"></div>
              <div className="bg-slate-400 w-full h-2/3 rounded-t-sm"></div>
              <div className="bg-slate-600 w-full h-full rounded-t-sm"></div>
            </div>
          </div>

          <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Avg. Order Value</span>
              <span className="text-[#ba1a1a] text-[10px] font-bold bg-[#ffdad6] px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">trending_down</span> 2.1%
              </span>
            </div>
            <h3 className="text-[24px] font-serif font-semibold">$325.80</h3>
            <div className="mt-4 h-8 flex items-end gap-0.5 opacity-40">
              <div className="bg-slate-300 w-full h-full rounded-t-sm"></div>
              <div className="bg-slate-400 w-full h-4/5 rounded-t-sm"></div>
              <div className="bg-slate-500 w-full h-3/4 rounded-t-sm"></div>
              <div className="bg-slate-400 w-full h-2/3 rounded-t-sm"></div>
              <div className="bg-slate-300 w-full h-1/2 rounded-t-sm"></div>
              <div className="bg-slate-200 w-full h-1/3 rounded-t-sm"></div>
            </div>
          </div>

          <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Conversion Rate</span>
              <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">trending_up</span> 4.4%
              </span>
            </div>
            <h3 className="text-[24px] font-serif font-semibold">3.82%</h3>
            <div className="mt-4 h-8 flex items-end gap-0.5 opacity-40">
              <div className="bg-slate-200 w-full h-1/4 rounded-t-sm"></div>
              <div className="bg-slate-300 w-full h-1/3 rounded-t-sm"></div>
              <div className="bg-slate-400 w-full h-1/2 rounded-t-sm"></div>
              <div className="bg-slate-500 w-full h-2/3 rounded-t-sm"></div>
              <div className="bg-slate-600 w-full h-3/4 rounded-t-sm"></div>
              <div className="bg-slate-700 w-full h-full rounded-t-sm"></div>
            </div>
          </div>
        </section>

        {/* Charts & Analysis */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2 bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-[24px] font-serif font-semibold">Sales Performance</h3>
                <p className="text-[16px] text-[#7c839b] mt-1">Comparison of gross revenue over current period.</p>
              </div>
              <div className="flex gap-2 p-1 bg-slate-50 rounded-full">
                <button className="px-4 py-1 text-[10px] font-[Manrope] font-bold bg-white shadow-sm rounded-full">Weekly</button>
                <button className="px-4 py-1 text-[10px] font-[Manrope] font-bold text-slate-500 hover:text-slate-900 transition-colors">Monthly</button>
                <button className="px-4 py-1 text-[10px] font-[Manrope] font-bold text-slate-500 hover:text-slate-900 transition-colors">Quarterly</button>
              </div>
            </div>
            <div className="relative h-[320px] w-full flex items-end justify-between px-2">
              <div className="absolute inset-0 flex flex-col justify-between py-2 border-b border-slate-100">
                <div className="w-full border-t border-slate-50"></div>
                <div className="w-full border-t border-slate-50"></div>
                <div className="w-full border-t border-slate-50"></div>
                <div className="w-full border-t border-slate-50"></div>
                <div className="w-full border-t border-slate-50"></div>
              </div>
              <div className="relative z-10 w-full h-full flex items-end justify-around pb-6">
                {[
                  { day: "MON", h: "h-1/2", oh: "h-2/3" },
                  { day: "TUE", h: "h-2/3", oh: "h-3/4" },
                  { day: "WED", h: "h-3/4", oh: "h-1/2" },
                  { day: "THU", h: "h-1/2", oh: "h-4/5" },
                  { day: "FRI", h: "h-4/5", oh: "h-full" },
                  { day: "SAT", h: "h-full", oh: "h-5/6" },
                  { day: "SUN", h: "h-5/6", oh: "h-3/4" },
                ].map((bar) => (
                  <div key={bar.day} className={`w-8 bg-slate-100 ${bar.h} rounded-t-sm relative group`}>
                    <div className={`absolute bottom-0 w-full bg-black ${bar.oh} rounded-t-sm opacity-20 transition-all group-hover:opacity-100`}></div>
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-400">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm">
            <h3 className="text-[24px] font-serif font-semibold mb-8">Top Collections</h3>
            <div className="space-y-6">
              {[
                { name: "Milanese Reserve", cat: "Leather Goods", revenue: "$42.4k", pct: "+12%", w: "88%" },
                { name: "Nordic Winter", cat: "Knitwear", revenue: "$31.9k", pct: "+08%", w: "72%" },
                { name: "Epoca Chrono", cat: "Accessories", revenue: "$22.1k", pct: "+15%", w: "54%" },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 flex-shrink-0 rounded-sm"></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-tight">{item.name}</p>
                    <p className="text-[10px] text-[#7c839b]">{item.cat}</p>
                    <div className="mt-2 w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className="bg-black h-full" style={{ width: item.w }}></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold">{item.revenue}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">{item.pct}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/admin/analytics">
              <button className="w-full mt-10 py-3 text-xs font-[Manrope] font-bold tracking-widest uppercase border border-slate-100 hover:bg-slate-50 transition-colors">
                View Catalog Report
              </button>
            </Link>
          </div>
        </section>

        {/* Recent Orders */}
        <section className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[24px] font-serif font-semibold">Recent Transactions</h3>
            <Link href="/admin/orders">
              <button className="text-xs font-[Manrope] font-bold tracking-widest uppercase text-emerald-600 hover:underline">View All Orders</button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  {["Order ID", "Customer", "Status", "Products", "Total", "Date"].map((h) => (
                    <th key={h} className="px-8 py-4 text-[10px] font-[Manrope] font-bold uppercase text-[#7c839b] tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { id: "#ORD-94821", name: "Alexander Mercer", initials: "AM", status: "Fulfilled", statusCls: "bg-emerald-50 text-emerald-700", total: "$1,240.00", date: "Oct 24, 14:20" },
                  { id: "#ORD-94819", name: "Elena Wright", initials: "EW", status: "Processing", statusCls: "bg-[#dae2fd] text-[#3f465c]", total: "$485.50", date: "Oct 24, 13:45" },
                  { id: "#ORD-94815", name: "Harrison Barnes", initials: "HB", status: "Delayed", statusCls: "bg-[#ffdad6] text-[#93000a]", total: "$2,890.00", date: "Oct 24, 12:12" },
                  { id: "#ORD-94808", name: "Sophia Chen", initials: "SC", status: "Fulfilled", statusCls: "bg-emerald-50 text-emerald-700", total: "$125.00", date: "Oct 24, 10:30" },
                ].map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-6 text-xs font-bold">{row.id}</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">{row.initials}</div>
                        <span className="text-xs">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={`px-3 py-1 ${row.statusCls} text-[10px] font-bold uppercase tracking-wider rounded-full`}>{row.status}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex gap-1">
                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>
                        <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white"></div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-xs font-bold">{row.total}</td>
                    <td className="px-8 py-6 text-xs text-[#7c839b]">{row.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* FAB */}
      <button className="fixed bottom-10 right-10 w-14 h-14 bg-black text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 hover:bg-[#006c49]">
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </AdminLayout>
  );
}
