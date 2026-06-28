import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type Order = { id: string; total: number; status: string; createdAt: string; items: { product: { name: string } | null }[] };
type Product = { id: string; name: string; price: number; imageUrl: string | null; category: { name: string } | null };

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function AdminAnalyticsPage() {
  const { data: orders = [], isLoading: ordersLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const isLoading = ordersLoading || productsLoading;

  const totalRevenue   = orders.reduce((s, o) => s + o.total, 0);
  const delivered      = orders.filter((o) => o.status === "DELIVERED");
  const avgOrderValue  = orders.length > 0 ? totalRevenue / orders.length : 0;
  const topProducts    = products.slice(0, 3);

  const statusCounts: Record<string, number> = {};
  for (const o of orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

  return (
    <AdminLayout sidebar="main">
      <main className="flex-1 p-8 bg-[#f8f9ff]">
        <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-[#0b1c30]">Market Performance</h1>
            <p className="font-[Manrope] text-[18px] text-[#45464d] max-w-2xl">A sophisticated overview of your boutique's financial health and customer engagement.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-32 text-[#7c839b] font-[Manrope]">
            <span className="material-symbols-outlined animate-spin text-3xl mr-3 text-[#006c49]">refresh</span>
            Loading analytics…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { label: "Total Revenue",    value: orders.length > 0 ? fmt(totalRevenue)      : "—", sub: `${orders.length} total orders`,           border: "border-l-4 border-emerald-600" },
                { label: "Orders Delivered", value: delivered.length > 0 ? String(delivered.length) : "—", sub: `of ${orders.length} total`,          border: "" },
                { label: "Avg. Order Value", value: orders.length > 0 ? `$${avgOrderValue.toFixed(2)}` : "—", sub: "per transaction",                  border: "" },
                { label: "Products Listed",  value: products.length > 0 ? String(products.length) : "—",   sub: "in catalog",                         border: "" },
              ].map((m) => (
                <div key={m.label} className={`bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] ${m.border}`}>
                  <div className="flex justify-between items-start mb-4">
                    <span className="font-[Manrope] font-bold text-xs tracking-widest uppercase text-[#45464d]">{m.label}</span>
                  </div>
                  <div className="text-[28px] font-serif font-semibold text-[#0b1c30] mb-1">{m.value}</div>
                  <p className="text-[11px] text-[#7c839b] font-[Manrope]">{m.sub}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {/* Order Status Breakdown */}
              <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[24px] font-serif font-semibold text-[#0b1c30] mb-6">Order Status Breakdown</h3>
                {orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#7c839b] font-[Manrope]">
                    <span className="material-symbols-outlined text-4xl mb-3 text-slate-200">shopping_bag</span>
                    No orders yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(["PENDING","PROCESSING","SHIPPED","DELIVERED","CANCELLED"] as const).map((status) => {
                      const count = statusCounts[status] ?? 0;
                      const pct = orders.length > 0 ? Math.round((count / orders.length) * 100) : 0;
                      const colors: Record<string, string> = {
                        PENDING: "bg-amber-400", PROCESSING: "bg-blue-400", SHIPPED: "bg-purple-400",
                        DELIVERED: "bg-[#006c49]", CANCELLED: "bg-slate-300",
                      };
                      return (
                        <div key={status} className="flex items-center gap-4">
                          <span className="font-[Manrope] text-sm w-32 text-[#45464d] shrink-0 capitalize">{status.toLowerCase()}</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full ${colors[status]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="font-[Manrope] font-bold text-sm w-20 text-right">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top Products */}
              <div className="bg-white p-8 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[24px] font-serif font-semibold text-[#0b1c30]">Catalog Highlights</h3>
                  <Link href="/catalog">
                    <span className="text-xs font-[Manrope] font-bold tracking-widest text-[#006c49] hover:underline cursor-pointer">View All</span>
                  </Link>
                </div>
                {products.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-[#7c839b] font-[Manrope]">
                    <span className="material-symbols-outlined text-4xl mb-3 text-slate-200">inventory_2</span>
                    No products in catalog.
                    <Link href="/products/new">
                      <button className="mt-4 px-4 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors">
                        Add First Product
                      </button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {topProducts.map((p) => (
                      <div key={p.id} className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 flex-shrink-0 rounded-sm overflow-hidden">
                          {p.imageUrl
                            ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-slate-300"><span className="material-symbols-outlined">image</span></div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-[#0b1c30] truncate">{p.name}</p>
                          <p className="text-[10px] text-[#7c839b] font-[Manrope] mt-0.5">{p.category?.name ?? "Uncategorised"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold font-serif">${p.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                    {products.length > 3 && (
                      <p className="text-[11px] text-[#7c839b] font-[Manrope] text-center pt-2">+{products.length - 3} more in catalog</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {orders.length === 0 && products.length === 0 && (
              <div className="bg-white p-12 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] text-center">
                <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">bar_chart</span>
                <h3 className="font-serif text-[20px] font-semibold text-[#0b1c30] mb-2">No data yet</h3>
                <p className="font-[Manrope] text-[#7c839b] mb-6">Add products and receive orders to see performance analytics here.</p>
                <div className="flex justify-center gap-4">
                  <Link href="/products/new">
                    <button className="px-6 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors">
                      Add Products
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </AdminLayout>
  );
}
