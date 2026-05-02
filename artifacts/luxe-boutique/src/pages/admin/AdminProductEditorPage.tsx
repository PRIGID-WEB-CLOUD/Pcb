import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type Category = { id: string; name: string };
type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
};

export default function AdminProductEditorPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(
    typeof window !== "undefined" ? window.location.search : ""
  );
  const productId = params.get("id");
  const isEdit = !!productId;

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    imageUrl: "",
    categoryId: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const { data: existingProduct } = useQuery<Product>({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingProduct) {
      setForm({
        name: existingProduct.name,
        description: existingProduct.description,
        price: String(existingProduct.price),
        imageUrl: existingProduct.imageUrl ?? "",
        categoryId: existingProduct.categoryId,
      });
    }
  }, [existingProduct]);

  useEffect(() => {
    if (!form.categoryId && categories.length > 0) {
      setForm(f => ({ ...f, categoryId: f.categoryId || categories[0].id }));
    }
  }, [categories, form.categoryId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isEdit ? `/api/products/${productId}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: form.price,
          imageUrl: form.imageUrl || null,
          categoryId: form.categoryId,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save product");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setSaved(true);
      setTimeout(() => {
        setLocation("/admin/catalog");
      }, 800);
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.description || !form.price || !form.categoryId) {
      setError("Please fill in all required fields.");
      return;
    }
    mutation.mutate();
  };

  return (
    <AdminLayout sidebar="main">
      <div className="p-8 bg-[#f8f9ff] min-h-screen">
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/admin/catalog" className="text-[#7c839b] hover:text-black transition-colors text-sm font-[Manrope] flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Catalog
              </Link>
            </div>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-black">
              {isEdit ? "Edit Product" : "New Product"}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/catalog">
              <button type="button" className="px-6 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all">
                Discard
              </button>
            </Link>
            <button
              onClick={handleSubmit}
              disabled={mutation.isPending || saved}
              className="px-8 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all shadow-md disabled:opacity-60"
            >
              {mutation.isPending ? "Saving..." : saved ? "Saved!" : "Save Product"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#ffdad6] text-[#93000a] text-sm font-[Manrope] rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
              <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[24px] font-serif font-semibold text-black mb-6">General Information</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Product Name <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:ring-black focus:border-black px-4 py-3 font-[Manrope] outline-none"
                      type="text"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Description <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <textarea
                      className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:ring-black focus:border-black px-4 py-3 font-[Manrope] outline-none"
                      rows={6}
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Describe the product..."
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Image URL
                    </label>
                    <input
                      className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:ring-black focus:border-black px-4 py-3 font-[Manrope] outline-none"
                      type="url"
                      value={form.imageUrl}
                      onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                    {form.imageUrl && (
                      <div className="mt-3 w-24 h-24 bg-slate-100 overflow-hidden rounded">
                        <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
              <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] uppercase mb-6">Pricing & Category</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] block mb-2 uppercase">
                      Price (USD) <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45464d] font-[Manrope]">$</span>
                      <input
                        className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg pl-8 py-2 font-[Manrope] outline-none"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] block mb-2 uppercase">
                      Category <span className="text-[#ba1a1a]">*</span>
                    </label>
                    {categories.length === 0 ? (
                      <div className="text-sm text-[#7c839b] font-[Manrope]">
                        No categories yet.{" "}
                        <Link href="/admin/categories" className="text-black underline">Create one</Link>
                      </div>
                    ) : (
                      <select
                        className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:ring-black px-4 py-2 font-[Manrope] outline-none"
                        value={form.categoryId}
                        onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                      >
                        {categories.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </section>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
