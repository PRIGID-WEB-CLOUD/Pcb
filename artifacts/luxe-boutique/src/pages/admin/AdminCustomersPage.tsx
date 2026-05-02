import AdminLayout from "./AdminLayout";

const customers = [
  { name: "Julianne Sterling", email: "j.sterling@luxe.com", orders: 24, orderCls: "bg-[#6cf8bb] text-[#00714d]", spent: "$4,820.00", lastOrder: "Oct 12, 2023", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAIsDrEECa9UKzKwOxhAdaKwhP0yLYfH49LA0iYRKVTZXU2pGwryhZBrV13p8ACfl6mZ-qX-R62D23Y5I0J93ncf0_nAmXe2_59rhTeNFBzNRQFeSLQnu_oNOBFVeRzf30-1ksW17870uCc4EGRqZ0qE8adgaYd8p3qFnLkurRU7QSA5wQMsMdEPAr4T4xsKhiyYVUOJrtQhklVFk1xMTd0jShOtoN8td7EibdAtDsvU0STv8BhG1gxFj2nfhhR2V-EpSr8IBJKFU0" },
  { name: "Marcus Vane", email: "mvane@editorial.design", orders: 8, orderCls: "bg-slate-100 text-slate-600", spent: "$1,150.25", lastOrder: "Oct 09, 2023", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAS4pmmGY8gLKt-nQvkLvGRr09v56jKkF7k4TTbGMhqMgKsh0VG_oIBl2U8C-q6O4YKu9jeG_vD5UxZInXmirgpqbfQFfdwgCibqZXqW5N4RXiAjCp8inqUPs-y0c--hxPPnVLv5X0nW2aIkQZ6dVZvyPdMnn05dos1R9X7WsY4DnW4q6ChkNUAkzRClkQdPck3dNt_Dv7VP-k97MhqZ7yXOvd21-mUvRh3XREEdI6Mu2sSQoq_tGznJ_oaS3TgbJPwDv8nwSFN9mg" },
  { name: "Helena Frost", email: "h.frost@archive.com", orders: 42, orderCls: "bg-[#6cf8bb] text-[#00714d]", spent: "$12,400.00", lastOrder: "Oct 11, 2023", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuABfKBVex0WGyeK8WfUceJLmcVYgwYQZeu9WjUfkxABV29rIofsYNEtzrsEv8jU6ee7duBZG_ru1OBOe-DPBJVyQ5M4yUlxL1F3zxFwIeYYXOd_h133FLI7xMMD9z5bsc6-SkVbqorSqVc2B7qKOcWQOizcye73ZU9PsXSky7onyVGwoGrLPkdVX0p4K4j8sJlVKLGEO-oLeTPq8Pm3-krSOotWu8N-Elh-RYzui57bc9wyXFK0nnpBEJKzXxbG6_Z2LM982x4DMlY" },
  { name: "Silas Thorne", email: "silas.thorne@hey.com", orders: 3, orderCls: "bg-slate-100 text-slate-600", spent: "$345.00", lastOrder: "Sep 28, 2023", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBpcBEsIy5E8X8xvCe4hYtPPGC6A6mMfqFtnY35NzQyteRxCannNi65X-wqDJkREIuGF8myJEGBKWNkAbz42fqeYwMT3hNNQBPwNxNzIXcegk22c9qoQJpBuk6x3QkcGYxXmLnzrohq0oAzkrrHsWmrtD3DcDyKq6jFSfhI5jOQ3y6EfdA4qbg-vu6qLrJZ3OzVLVYAkRDkydN9UGTta6mOPZmdw8dyJCWcC6TaEFsTsDpoTJRFIcG83Fqny7rW_NLtLXQlKHzjZbE8" },
  { name: "Elena Rodriguez", email: "elena.rod@global.co", orders: 15, orderCls: "bg-[#6cf8bb] text-[#00714d]", spent: "$2,980.50", lastOrder: "Oct 05, 2023", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCBHWboErjP6Eq8SRRtsIw5FTWSgqbeZzTVEKWq8bjBuk5UigYc8QmG9z2ve2xU6IalSGuf1-aZVH7b0rBrFFItPy4El6k1WECea9Zlyn5UXJ-4lDpmwPFbzEBtg49dD4dkm9lLMqS32JgPFwvFDuAF-T6Wezt5IV_CBm41BqqkjQGZ0riLpiLqrdnlEVC8-Yot2UeB7gQfXJTapSXBNYFIMXhamt7rsSxurfTgQMzDr3ziFSV5MZxY0tUna8xteYQOZkx1YjKnDvo" },
];

export default function AdminCustomersPage() {
  return (
    <AdminLayout sidebar="main">
      <div className="flex-1 ml-0 p-6 max-w-[1280px] mx-auto">
        {/* Header */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-[48px] font-serif font-bold text-black mb-2">Customers</h1>
            <p className="font-[Manrope] text-[#45464d] max-w-md">Manage your clientele and monitor lifetime value growth within the boutique ecosystem.</p>
          </div>
          <button className="bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase py-4 px-8 hover:bg-[#006c49] transition-all flex items-center gap-2 shadow-lg">
            <span className="material-symbols-outlined text-sm">add</span> ADD CUSTOMER
          </button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: "TOTAL CUSTOMERS", icon: "people", value: "12,842", sub: "+14% from last quarter", subCls: "text-[#006c49] font-bold", subIcon: "trending_up" },
            { label: "NEW CUSTOMERS (MONTH)", icon: "person_add", value: "482", sub: "Targeting 500 for campaign goal", subCls: "text-[#45464d]" },
            { label: "AVERAGE LTV", icon: "payments", value: "$1,240.50", sub: "Premium segment growing", subCls: "text-[#006c49] font-bold", subIcon: "diamond" },
          ].map((m) => (
            <div key={m.label} className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#7c839b]">{m.label}</span>
                <span className="material-symbols-outlined text-[#006c49]">{m.icon}</span>
              </div>
              <div className="text-[36px] font-serif font-bold text-black">{m.value}</div>
              <div className={`text-xs flex items-center gap-1 mt-2 ${m.subCls}`}>
                {m.subIcon && <span className="material-symbols-outlined text-xs">{m.subIcon}</span>}
                {m.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden border border-slate-100">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-white">
            <div className="relative w-full max-w-sm">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
              <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none font-[Manrope] text-sm focus:ring-1 focus:ring-black outline-none" placeholder="Search by name or email..." type="text" />
            </div>
            <div className="flex gap-4">
              {[["filter_list", "FILTER"], ["download", "EXPORT"]].map(([icon, label]) => (
                <button key={label} className="flex items-center gap-2 px-4 py-2 border border-slate-200 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-slate-50 transition-colors">
                  <span className="material-symbols-outlined text-sm">{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>

          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["NAME", "EMAIL", "TOTAL ORDERS", "TOTAL SPENT", "LAST ORDER", "ACTION"].map((h) => (
                  <th key={h} className={`px-6 py-4 font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#7c839b] ${h === "TOTAL ORDERS" ? "text-center" : ""} ${h === "ACTION" ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.map((c) => (
                <tr key={c.email} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img className="w-10 h-10 rounded-full object-cover grayscale group-hover:grayscale-0 transition-all duration-300" src={c.img} alt={c.name} />
                      <span className="font-serif text-sm font-semibold text-black">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-[Manrope] text-[#45464d] text-sm">{c.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`${c.orderCls} px-2 py-1 rounded text-xs font-bold`}>{c.orders}</span>
                  </td>
                  <td className="px-6 py-4 font-[Manrope] text-black font-semibold">{c.spent}</td>
                  <td className="px-6 py-4 font-[Manrope] text-[#45464d] text-sm">{c.lastOrder}</td>
                  <td className="px-6 py-4 text-right">
                    <a className="text-black font-[Manrope] font-bold text-xs tracking-widest uppercase hover:text-[#006c49] underline decoration-1 underline-offset-4" href="#">VIEW PROFILE</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-6 border-t border-slate-50 flex items-center justify-between font-[Manrope] font-bold text-[11px] tracking-widest text-[#45464d] uppercase">
            <div>SHOWING 1-5 OF 12,842 CUSTOMERS</div>
            <div className="flex gap-2">
              <button className="w-10 h-10 flex items-center justify-center border border-slate-200 hover:bg-slate-50"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
              <button className="w-10 h-10 flex items-center justify-center bg-black text-white">1</button>
              <button className="w-10 h-10 flex items-center justify-center border border-slate-200 hover:bg-slate-50">2</button>
              <button className="w-10 h-10 flex items-center justify-center border border-slate-200 hover:bg-slate-50">3</button>
              <button className="w-10 h-10 flex items-center justify-center border border-slate-200 hover:bg-slate-50"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-start opacity-60 px-6 pb-6">
            <div className="font-serif italic text-lg text-black">Refined management for the modern retailer.</div>
            <div className="text-right">
              <div className="font-[Manrope] font-bold text-xs tracking-widest uppercase mb-2">LUXEADMIN v4.2</div>
              <div className="text-[10px] font-[Manrope]">ESTABLISHED 2024. ALL DATA ENCRYPTED.</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
