import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

const products = [
  {
    name: "Silk Evening Blazer", sku: "LUX-EB-001", cat: "Ready-to-Wear", price: "$1,250.00",
    stockDot: "bg-[#006c49]", stock: "42 in stock", statusCls: "bg-[#dce9ff] text-black", status: "Active",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAsfW2oGVPZN_rw-EGWfweBoLaM8q5YhFQzkLnjS95UlSp-qMiQNqJPPcGroavqahbW5crS3YUbKhTmjAaoDPsru5IbLbSV-B_Gl6vMFeMAUb8LBZoWdA8RXP0Uv6vHIDk-SMhdlLZLPKyYqBqg_dAVsLQQldwCkyTTdGrXZQEEVz2dChk4UKyIMXPXsQjVdTGSqPYrbce3P9VVrnfWPNxxJ8dQx-tV80kv5qT68p3gZQlcj3I4SlnblZx_XOvxOCNsVcp-QeRvyRQ",
  },
  {
    name: "Handcrafted Leather Mules", sku: "LUX-SH-042", cat: "Footwear", price: "$890.00",
    stockDot: "bg-[#ba1a1a]", stock: "3 left (Low)", stockCls: "text-[#ba1a1a] font-semibold", statusCls: "bg-[#dce9ff] text-black", status: "Active",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBV50AaP4oeAQ9KXHYbEwERsN47VCkv1Mbt6P8SrixzGIIM2XxQsdv8ljUIEJWDDrd09ugzqi9pOjA6IgIxWuPFMcY2yLsusJMrjWv5vbbfWWCazi5MdwgSD3kkc2IenO38-tflIl3C_b4prlIGdelAqteRUgVFzcS5xLl96eH6myFetNgxhod__RsDRITsjBzDt5wTv60oQR2CUi8HDyPsNXcZAT5fDGdUkgUvyUEHOyiMxp_wVQua5fW3mEnporynxoenAiExVSk",
  },
  {
    name: "Gilded Evening Clutch", sku: "LUX-BG-209", cat: "Accessories", price: "$2,400.00",
    stockDot: "bg-slate-300", stock: "Out of Stock", stockCls: "text-slate-400", statusCls: "bg-slate-100 text-slate-400", status: "Draft",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBDzOxLZBvP4DAFtMAYEvAIdbgKyzLBPXBLkP7D0xT8AqzEAKuUZkkztJ901AgPG9OQb5US1lV_tvWuyIp3j-h2aBZwc17ghTbcndA0L_xEemdxtRuTLABgoXuRPe5dAlE4X_wFnr4fGhUf7jT4KUJek97sBjwTw--bHe9TfEsCXsZhUPbfflsYtHkB0-oUXwBsYqr4Yw-lYyNZy1jFWBUaxOPGlzNea9Km6VDTW-7V8c-iOioA5hLlVwW4-vAJOHwpElLeopFq9lo",
    opacity: true,
  },
  {
    name: "Pure Linen Oversized Shirt", sku: "LUX-RTW-088", cat: "Ready-to-Wear", price: "$350.00",
    stockDot: "bg-[#006c49]", stock: "18 in stock", statusCls: "bg-[#dce9ff] text-black", status: "Active",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCOPMzX5DpOf-y1R1W9mcIZLrC6gOLMokL685ff0knH3yHHKCzWI3fSCzypDHi2jDq9Yrthg657oeVm70QrroenvEDCO-CKlqOPM9y7OKOOTgpT00c-3gbP9t9_psWkBtVo502Skw-2XW0hsRa9BjicKZR7is9avIO-8ZWtF8qUqM-ZNI4MBUajfekM24-hA3p1r0ZqIVM5un8hq0b7V55KeWNW6_R0PSFLaSnuiq0o7e-_Pn76o4XMh83h4Kw35ozZda6m3KvVQlA",
  },
];

export default function AdminCatalogPage() {
  return (
    <AdminLayout sidebar="main">
      <div className="p-8 max-w-[1280px] mx-auto">
        {/* Page Header */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-[36px] font-serif font-bold">Product Catalog</h2>
            <p className="text-[#7c839b] text-[16px] mt-1">Manage your boutique inventory and collections.</p>
          </div>
          <Link href="/admin/products/edit">
            <button className="bg-black text-white px-6 py-3 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors flex items-center gap-2">
              <span className="material-symbols-outlined">add</span> Add New Product
            </button>
          </Link>
        </div>

        {/* Summary Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border-l-4 border-black">
            <p className="text-[10px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Total Products</p>
            <h3 className="text-[24px] font-serif font-semibold mt-2">1,284</h3>
          </div>
          <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border-l-4 border-[#ba1a1a]">
            <p className="text-[10px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Out of Stock Items</p>
            <h3 className="text-[24px] font-serif font-semibold mt-2 text-[#ba1a1a]">12</h3>
          </div>
          <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border-l-4 border-[#006c49]">
            <p className="text-[10px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Recent Additions</p>
            <h3 className="text-[24px] font-serif font-semibold mt-2 text-[#006c49]">+24 <span className="text-xs font-normal text-[#7c839b]">this week</span></h3>
          </div>
        </div>

        {/* Table Filters */}
        <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] mb-3 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {["All Categories", "Stock Status", "Price Range"].map((label) => (
              <div key={label} className="relative">
                <select className="appearance-none bg-[#eff4ff] border-none font-[Manrope] font-bold text-[11px] tracking-widest py-2 pl-4 pr-10 focus:ring-1 focus:ring-black outline-none cursor-pointer">
                  <option>{label}</option>
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-sm">expand_more</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button className="border border-[#c6c6cd] px-4 py-2 font-[Manrope] font-bold text-[11px] tracking-widest hover:bg-[#eff4ff] transition-colors">
              Bulk Actions
            </button>
            <button className="text-[#7c839b] hover:text-black transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#eff4ff] border-b border-slate-100">
                <th className="p-6 w-12"><input className="rounded border-slate-300" type="checkbox" /></th>
                {["Product", "Category", "Price", "Stock", "Status", "Actions"].map((h) => (
                  <th key={h} className="p-6 font-[Manrope] font-bold text-[11px] text-[#7c839b] tracking-widest uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.sku} className="hover:bg-slate-50 transition-colors">
                  <td className="p-6"><input className="rounded border-slate-300" type="checkbox" /></td>
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 bg-slate-100 overflow-hidden ${p.opacity ? "opacity-50" : ""}`}>
                        <img className="h-full w-full object-cover" src={p.img} alt={p.name} />
                      </div>
                      <div>
                        <p className="font-[Manrope] font-semibold text-[#0b1c30]">{p.name}</p>
                        <p className="text-[10px] text-[#7c839b] font-[Manrope] font-bold tracking-widest uppercase">{p.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-sm text-[#0b1c30]">{p.cat}</td>
                  <td className="p-6 font-semibold text-[#0b1c30]">{p.price}</td>
                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <div className={`h-1.5 w-1.5 rounded-full ${p.stockDot}`}></div>
                      <span className={`text-sm ${(p as any).stockCls || ""}`}>{p.stock}</span>
                    </div>
                  </td>
                  <td className="p-6">
                    <span className={`px-2 py-1 ${p.statusCls} font-[Manrope] font-bold text-[9px] uppercase tracking-wider`}>{p.status}</span>
                  </td>
                  <td className="p-6 text-right">
                    <Link href="/admin/products/edit">
                      <button className="text-slate-400 hover:text-black transition-colors">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Pagination */}
          <div className="p-6 bg-white border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-[#7c839b] font-[Manrope]">Showing 1 to 4 of 1,284 products</p>
            <div className="flex items-center gap-2">
              <button className="h-8 w-8 flex items-center justify-center border border-slate-200 text-slate-400 hover:border-black hover:text-black transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              <button className="h-8 w-8 flex items-center justify-center border border-black bg-black text-white font-[Manrope] font-bold text-[10px]">1</button>
              <button className="h-8 w-8 flex items-center justify-center border border-slate-200 text-[#0b1c30] font-[Manrope] font-bold text-[10px] hover:border-black transition-colors">2</button>
              <button className="h-8 w-8 flex items-center justify-center border border-slate-200 text-[#0b1c30] font-[Manrope] font-bold text-[10px] hover:border-black transition-colors">3</button>
              <span className="px-2 text-slate-400">...</span>
              <button className="h-8 w-8 flex items-center justify-center border border-slate-200 text-[#0b1c30] font-[Manrope] font-bold text-[10px] hover:border-black transition-colors">32</button>
              <button className="h-8 w-8 flex items-center justify-center border border-slate-200 text-slate-400 hover:border-black hover:text-black transition-colors">
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
