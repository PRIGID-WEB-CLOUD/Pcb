import AdminLayout from "./AdminLayout";

const orders = [
  { id: "#LX-942851", initials: "EA", name: "Eleanor Abbott", email: "eleanor.a@luxe.com", date: "Oct 24, 2023", time: "14:32 PM", items: "3 Items", total: "$1,240.00", status: "Fulfilled", statusCls: "bg-emerald-50 text-[#006c49] border-emerald-100" },
  { id: "#LX-942852", initials: "MB", name: "Marcus Bennett", email: "m.bennett@design.io", date: "Oct 24, 2023", time: "15:05 PM", items: "1 Item", total: "$89.00", status: "Shipped", statusCls: "bg-blue-50 text-blue-700 border-blue-100" },
  { id: "#LX-942853", initials: "SC", name: "Sienna Castelli", email: "sienna@atelier.it", date: "Oct 24, 2023", time: "15:42 PM", items: "5 Items", total: "$3,450.00", status: "Processing", statusCls: "bg-amber-50 text-amber-700 border-amber-100" },
  { id: "#LX-942854", initials: "JR", name: "Julian Russo", email: "j.russo@media.com", date: "Oct 23, 2023", time: "10:12 AM", items: "2 Items", total: "$412.00", status: "Cancelled", statusCls: "bg-slate-100 text-slate-600 border-slate-200" },
];

export default function AdminOrdersPage() {
  return (
    <AdminLayout sidebar="main">
      <div className="max-w-[1280px] mx-auto px-8 py-12">
        {/* Header & Stats */}
        <div className="mb-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-[36px] font-serif font-bold text-black mb-2">Order Management</h2>
              <p className="font-[Manrope] text-[#7c839b]">Review and fulfill customer transactions across all channels.</p>
            </div>
            <button className="bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase py-3 px-6 rounded-lg flex items-center gap-2 hover:bg-[#006c49] transition-colors">
              <span className="material-symbols-outlined text-sm">add</span> Create Manual Order
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "Total Orders", value: "1,284", badge: "+12%", badgeCls: "text-[#006c49]" },
              { label: "Pending Fulfillment", value: "43", badge: "Action Needed", badgeCls: "text-[#ba1a1a]" },
              { label: "Avg. Order Value", value: "$342.10", badge: "", badgeCls: "" },
              { label: "Revenue Today", value: "$14,890", badge: "New Record", badgeCls: "text-[#006c49]" },
            ].map((s) => (
              <div key={s.label} className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-slate-50">
                <p className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#7c839b] mb-2">{s.label}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] font-serif font-semibold">{s.value}</span>
                  {s.badge && <span className={`text-xs font-[Manrope] font-bold ${s.badgeCls}`}>{s.badge}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-t-xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Filter Tabs */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between px-6 py-4 gap-4 border-b border-slate-100">
            <div className="flex items-center gap-1">
              {["All", "Pending", "Completed", "Cancelled"].map((tab, i) => (
                <button key={tab} className={`px-4 py-2 font-[Manrope] font-bold text-[11px] tracking-widest uppercase transition-colors ${i === 0 ? "text-black border-b-2 border-black" : "text-[#7c839b] hover:text-black"}`}>{tab}</button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <select className="appearance-none bg-slate-50 border-none rounded-lg pl-4 pr-10 py-2 text-sm font-[Manrope] font-bold tracking-widest outline-none cursor-pointer">
                  <option>Bulk Actions</option>
                  <option>Mark as Shipped</option>
                  <option>Print Labels</option>
                  <option>Cancel Orders</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
              </div>
              <div className="flex border border-slate-100 rounded-lg overflow-hidden">
                <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border-r border-slate-100 transition-colors">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                </button>
                <button className="px-4 py-2 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <span className="material-symbols-outlined text-sm">filter_list</span>
                </button>
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 border-b border-slate-100">
                    <input className="rounded border-slate-300" type="checkbox" />
                  </th>
                  {["Order ID", "Customer", "Date/Time", "Items", "Total Price", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-4 font-[Manrope] font-bold text-[#7c839b] text-[11px] uppercase tracking-widest border-b border-slate-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-5"><input className="rounded border-slate-300" type="checkbox" /></td>
                    <td className="px-6 py-5 font-serif font-bold text-black">{o.id}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-600">{o.initials}</div>
                        <div>
                          <p className="font-[Manrope] font-semibold text-black">{o.name}</p>
                          <p className="text-[11px] text-[#7c839b]">{o.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-sm text-[#7c839b]">{o.date}<br />{o.time}</td>
                    <td className="px-6 py-5 text-sm font-medium font-[Manrope]">{o.items}</td>
                    <td className="px-6 py-5 font-serif font-bold text-black">{o.total}</td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-[Manrope] font-bold border uppercase ${o.statusCls}`}>{o.status}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <button className="text-slate-400 hover:text-black transition-colors">
                        <span className="material-symbols-outlined">more_horiz</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <p className="font-[Manrope] font-bold text-[10px] tracking-widest text-[#7c839b] uppercase">Showing 1-4 of 1,284 results</p>
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:text-black transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-black bg-black text-white font-bold text-xs">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:text-black font-bold text-xs">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:text-black font-bold text-xs">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded border border-slate-200 bg-white text-slate-400 hover:text-black transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
