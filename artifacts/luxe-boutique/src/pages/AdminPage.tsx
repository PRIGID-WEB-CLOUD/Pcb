import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useEffect } from "react";
import AccountSidebar from "@/components/AccountSidebar";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && (!user || user.role !== "ADMIN")) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (!user || user.role !== "ADMIN") return null;

  return (
    <div className="pt-24 pb-16 px-4 max-w-7xl mx-auto">
      <div className="flex gap-12">
        <AccountSidebar />
        <div className="flex-1">
          <h1 className="font-serif text-3xl text-slate-900 mb-2">Admin Dashboard</h1>
          <p className="text-slate-500 mb-8">Manage your store from here.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="border border-slate-200 rounded-lg p-6">
              <p className="text-xs tracking-widest uppercase text-slate-400 mb-1">Products</p>
              <p className="font-serif text-2xl text-slate-900">Manage catalog, add or remove items.</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <p className="text-xs tracking-widest uppercase text-slate-400 mb-1">Orders</p>
              <p className="font-serif text-2xl text-slate-900">View and update order statuses.</p>
            </div>
            <div className="border border-slate-200 rounded-lg p-6">
              <p className="text-xs tracking-widest uppercase text-slate-400 mb-1">Users</p>
              <p className="font-serif text-2xl text-slate-900">Review registered accounts.</p>
            </div>
          </div>

          <p className="mt-10 text-sm text-slate-400">
            Full admin management features are coming soon. Use the API endpoints directly for now.
          </p>
        </div>
      </div>
    </div>
  );
}
