"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus, Trash2, Edit, Package } from "lucide-react";
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
    const fetchData = async () => {
      const [resP, resC] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories")
      ]);
      setProducts(await resP.json());
      setCategories(await resC.json());
      setLoading(false);
    };
    fetchData(); 
  }, [session, router]);

  const refreshData = async () => {
    const [resP, resC] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/categories")
    ]);
    setProducts(await resP.json());
    setCategories(await resC.json());
    setLoading(false);
  };

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
      refreshData();
    }
  };

  if (!session || (session.user as any)?.role !== "ADMIN") return <div>Redirecting...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center text-white">
              <Package size={24} />
           </div>
           <div>
              <h1 className="text-3xl font-serif">Product Management</h1>
              <p className="text-slate-500 text-sm">Curate your inventory.</p>
           </div>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all"
        >
          <Plus size={16} />
          {showForm ? "Cancel" : "Add Product"}
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-50 p-8 rounded-2xl mb-12 border border-slate-200">
           <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Product Name</label>
                <input required type="text" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-white border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-slate-900"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Price ($)</label>
                <input required type="number" step="0.01" value={formData.price} onChange={e=>setFormData({...formData, price: e.target.value})} className="w-full bg-white border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-slate-900"/>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Description</label>
                <textarea required value={formData.description} onChange={e=>setFormData({...formData, description: e.target.value})} className="w-full bg-white border-none rounded-lg p-3 text-sm h-32 focus:ring-1 focus:ring-slate-900"/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Image URL</label>
                <input type="text" value={formData.imageUrl} onChange={e=>setFormData({...formData, imageUrl: e.target.value})} className="w-full bg-white border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-slate-900" placeholder="https://..."/>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                <select required value={formData.categoryId} onChange={e=>setFormData({...formData, categoryId: e.target.value})} className="w-full bg-white border-none rounded-lg p-3 text-sm focus:ring-1 focus:ring-slate-900">
                  <option value="">Select Category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2 pt-4">
                 <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-lg font-bold uppercase tracking-widest text-xs hover:bg-emerald-700 transition-all shadow-lg">Save Product</button>
              </div>
           </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">Product</th>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">Category</th>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400">Price</th>
              <th className="p-6 text-[10px] uppercase tracking-widest font-bold text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {products.map((product: any) => (
              <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-6">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 relative bg-slate-100 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={product.imageUrl || "https://picsum.photos/seed/p/100/100"}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <span className="font-bold text-sm text-slate-900">{product.name}</span>
                   </div>
                </td>
                <td className="p-6 text-sm text-slate-500">{product.category?.name}</td>
                <td className="p-6 text-sm font-bold text-slate-900">${product.price.toFixed(2)}</td>
                <td className="p-6 text-right space-x-2">
                   <button className="p-2 text-slate-400 hover:text-slate-900"><Edit size={16} /></button>
                   <button className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && !loading && (
          <div className="p-20 text-center text-slate-400">No products in inventory.</div>
        )}
      </div>
    </div>
  );
}
