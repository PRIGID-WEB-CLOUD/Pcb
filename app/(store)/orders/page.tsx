"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Clock, CheckCircle, Ship } from "lucide-react";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto px-8 py-20 text-center uppercase tracking-widest font-bold font-serif">Retrieving History...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <header className="mb-16 space-y-4">
        <h1 className="text-4xl font-serif text-slate-900 tracking-tight">Order History</h1>
        <p className="text-slate-500 max-w-lg">A curated record of your luxury acquisitions.</p>
      </header>

      {orders.length > 0 ? (
        <div className="space-y-12">
          {orders.map((order: any) => (
            <div key={order.id} className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
               <div className="bg-slate-50 p-8 flex flex-wrap justify-between items-center gap-6">
                  <div className="flex gap-8">
                     <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Order Reference</p>
                        <p className="font-bold text-sm">#{order.id.slice(-8).toUpperCase()}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Placed On</p>
                        <p className="font-bold text-sm">{new Date(order.createdAt).toLocaleDateString()}</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Total Value</p>
                        <p className="font-bold text-sm">${order.total.toFixed(2)}</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest">
                     <CheckCircle size={14} />
                     {order.status}
                  </div>
               </div>

               <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {order.items.map((item: any) => (
                      <div key={item.id} className="flex gap-4">
                        <div className="w-16 h-20 bg-slate-100 rounded overflow-hidden flex-shrink-0">
                          {/* Image would go here */}
                        </div>
                        <div className="space-y-1">
                           <h4 className="font-bold text-sm text-slate-900">{item.product.name}</h4>
                           <p className="text-xs text-slate-500">Qty: {item.quantity} × ${item.price.toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-slate-50 rounded-3xl space-y-8">
          <Package className="w-16 h-16 text-slate-300 mx-auto" />
          <p className="text-slate-500 font-serif text-xl italic">No acquisitions found in your record.</p>
          <Link href="/products" className="inline-block bg-slate-900 text-white px-10 py-4 text-xs font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all">
            Explore the Collection
          </Link>
        </div>
      )}
    </div>
  );
}
