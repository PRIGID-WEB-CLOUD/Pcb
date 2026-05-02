"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Package, User, MapPin, LogOut, ChevronRight, ShoppingBag } from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";

import AccountSidebar from "@/components/AccountSidebar";

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data.slice(0, 3));
    } catch (error) {
      console.error("Failed to fetch orders", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      // Use microtask to avoid synchronous setState warning
      Promise.resolve().then(() => fetchOrders());
    }
  }, [status, router]);

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
          <h1 className="text-4xl font-serif text-slate-900">Account Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">Welcome back, {session?.user?.name || "Member"}.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <AccountSidebar />

          <div className="lg:col-span-3 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: "Total Orders", value: orders.length, icon: Package, color: "bg-blue-50 text-blue-600" },
                { label: "Active Wishlist", value: "8", icon: ShoppingBag, color: "bg-emerald-50 text-emerald-600" },
                { label: "Account Status", value: "Verified", icon: User, color: "bg-purple-50 text-purple-600" },
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-6"
                >
                  <div className={`h-14 w-14 ${stat.color} rounded-2xl flex items-center justify-center`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-serif text-slate-900 leading-none">{stat.value}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <section className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-serif text-slate-900">Recent Purchases</h2>
                <Link href="/account/orders" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
                  Full History
                </Link>
              </div>
              
              {orders.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {orders.map((order: any) => (
                    <div key={order.id} className="p-8 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-6">
                        <div className="h-20 w-20 bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden relative">
                          {order.items?.[0]?.product?.imageUrl && (
                            <Image 
                              src={order.items[0].product.imageUrl} 
                              alt="Product" 
                              fill 
                              className="object-cover"
                              referrerPolicy="no-referrer"
                            />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 mb-1">Order #{order.id.slice(-6).toUpperCase()}</p>
                          <p className="text-xs text-slate-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between md:justify-end gap-12 w-full md:w-auto">
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Status</p>
                          <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600">
                            {order.status}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total</p>
                          <p className="text-lg font-serif text-slate-900">${order.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center space-y-6">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <Package size={32} />
                  </div>
                  <p className="text-slate-500 italic max-w-xs mx-auto">Your order history is currently empty. Explore our latest pieces to start your collection.</p>
                  <Link 
                    href="/products" 
                    className="inline-block bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-12 py-4 rounded-full hover:bg-slate-800 transition-all"
                  >
                    Start Shopping
                  </Link>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
