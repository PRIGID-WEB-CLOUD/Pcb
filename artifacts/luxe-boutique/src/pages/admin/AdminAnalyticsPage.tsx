import AdminLayout from "./AdminLayout";

export default function AdminAnalyticsPage() {
  return (
    <AdminLayout sidebar="main">
      <main className="flex-1 p-8 bg-[#f8f9ff]">
        {/* Page Header */}
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-[#0b1c30]">Market Performance</h1>
            <p className="font-[Manrope] text-[18px] text-[#45464d] max-w-2xl">A sophisticated overview of your boutique's financial health and customer engagement metrics.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 border border-[#c6c6cd] bg-white text-[#0b1c30] font-[Manrope] font-bold text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-[#eff4ff] transition-colors">
              <span className="material-symbols-outlined text-sm">calendar_month</span> Last 30 Days
            </button>
            <button className="px-4 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase flex items-center gap-2 hover:bg-[#006c49] transition-colors">
              <span className="material-symbols-outlined text-sm">download</span> Export PDF
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Revenue", badge: "+12.5%", badgeCls: "text-[#006c49]", value: "$2,450,890", bars: ["h-2","h-4","h-3","h-6","h-5","h-8"], barColor: "emerald", borderCls: "border-l-4 border-emerald-600" },
            { label: "Conversion Rate", badge: "-0.4%", badgeCls: "text-[#ba1a1a]", value: "3.82%", bars: ["h-8","h-7","h-6","h-5","h-6","h-4"], barColor: "slate", borderCls: "" },
            { label: "Avg. Order Value", badge: "+5.2%", badgeCls: "text-[#006c49]", value: "$412.00", bars: ["h-3","h-4","h-5","h-6","h-7","h-8"], barColor: "emerald", borderCls: "" },
            { label: "Customer LTV", badge: "+8.1%", badgeCls: "text-[#006c49]", value: "$1,890.00", bars: ["h-4","h-3","h-5","h-6","h-7","h-8"], barColor: "emerald", borderCls: "" },
          ].map((m) => (
            <div key={m.label} className={`bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] ${m.borderCls}`}>
              <div className="flex justify-between items-start mb-4">
                <span className="font-[Manrope] font-bold text-xs tracking-widest uppercase text-[#45464d]">{m.label}</span>
                <span className={`${m.badgeCls} text-xs font-bold`}>{m.badge}</span>
              </div>
              <div className="text-[24px] font-serif font-semibold text-[#0b1c30] mb-4">{m.value}</div>
              <div className="h-8 flex items-end gap-1">
                {m.bars.map((h, i) => (
                  <div key={i} className={`w-1 ${m.barColor === "emerald" ? `bg-emerald-${(i+1)*100}` : `bg-slate-${(i+1)*100}`} ${h}`}
                    style={{ backgroundColor: m.barColor === "emerald" ? `rgb(${[209,250,229][Math.floor(i/2)]||52},${[213,252,232][Math.floor(i/2)]||211},${[220,235,156][Math.floor(i/2)]||153})` : undefined }}
                  ></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Revenue Growth Chart */}
          <div className="lg:col-span-2 bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-[24px] font-serif font-semibold text-[#0b1c30]">Revenue Growth</h3>
                <p className="text-sm text-[#45464d]">Relative to Marketing Expenditure</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-black"></span><span className="text-xs font-[Manrope] font-bold tracking-widest uppercase">Revenue</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#006c49]"></span><span className="text-xs font-[Manrope] font-bold tracking-widest uppercase">Spend</span></div>
              </div>
            </div>
            <div className="relative h-[300px] w-full bg-white border-l border-b border-[#c6c6cd]/30 flex items-end justify-between px-4">
              <div className="absolute inset-0 flex flex-col justify-between opacity-10 pointer-events-none">
                {[1,2,3,4].map((i) => <div key={i} className="border-t border-[#0b1c30] w-full"></div>)}
              </div>
              <div className="absolute -left-10 inset-y-0 flex flex-col justify-between text-[10px] text-slate-400 py-2">
                <span>100k</span><span>75k</span><span>50k</span><span>25k</span><span>0</span>
              </div>
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                <polyline points="0,250 80,200 160,180 240,160 320,120 400,80 480,40" fill="none" stroke="#006c49" strokeWidth="2" opacity="0.6" />
                <polyline points="0,280 80,260 160,240 240,200 320,180 400,140 480,100" fill="none" stroke="#000" strokeWidth="2.5" />
                <polygon points="0,300 0,250 80,200 160,180 240,160 320,120 400,80 480,40 480,300" fill="#006c49" opacity="0.08" />
              </svg>
              <div className="w-full flex justify-between absolute -bottom-6 text-[10px] text-slate-400 font-[Manrope] font-bold tracking-widest uppercase">
                {["Jan","Feb","Mar","Apr","May","Jun","Jul"].map((m) => <span key={m}>{m}</span>)}
              </div>
            </div>
          </div>

          {/* Category Donut */}
          <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <h3 className="text-[24px] font-serif font-semibold text-[#0b1c30] mb-2">Category Split</h3>
            <p className="text-sm text-[#45464d] mb-8">Sales distribution by department</p>
            <div className="relative flex justify-center mb-8">
              <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 192 192">
                <circle cx="96" cy="96" fill="none" r="70" stroke="#e2e8f0" strokeWidth="24" />
                <circle cx="96" cy="96" fill="none" r="70" stroke="#006c49" strokeDasharray="440" strokeDashoffset="110" strokeWidth="24" />
                <circle cx="96" cy="96" fill="none" r="70" stroke="#131b2e" strokeDasharray="440" strokeDashoffset="330" strokeWidth="24" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-[24px] font-serif font-semibold">78%</span>
                <span className="text-[10px] font-[Manrope] font-bold tracking-widest text-slate-400 uppercase">Target Met</span>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { dot: "bg-[#131b2e]", label: "Ready-to-Wear", pct: "45%" },
                { dot: "bg-[#006c49]", label: "Accessories", pct: "35%" },
                { dot: "bg-[#c6c6cd]", label: "Home Fragrance", pct: "20%" },
              ].map((c) => (
                <div key={c.label} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${c.dot}`}></span>
                    <span className="text-sm font-[Manrope]">{c.label}</span>
                  </div>
                  <span className="text-sm font-[Manrope] font-bold">{c.pct}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Products */}
          <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[24px] font-serif font-semibold text-[#0b1c30]">Top Products</h3>
              <a className="text-xs font-[Manrope] font-bold tracking-widest text-[#006c49] underline" href="#">View All</a>
            </div>
            <div className="space-y-6">
              {[
                { name: "Noir Edition Sneakers", revenue: "$45,200", units: "124 Units", w: "90%", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDAe3Tf6eGouA3LMxH9shgSKU6i_YF5d3R571f1m09nEIppOll_6SRdJJ_x5Io0m3IZOW2A6x_6ttHsbAY3AAEzopwWL8R0fn6j-0-iV5cDCQhK6XTWD8lOSz5BzZGajqP0gCN80mwcTyNCXoyHlxDVy5252wfreKSgZY2hj2c6bSwrv9ARslcaibmp8vUrCr4C0llARLXedhSP2BJCXcGOOw_rqg1t0pHR-J0Sc0SHJqQoh9d4bzQGdKnXK44-TEKumd_Vxoa9_to" },
                { name: "Signature Leather Tote", revenue: "$38,900", units: "98 Units", w: "75%", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuARJl7V-s0k_l-ZvYXqjAXNEBOMuih2tnrRYTKxfsguecr48LERizVwgrKhzA5VJntc4xYvP_48jCtcdVHD5Iy0V-gIM20K5M2Y823Od-WiXi2xip5NJIoC4RPIWBd_YF1APepGyjeqCfyyimhuL9z0tFN3l-zsooctu0B49kVbYISDa0y0iKWUv3roFjWHOI5pIeBkfzLQKuwlDcL5xJp42GkKQwfJLB7iXwofYcxm4TbfaNZX-YU" },
                { name: "Chronos Silver Watch", revenue: "$22,400", units: "45 Units", w: "60%", img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDG_u2w6qLN9oNlEK8kD8fWXtzadH5ecF756VNp3yAK5yu6exiA0bSL8nNsw2baTleZqkAXramRlPUJyP6_q4q0oUuzMqvFHD2k9_sQgQMB1Q1ez0hrH7EzVpbpiT8POIEF9swkDMXPWWagce3KbDZx_XpqYphNiQKQQ1xWyxbQGJYZIKdVkXJTc8BA5uvVYvr0OseK-LRePuifvP026Vd9dbJukhie0OrKFgJ_QPkGij0FSjiSMLk0fi2r-nkfFf5q5-IsuV7XXC0" },
              ].map((p) => (
                <div key={p.name} className="flex items-center gap-4 group">
                  <img className="w-16 h-16 object-cover rounded shadow-sm group-hover:scale-105 transition-transform" src={p.img} alt={p.name} />
                  <div className="flex-1">
                    <h4 className="font-bold text-[#0b1c30] font-[Manrope]">{p.name}</h4>
                    <div className="w-full bg-[#e5eeff] h-1.5 mt-2 overflow-hidden">
                      <div className="bg-[#006c49] h-full" style={{ width: p.w }}></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-[Manrope]">{p.revenue}</div>
                    <div className="text-[10px] text-slate-400 font-[Manrope] font-bold tracking-widest uppercase">{p.units}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Monthly Reports */}
          <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-[24px] font-serif font-semibold text-[#0b1c30]">Monthly Reports</h3>
              <button className="text-slate-400 hover:text-black transition-colors">
                <span className="material-symbols-outlined">filter_list</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#c6c6cd] text-left">
                    {["Report Name","Date Generated","Action"].map((h, i) => (
                      <th key={h} className={`pb-4 font-[Manrope] font-bold text-[#45464d] text-[10px] tracking-widest uppercase ${i === 2 ? "text-right" : ""}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c6cd]/30">
                  {[
                    { icon: "picture_as_pdf", iconCls: "text-[#ba1a1a]", name: "Monthly Sales Recap", date: "Oct 31, 2023" },
                    { icon: "table_chart", iconCls: "text-[#006c49]", name: "Inventory Turnover Rate", date: "Oct 28, 2023" },
                    { icon: "bar_chart", iconCls: "text-black", name: "Customer Acquisition Analysis", date: "Oct 15, 2023" },
                    { icon: "picture_as_pdf", iconCls: "text-[#ba1a1a]", name: "Quarterly Tax Forecast", date: "Oct 02, 2023" },
                  ].map((r) => (
                    <tr key={r.name}>
                      <td className="py-4">
                        <div className="flex items-center gap-2">
                          <span className={`material-symbols-outlined ${r.iconCls}`}>{r.icon}</span>
                          <span className="text-sm font-medium font-[Manrope]">{r.name}</span>
                        </div>
                      </td>
                      <td className="py-4 text-sm text-slate-500 italic font-[Manrope]">{r.date}</td>
                      <td className="py-4 text-right">
                        <button className="text-black hover:text-[#006c49] transition-colors font-[Manrope] font-bold text-[10px] tracking-widest uppercase">Download</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}
