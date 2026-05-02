import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UsersIcon, Mail, Search, Filter, Download, Plus, TrendingUp, TrendingDown, Diamond } from "lucide-react";

export default async function AdminCustomersPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login");
  }

  const customers = await prisma.user.findMany({
    where: { role: "USER" },
    include: {
      orders: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Page Header */}
      <div className="flex justify-between items-end mb-12">
        <div>
           <h1 className="font-serif text-4xl text-slate-900 tracking-tight mb-2">Customers</h1>
           <p className="text-slate-500 font-serif max-w-xl">Manage your clientele and monitor lifetime value growth within the boutique ecosystem.</p>
        </div>
        <button className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest py-3 px-6 rounded flex items-center gap-2 hover:bg-emerald-600 transition-colors shadow-lg">
           <Plus size={16} /> ADD CUSTOMER
        </button>
      </div>

      {/* Metrics Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 rounded-lg">
           <div className="flex items-center justify-between mb-4">
              <span className="font-bold uppercase tracking-widest text-slate-400 text-[10px]">TOTAL CUSTOMERS</span>
              <UsersIcon size={16} className="text-slate-900" />
           </div>
           <div className="font-serif text-3xl text-slate-900">{customers.length}</div>
           <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 flex items-center gap-1 mt-2">
              <TrendingUp size={12} /> +14% from last quarter
           </div>
        </div>
        <div className="bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 rounded-lg">
           <div className="flex items-center justify-between mb-4">
              <span className="font-bold uppercase tracking-widest text-slate-400 text-[10px]">NEW CUSTOMERS (MONTH)</span>
              <UsersIcon size={16} className="text-emerald-700" />
           </div>
           <div className="font-serif text-3xl text-slate-900">482</div>
           <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
              Targeting 500 for campaign goal
           </div>
        </div>
        <div className="bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 rounded-lg">
           <div className="flex items-center justify-between mb-4">
              <span className="font-bold uppercase tracking-widest text-slate-400 text-[10px]">AVERAGE LTV</span>
              <Diamond size={16} className="text-amber-600" />
           </div>
           <div className="font-serif text-3xl text-slate-900">$1,240.50</div>
           <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 flex items-center gap-1 mt-2">
              Premium segment growing
           </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white shadow-[0_4px_20px_rgba(15,23,42,0.03)] rounded-xl overflow-hidden border border-slate-100">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
           <div className="relative w-full max-w-sm">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded text-xs focus:ring-1 focus:ring-slate-900 font-sans" placeholder="Search by name or email..." type="text"/>
           </div>
           <div className="flex gap-4">
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-colors">
                 <Filter size={14} /> FILTER
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-colors bg-slate-50">
                 <Download size={14} /> EXPORT
              </button>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-slate-400 border-b border-slate-100">NAME</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-slate-400 border-b border-slate-100 text-center">TOTAL ORDERS</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-slate-400 border-b border-slate-100">TOTAL SPENT</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-slate-400 border-b border-slate-100">LAST ORDER</th>
                <th className="px-6 py-4 font-bold uppercase tracking-widest text-[10px] text-slate-400 border-b border-slate-100 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {customers.map((customer: any) => {
                const totalSpent = customer.orders
                  .filter((o: any) => o.status !== "CANCELLED")
                  .reduce((sum: number, o: any) => sum + o.total, 0);

                return (
                  <tr key={customer.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                          {customer.name ? customer.name.slice(0, 2).toUpperCase() : "GU"}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-slate-900 font-serif">{customer.name || "Unknown"}</p>
                          <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-0.5">{customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded font-bold uppercase tracking-widest text-[10px]">
                        {customer.orders.length}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-900 font-serif">
                      ${totalSpent.toFixed(2)}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 font-serif">
                      {customer.orders.length > 0 ? new Date(customer.orders[customer.orders.length - 1].createdAt).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <a href={`mailto:${customer.email}`} className="text-slate-900 font-bold uppercase tracking-widest text-[10px] hover:underline underline-offset-4">
                        VIEW PROFILE
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="p-20 text-center text-slate-400 font-serif">No customers found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
