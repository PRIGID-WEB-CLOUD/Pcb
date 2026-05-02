"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Package, User, MapPin, LogOut, CheckCircle2 } from "lucide-react";
import { signOut } from "next-auth/react";

import AccountSidebar from "@/components/AccountSidebar";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && session?.user) {
      // Use microtask to avoid synchronous setState warning
      Promise.resolve().then(() => {
        setFormData(prev => {
          if (prev.email === session.user?.email && prev.name === session.user?.name) return prev;
          return {
            ...prev,
            name: session.user?.name || "",
            email: session.user?.email || "",
          };
        });
      });
    }
  }, [status, router, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("Profile updated successfully");
        await update({ name: formData.name }); // Update client session
        setFormData(p => ({ ...p, currentPassword: "", newPassword: "" }));
      } else {
        setError(data.error || "Failed to update profile");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
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
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Settings</span>
          </div>
          <h1 className="text-4xl font-serif text-slate-900">Account Settings</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <AccountSidebar />

          <div className="lg:col-span-3">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden"
            >
              <div className="p-10 border-b border-slate-50">
                <h2 className="text-2xl font-serif text-slate-900">Personal Information</h2>
                <p className="text-sm text-slate-500 mt-1">Update your identification and security preferences.</p>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-10">
                {success && (
                  <div className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center gap-3 text-sm font-medium">
                    <CheckCircle2 size={18} />
                    {success}
                  </div>
                )}
                {error && (
                  <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1 leading-none">Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all font-medium"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1 leading-none">Email Address</label>
                    <input 
                      type="email" 
                      disabled
                      value={formData.email}
                      className="w-full bg-slate-100 border-none rounded-2xl p-5 text-sm text-slate-400 cursor-not-allowed font-medium"
                    />
                  </div>
                </div>

                <div className="pt-10 border-t border-slate-50">
                   <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-slate-900 mb-10">Security Credentials</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1 leading-none">Current Password</label>
                      <input 
                        type="password" 
                        value={formData.currentPassword}
                        onChange={e => setFormData({...formData, currentPassword: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1 leading-none">New Password</label>
                      <input 
                        type="password" 
                        value={formData.newPassword}
                        onChange={e => setFormData({...formData, newPassword: e.target.value})}
                        className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all font-medium"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-6">
                  <button 
                    type="submit" 
                    disabled={loading}
                    className={`bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.3em] px-16 py-5 rounded-full hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 ${loading ? "opacity-50 cursor-not-allowed" : "hover:scale-105"}`}
                  >
                    {loading ? "Synchronizing..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
