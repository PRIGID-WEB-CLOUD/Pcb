"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { MapPin, Plus, Edit2, Trash2, Phone } from "lucide-react";
import AccountSidebar from "@/components/AccountSidebar";

export default function AddressesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState([
    {
      id: "1",
      name: "Alexander Thorne",
      street: "724 Fifth Avenue, 14th Floor",
      city: "New York",
      state: "NY",
      zip: "10019",
      country: "United States",
      phone: "+1 (212) 555-0198",
      isDefault: true
    }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      setLoading(false);
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
          <div className="flex items-center gap-2 text-slate-400 mb-2">
            <Link href="/account" className="text-[10px] font-bold uppercase tracking-widest hover:text-slate-900 transition-colors">Account</Link>
            <span className="text-slate-200">/</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Addresses</span>
          </div>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-serif text-slate-900">Saved Addresses</h1>
              <p className="text-slate-500 mt-2">Manage your delivery locations for a faster checkout experience.</p>
            </div>
            <button className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-8 py-4 rounded-full flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200">
              <Plus size={14} />
              Add New Address
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <AccountSidebar />

          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {addresses.map((address, idx) => (
                <motion.div 
                  key={address.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 relative group hover:shadow-xl hover:shadow-slate-200/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-6">
                    {address.isDefault ? (
                      <span className="bg-slate-900 text-white font-bold text-[8px] uppercase tracking-[0.2em] px-3 py-1 rounded-full">Primary</span>
                    ) : (
                      <div className="h-4" />
                    )}
                    <div className="flex gap-1">
                      <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-50">
                        <Edit2 size={16} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-red-50">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-xl font-serif text-slate-900">{address.name}</h3>
                    <div className="space-y-1 text-sm text-slate-500 leading-relaxed">
                      <p>{address.street}</p>
                      <p>{address.city}, {address.state} {address.zip}</p>
                      <p>{address.country}</p>
                    </div>
                    <div className="pt-4 border-t border-slate-50 flex items-center gap-3 text-slate-900 font-bold text-xs uppercase tracking-widest">
                      <Phone size={14} className="text-slate-400" />
                      {address.phone}
                    </div>
                  </div>
                </motion.div>
              ))}
              
              <button className="border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center p-8 text-slate-300 hover:bg-white hover:border-slate-900 hover:text-slate-900 transition-all group min-h-[250px]">
                <Plus size={32} strokeWidth={1} className="mb-4 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Add Another Location</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
