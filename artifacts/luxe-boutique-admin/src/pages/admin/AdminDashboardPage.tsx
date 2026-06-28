import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type OrderItem = { id: string; quantity: number; price: number; product: { name: string } | null };
type Order = { id: string; total: number; status: string; createdAt: string; items: OrderItem[] };
type Product = { id: string; name: string; price: number };

const statusStyle: Record<string, string> = {
  PENDING:    "bg-amber-50 text-amber-700",
  PROCESSING: "bg-[#dae2fd] text-[#3f465c]",
  SHIPPED:    "bg-purple-50 text-purple-700",
  DELIVERED:  "bg-emerald-50 text-emerald-700",
  CANCELLED:  "bg-[#ffdad6] text-[#93000a]",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminDashboardPage() {
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const totalRevenue   = orders.reduce((s, o) => s + o.total, 0);
  const avgOrderValue  = orders.length > 0 ? totalRevenue / orders.length : 0;
  const pendingOrders  = orders.filter((o) => o.status === "PENDING").length;
  const recentOrders   = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <AdminLayout sidebar="main">
      <div className="p-10 bg-slate-50/30 min-h-screen">
        <section className="mb-10 flex justify-between items-end">
          <div>
            <span className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b]">Daily Summary</span>
            <h2 className="text-[36px] font-serif font-bold leading-tight mt-1">Executive Overview</h2>
          </div>
          <div className="flex gap-4">
            <Link href="/products/new">
              <button className="px-6 py-2.5 bg-black text-white text-xs font-[Manrope] font-bold tracking-widest uppercase hover:bg-[#006c49] transition-colors">
                Add Inventory
              </button>
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {[
            { label: "Total Revenue",   value: orders.length > 0 ? `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—", border: "border-l-4 border-emerald-600" },
            { label: "Total Orders",    value: orders.length.toLocaleString(), border: "" },
            { label: "Avg. Order Value",value: orders.length > 0 ? `$${avgOrderValue.toFixed(2)}` : "—", border: "" },
            { label: "Products Listed", value: products.length.toLocaleString(), border: "" },
          ].map((m) => (
            <div key={m.label} className={`bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm ${m.border}`}>
              <span className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#7c839b] block mb-4">{m.label}</span>
              <h3 className="text-[24px] font-serif font-semibold">{m.value}</h3>
            </div>
          ))}
        </section>

        {pendingOrders > 0 && (
          <section className="mb-8">
            <div className="bg-amber-50 border border-amber-200 rounded-sm px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-600">pending_actions</span>
                <span className="font-[Manrope] font-bold text-sm text-amber-800">
                  {pendingOrders} order{pendingOrders !== 1 ? "s" : ""} awaiting action
                </span>
              </div>
              <Link href="/orders">
                <button className="text-xs font-[Manrope] font-bold tracking-widest uppercase text-amber-700 hover:underline">Review Orders →</button>
              </Link>
            </div>
          </section>
        )}

        <section className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)] rounded-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-[24px] font-serif font-semibold">Recent Transactions</h3>
            <Link href="/orders">
              <button className="text-xs font-[Manrope] font-bold tracking-widest uppercase text-emerald-600 hover:underline">View All Orders</button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            {ordersLoading ? (
              <div className="p-16 text-center text-[#7c839b] font-[Manrope]">Loading orders…</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-16 text-center text-[#7c839b] font-[Manrope]">No orders yet.</div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50">
                    {["Order ID", "Status", "Items", "Total", "Date"].map((h) => (
                      <th key={h} className="px-8 py-4 text-[10px] font-[Manrope] font-bold uppercase text-[#7c839b] tracking-widest">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6 text-xs font-bold">#{o.id.slice(0, 8).toUpperCase()}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-full ${statusStyle[o.status] ?? "bg-slate-100 text-slate-600"}`}>{o.status}</span>
                      </td>
                      <td className="px-8 py-6 text-xs text-[#7c839b]">
                        {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                        {o.items.length > 0 && (
                          <div className="text-[10px] mt-0.5 line-clamp-1">
                            {o.items.slice(0, 2).map((i) => i.product?.name).filter(Boolean).join(", ")}
                          </div>
                        )}
                      </td>
                      <td className="px-8 py-6 text-xs font-bold">${o.total.toFixed(2)}</td>
                      <td className="px-8 py-6 text-xs text-[#7c839b]">{formatDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <Link href="/products/new">
        <button className="fixed bottom-10 right-10 w-14 h-14 bg-black text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 hover:bg-[#006c49]">
          <span className="material-symbols-outlined text-2xl">add</span>
        </button>
      </Link>
    </AdminLayout>
  );
}
