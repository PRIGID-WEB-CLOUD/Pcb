"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ShoppingBag, Edit } from "lucide-react";

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (session && (session.user as any)?.role !== "ADMIN") {
      router.push("/");
      return;
    }

    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        setOrders(data);
      } catch (error) {
        console.error("Failed to fetch orders for admin", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [session, router]);

  const fetchOrdersGlobal = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders for admin", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (res.ok) {
        fetchOrdersGlobal();
      }
    } catch (error) {
      console.error("Failed to update status", error);
    } finally {
      setUpdating(null);
    }
  };

  if (!session || (session.user as any)?.role !== "ADMIN")
    return <div>Redirecting...</div>;

  return (
    <div className="max-w-7xl mx-auto py-12">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white">
            <ShoppingBag size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-serif">Order Management</h1>
            <p className="text-slate-500 text-sm">
              Review and fulfill customer orders.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                Order ID
              </th>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                Customer
              </th>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                Date
              </th>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                Total
              </th>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">
                Status
              </th>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map((order: any) => (
              <tr
                key={order.id}
                className="hover:bg-slate-50/50 transition-colors group"
              >
                <td className="p-6">
                  <span className="font-bold text-sm text-slate-900">
                    #{order.id.slice(-6).toUpperCase()}
                  </span>
                </td>
                <td className="p-6">
                  <p className="text-sm font-bold text-slate-900">
                    {order.user?.name || "Guest"}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {order.user?.email}
                  </p>
                </td>
                <td className="p-6 text-sm text-slate-500">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="p-6 text-sm font-bold text-slate-900">
                  ${order.total.toFixed(2)}
                </td>
                <td className="p-6">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      order.status === "DELIVERED"
                        ? "bg-emerald-50 text-emerald-700"
                        : order.status === "SHIPPED"
                          ? "bg-blue-50 text-blue-700"
                          : order.status === "CANCELLED"
                            ? "bg-red-50 text-red-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="p-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <select
                      disabled={updating === order.id}
                      value={order.status}
                      onChange={(e) =>
                        updateOrderStatus(order.id, e.target.value)
                      }
                      className="text-xs bg-slate-50 border border-slate-200 rounded p-2 focus:ring-1 focus:ring-slate-900 outline-none"
                    >
                      <option value="PROCESSING">Processing</option>
                      <option value="SHIPPED">Shipped</option>
                      <option value="DELIVERED">Delivered</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && !loading && (
          <div className="p-20 text-center text-slate-400">
            No orders found.
          </div>
        )}
      </div>
    </div>
  );
}
