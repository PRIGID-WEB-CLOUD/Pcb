"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Package, User, MapPin, LogOut, Search, ExternalLink } from "lucide-react";
import { signOut } from "next-auth/react";

import AccountSidebar from "@/components/AccountSidebar";

export default function OrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchOrders();
    }
  }, [status, router]);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-12">
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link href="/account" className="text-[10px] font-bold uppercase tracking-widest hover:text-slate-900 transition-colors">Account</Link>
            <span className="text-slate-200">/</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Orders</span>
          </div>
          <h1 className="text-4xl font-serif text-slate-900">Order History</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <AccountSidebar />

          <div className="lg:col-span-3 space-y-6">
            {orders.length > 0 ? (
              <div className="space-y-6">
                {orders.map((order: any, idx: number) => (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group"
                  >
                    <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex flex-wrap gap-8 items-center">
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Order Identifier</p>
                        <p className="text-sm font-bold text-slate-900">#{order.id.slice(-8).toUpperCase()}</p>
                      </div>
                      <div className="w-32">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Date</p>
                        <p className="text-sm font-medium text-slate-900">{new Date(order.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="w-32">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total</p>
                        <p className="text-sm font-bold text-slate-900">${order.total.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${order.status === 'DELIVERED' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-8 space-y-8">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex gap-8 group/item">
                          <div className="h-24 w-24 bg-slate-50 rounded-2xl overflow-hidden flex-shrink-0 border border-slate-100 relative shadow-sm">
                            <Image 
                              src={item.product.imageUrl || "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1936&auto=format&fit=crop"}
                              alt={item.product.name}
                              fill
                              className="object-cover group-hover/item:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="flex-1 flex justify-between">
                            <div>
                              <h3 className="text-lg font-serif text-slate-900 mb-1">{item.product.name}</h3>
                              <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Qty: {item.quantity}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-serif text-slate-900">${item.price.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="px-8 py-6 bg-slate-900 flex items-center justify-between">
                       <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/50">Tracking Available</p>
                       <Link 
                        href={`/account/orders/${order.id}`}
                        className="text-[10px] font-bold uppercase tracking-widest text-white border border-white/20 px-8 py-3 rounded-full hover:bg-white hover:text-slate-900 transition-all font-serif italic"
                       >
                         View Details
                       </Link>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-24 text-center shadow-sm border border-slate-100">
                <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200">
                  <Search size={40} strokeWidth={1} />
                </div>
                <h2 className="text-3xl font-serif text-slate-900 mb-4">No Orders Found</h2>
                <p className="text-slate-500 max-w-sm mx-auto mb-10 leading-relaxed">
                  Your wardrobe is waiting to be built. Browse our curated collections to place your first order.
                </p>
                <Link 
                  href="/products" 
                  className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.3em] px-12 py-5 rounded-full hover:bg-slate-800 hover:scale-105 transition-all inline-block shadow-xl shadow-slate-200"
                >
                  Explore Collection
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
