"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Edit, Package, Search, Filter, Download } from "lucide-react";
import { useSession } from "next-auth/react";

export default function AdminProductsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: ""
  });

  const fetchData = async () => {
    const [resP, resC] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories")
    ]);
    setProducts(await resP.json());
    setCategories(await resC.json());
    setLoading(false);
  };

  useEffect(() => {
    if (session && (session.user as any)?.role !== "ADMIN") {
      router.push("/");
      return;
    }
    fetchData(); 
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowForm(false);
      setFormData({ name: "", description: "", price: "", imageUrl: "", categoryId: "" });
      fetchData();
    }
  };

  if (!session || (session.user as any)?.role !== "ADMIN") return null;

  return (
    <div className="max-w-7xl mx-auto py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h1 className="font-serif text-4xl text-slate-900 tracking-tight mb-2">Product Catalog</h1>
          <p className="text-slate-500 font-serif max-w-xl">Manage your boutique inventory and collections.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-900 text-white px-6 py-3 font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg hover:-translate-y-0.5"
        >
          <Plus size={16} strokeWidth={2.5} />
          {showForm ? "Cancel Creation" : "Add New Product"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-8 rounded-xl shadow-[0_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 mb-12">
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Product Name</label>
                <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border-none rounded py-3 px-4 text-sm focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Price ($)</label>
                <input required type="number" step="0.01" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full bg-slate-50 border-none rounded py-3 px-4 text-sm focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"/>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</label>
                <textarea required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 border-none rounded py-3 px-4 text-sm h-32 resize-none focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Image URL</label>
                <input type="text" value={formData.imageUrl} onChange={e=>setFormData({...formData, imageUrl: e.target.value})} className="w-full bg-slate-50 border-none rounded py-3 px-4 text-sm focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all" placeholder="https://..."/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                <select required value={formData.categoryId} onChange={e=>setFormData({...formData, categoryId: e.target.value})} className="w-full bg-slate-50 border-none rounded py-3 px-4 text-sm focus:ring-1 focus:ring-slate-900 focus:bg-white transition-all">
                  <option value="">Select Category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 pt-6 border-t border-slate-100 flex justify-end">
                 <button type="submit" className="bg-slate-900 text-white px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-emerald-600 transition-colors shadow-lg">Save Product</button>
              </div>
           </form>
        </div>
      )}

      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 border-l-4 border-l-slate-900 rounded-lg">
          <p className="font-bold uppercase tracking-widest text-slate-400 text-[10px] mb-2">Total Products</p>
          <h3 className="font-serif text-3xl text-slate-900">{products.length}</h3>
        </div>
        <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 border-l-4 border-l-red-500 rounded-lg">
          <p className="font-bold uppercase tracking-widest text-slate-400 text-[10px] mb-2">Out of Stock</p>
          <h3 className="font-serif text-3xl text-red-500">0</h3>
        </div>
        <div className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 border-l-4 border-l-emerald-500 rounded-lg">
          <p className="font-bold uppercase tracking-widest text-slate-400 text-[10px] mb-2">Categories</p>
          <h3 className="font-serif text-3xl text-emerald-600">{categories.length}</h3>
        </div>
      </div>

      {/* Table Filters */}
      <div className="bg-white p-4 shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 rounded-t-xl mb-px flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <select className="bg-slate-50 border-none font-bold uppercase tracking-widest text-[10px] py-2.5 px-4 rounded focus:ring-1 focus:ring-slate-900 text-slate-600">
            <option>All Categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="bg-slate-50 border-none font-bold uppercase tracking-widest text-[10px] py-2.5 px-4 rounded focus:ring-1 focus:ring-slate-900 text-slate-600">
            <option>Stock Status</option>
            <option>In Stock</option>
            <option>Low Stock</option>
          </select>
        </div>
        <div className="flex items-center gap-3">
           <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 bg-slate-50 border-none rounded text-xs focus:ring-1 focus:ring-slate-900 w-48" />
           </div>
           <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors bg-slate-50 rounded">
             <Filter size={16} />
           </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.03)] rounded-b-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="p-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Product</th>
                <th className="p-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Category</th>
                <th className="p-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Price</th>
                <th className="p-6 font-bold uppercase tracking-widest text-[10px] text-slate-400">Status</th>
                <th className="p-6 font-bold uppercase tracking-widest text-[10px] text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {products.map((product: any) => (
                <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-100 overflow-hidden rounded relative flex-shrink-0 border border-slate-200">
                        <Image
                          src={product.imageUrl || "https://picsum.photos/seed/p/100/100"}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900">{product.name}</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">ID: {product.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-sm text-slate-600 font-serif">{product.category?.name || "Uncategorized"}</td>
                  <td className="p-6 font-bold text-slate-900">${product.price.toFixed(2)}</td>
                  <td className="p-6">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold uppercase tracking-widest text-[9px] rounded-full">
                      Active
                    </span>
                  </td>
                  <td className="p-6 text-right">
                    <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors"><Edit size={16} /></button>
                    <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}

              {products.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-slate-500 font-serif">
                    No products found. Start by adding one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
