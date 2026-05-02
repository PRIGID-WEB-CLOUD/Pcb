import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type OrderItem = {
  id: string;
  quantity: number;
  price: number;
  product: { id: string; name: string } | null;
};

type Order = {
  id: string;
  userId: string;
  total: number;
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  shippingAddress: string | null;
  createdAt: string;
  items: OrderItem[];
};

const STATUS_OPTIONS = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

const statusStyle: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  PROCESSING: "bg-blue-50 text-blue-700 border-blue-100",
  SHIPPED: "bg-purple-50 text-purple-700 border-purple-100",
  DELIVERED: "bg-emerald-50 text-[#006c49] border-emerald-100",
  CANCELLED: "bg-slate-100 text-slate-600 border-slate-200",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to fetch orders");
      return res.json();
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status }),
      });
      if (!res.ok) throw new Error("Failed to update order");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  const filtered = filterStatus === "All"
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const tabs = ["All", "PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  return (
    <AdminLayout sidebar="main">
      <div className="max-w-[1280px] mx-auto px-8 py-12">
        <div className="mb-12">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-[36px] font-serif font-bold text-black mb-2">Order Management</h2>
              <p className="font-[Manrope] text-[#7c839b]">Review and fulfill customer transactions.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: "Total Orders", value: orders.length },
              { label: "Pending", value: orders.filter(o => o.status === "PENDING").length },
              { label: "Processing", value: orders.filter(o => o.status === "PROCESSING").length },
              { label: "Delivered", value: orders.filter(o => o.status === "DELIVERED").length },
            ].map((s) => (
              <div key={s.label} className="bg-white p-6 rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.05)] border border-slate-50">
                <p className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#7c839b] mb-2">{s.label}</p>
                <span className="text-[24px] font-serif font-semibold">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-t-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center gap-1 px-6 py-4 border-b border-slate-100">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`px-4 py-2 font-[Manrope] font-bold text-[11px] tracking-widest uppercase transition-colors ${
                  filterStatus === tab ? "text-black border-b-2 border-black" : "text-[#7c839b] hover:text-black"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="p-16 text-center text-[#7c839b] font-[Manrope]">Loading orders...</div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center text-[#7c839b] font-[Manrope]">No orders found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    {["Order ID", "Date", "Items", "Total", "Status", "Update Status"].map((h) => (
                      <th key={h} className="px-6 py-4 font-[Manrope] font-bold text-[#7c839b] text-[11px] uppercase tracking-widest border-b border-slate-100">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-5 font-serif font-bold text-black text-xs">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-5 text-sm text-[#7c839b] font-[Manrope]">
                        {formatDate(o.createdAt)}
                      </td>
                      <td className="px-6 py-5 text-sm font-medium font-[Manrope]">
                        {o.items.length} item{o.items.length !== 1 ? "s" : ""}
                        <div className="text-[10px] text-[#7c839b] mt-0.5">
                          {o.items.slice(0, 2).map(i => i.product?.name).filter(Boolean).join(", ")}
                          {o.items.length > 2 && " ..."}
                        </div>
                      </td>
                      <td className="px-6 py-5 font-serif font-bold text-black">${o.total.toFixed(2)}</td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-[Manrope] font-bold border uppercase ${statusStyle[o.status] ?? ""}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <select
                          className="appearance-none bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-[Manrope] font-bold tracking-wider outline-none cursor-pointer hover:border-black transition-colors"
                          value={o.status}
                          onChange={e => updateStatus.mutate({ orderId: o.id, status: e.target.value })}
                        >
                          {STATUS_OPTIONS.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
            <p className="font-[Manrope] font-bold text-[10px] tracking-widest text-[#7c839b] uppercase">
              Showing {filtered.length} of {orders.length} orders
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
