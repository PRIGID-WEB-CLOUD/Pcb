import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DollarSign, Package, ShoppingBag, Users as UsersIcon, TrendingUp } from "lucide-react";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "ADMIN") {
    redirect("/login");
  }

  // Quick stats
  const totalProducts = await prisma.product.count();
  const totalOrders = await prisma.order.count();
  const totalCustomers = await prisma.user.count({ where: { role: "USER" } });
  
  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" } },
    select: { total: true }
  });
  
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);

  // Recent Orders
  const recentOrders = await prisma.order.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { name: true, email: true } },
    }
  });

  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <div className="mb-10 flex justify-between items-end">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Daily Summary</span>
          <h1 className="text-4xl font-serif text-slate-900 mt-2 tracking-tight">Executive Overview</h1>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Total Revenue", value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, trend: "+12.5%" },
          { label: "Orders", value: totalOrders, icon: ShoppingBag, trend: "+8.2%" },
          { label: "Products", value: totalProducts, icon: Package, trend: "Catalog Size" },
          { label: "Customers", value: totalCustomers, icon: UsersIcon, trend: "+4.4%" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 rounded-lg group">
            <div className="flex justify-between items-start mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
              <span className="text-emerald-600 text-[10px] font-bold bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                 <TrendingUp size={10} /> {stat.trend}
              </span>
            </div>
            <h3 className="text-3xl font-serif text-slate-900">{stat.value}</h3>
          </div>
        ))}
      </section>

      <section className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 rounded-xl overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-serif text-slate-900">Recent Transactions</h3>
          <button className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 hover:underline underline-offset-4">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Order ID</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Customer</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-8 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-8 py-6 text-sm font-bold text-slate-900">#{order.id.slice(-6).toUpperCase()}</td>
                  <td className="px-8 py-6 font-medium text-slate-900">{order.user?.name || 'Guest'}</td>
                  <td className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest">{order.status}</td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-900">${order.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
