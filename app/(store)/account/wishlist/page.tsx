"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { Heart, ShoppingBag, X } from "lucide-react";
import AccountSidebar from "@/components/AccountSidebar";

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      fetchWishlist();
    }
  }, [status, router]);

  const fetchWishlist = async () => {
    try {
      // For now, we fetch from a dummy endpoint or use local storage
      // In a real app, this would be a Prisma-backed API
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      setWishlist(data);
    } catch (error) {
      console.error("Failed to fetch wishlist", error);
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
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Wishlist</span>
          </div>
          <h1 className="text-4xl font-serif text-slate-900">My Wishlist</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <AccountSidebar />

          <div className="lg:col-span-3">
            {wishlist.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {wishlist.map((item: any, idx: number) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden group"
                  >
                    <div className="aspect-[3/4] relative bg-slate-50 overflow-hidden">
                      <Image 
                        src={item.product?.imageUrl || "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1936&auto=format&fit=crop"} 
                        alt="Product" 
                        fill 
                        className="object-cover group-hover:scale-105 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                      />
                      <button className="absolute top-4 right-4 h-10 w-10 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm">
                        <X size={18} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                          {item.product?.category?.name || "Boutique"}
                        </p>
                        <h3 className="text-lg font-serif text-slate-900">{item.product?.name}</h3>
                        <p className="text-sm font-bold text-slate-900 mt-2">${item.product?.price.toFixed(2)}</p>
                      </div>
                      <button className="w-full bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest py-4 rounded-full flex items-center justify-center gap-2 hover:bg-slate-800 transition-all leading-none">
                        <ShoppingBag size={14} />
                        Add to Bag
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-16 text-center shadow-sm border border-slate-100">
                <div className="h-24 w-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 text-slate-200">
                  <Heart size={40} strokeWidth={1} />
                </div>
                <h2 className="text-3xl font-serif text-slate-900 mb-4">Your Wishlist is Empty</h2>
                <p className="text-slate-500 max-w-sm mx-auto mb-10 leading-relaxed">
                  Curate your personal collection of timeless pieces. Items saved here are reserved for your consideration.
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
