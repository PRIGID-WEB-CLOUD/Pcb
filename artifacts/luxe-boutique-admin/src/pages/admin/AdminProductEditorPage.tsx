import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type Category = { id: string; name: string };
type Variant = { id: string; name: string; price: number; sku: string; stock: number; color?: string };
type Product = {
  id: string; name: string; description: string; price: number;
  compareAtPrice?: number | null; imageUrl: string | null; images?: string | null;
  categoryId: string; status: string; tags?: string | null;
  seoTitle?: string | null; seoDescription?: string | null;
  trackQuantity: boolean; variants?: Variant[];
};

const STATUS_OPTS = ["ACTIVE", "DRAFT", "ARCHIVED"];
const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  ACTIVE:   { label: "Published",  cls: "text-[#00714d] bg-[#6cf8bb]/30" },
  DRAFT:    { label: "Draft",      cls: "text-[#45464d] bg-[#e5eeff]"    },
  ARCHIVED: { label: "Archived",   cls: "text-[#ba1a1a] bg-[#ffdad6]"   },
};

function VariantRow({
  v, onSave, onDelete,
}: { v: Variant; onSave: (v: Variant) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(v);

  const stockCls = v.stock === 0
    ? "bg-[#ba1a1a]"
    : v.stock < 5 ? "bg-amber-400" : "bg-[#006c49]";

  if (editing) return (
    <tr className="border-b border-[#e5eeff] bg-[#f8f9ff]">
      <td className="py-3 pr-3">
        <input
          className="w-full border border-[#c6c6cd] rounded px-2 py-1 text-sm font-[Manrope] outline-none"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Black / L"
        />
      </td>
      <td className="py-3 pr-3">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#45464d] text-xs">$</span>
          <input
            className="w-full border border-[#c6c6cd] rounded pl-5 pr-2 py-1 text-sm font-[Manrope] outline-none"
            type="number" step="0.01" min="0"
            value={form.price}
            onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))}
          />
        </div>
      </td>
      <td className="py-3 pr-3">
        <input
          className="w-full border border-[#c6c6cd] rounded px-2 py-1 text-sm font-[Manrope] outline-none"
          value={form.sku}
          onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
          placeholder="SKU-001"
        />
      </td>
      <td className="py-3 pr-3">
        <input
          className="w-20 border border-[#c6c6cd] rounded px-2 py-1 text-sm font-[Manrope] outline-none"
          type="number" min="0"
          value={form.stock}
          onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
        />
      </td>
      <td className="py-3 flex items-center gap-2">
        <button onClick={() => { onSave(form); setEditing(false); }}
          className="px-3 py-1 bg-black text-white text-[10px] font-[Manrope] font-bold uppercase tracking-widest hover:bg-[#006c49] transition-colors">
          Save
        </button>
        <button onClick={() => setEditing(false)}
          className="px-3 py-1 border border-[#c6c6cd] text-[10px] font-[Manrope] font-bold uppercase tracking-widest hover:bg-[#eff4ff] transition-colors">
          Cancel
        </button>
      </td>
    </tr>
  );

  return (
    <tr className="border-b border-[#e5eeff] group hover:bg-[#f8f9ff] transition-colors">
      <td className="py-4 pr-3 font-[Manrope] text-sm text-[#0b1c30] flex items-center gap-2">
        {v.color && <div className="w-5 h-5 rounded-sm shrink-0" style={{ background: v.color }} />}
        {v.name}
      </td>
      <td className="py-4 pr-3 font-[Manrope] text-sm text-[#0b1c30]">${v.price.toFixed(2)}</td>
      <td className="py-4 pr-3 font-[Manrope] text-sm text-[#7c839b]">{v.sku || "—"}</td>
      <td className="py-4 pr-3">
        <span className="flex items-center gap-1.5 text-sm font-[Manrope]">
          <span className={`inline-block w-2 h-2 rounded-full ${stockCls}`} />
          {v.stock === 0 ? "Out of stock" : `${v.stock} in stock`}
        </span>
      </td>
      <td className="py-4">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => { setForm(v); setEditing(true); }}
            className="text-[#45464d] hover:text-black transition-colors" title="Edit">
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button onClick={() => onDelete(v.id)}
            className="text-[#45464d] hover:text-[#ba1a1a] transition-colors" title="Delete">
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function AdminProductEditorPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const productId = params.get("id");
  const isEdit = !!productId;

  const [form, setForm] = useState({
    name: "", description: "", price: "", compareAtPrice: "",
    imageUrl: "", categoryId: "", status: "ACTIVE",
    tags: [] as string[], tagInput: "",
    seoTitle: "", seoDescription: "", trackQuantity: true,
  });
  const [images, setImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [showNewVariant, setShowNewVariant] = useState(false);
  const [newVariant, setNewVariant] = useState({ name: "", price: "", sku: "", stock: "0", color: "" });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSeoEdit, setShowSeoEdit] = useState(false);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: existingProduct } = useQuery<Product>({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: isEdit,
  });

  useEffect(() => {
    if (existingProduct) {
      let parsedTags: string[] = [];
      try { parsedTags = existingProduct.tags ? JSON.parse(existingProduct.tags) : []; } catch { parsedTags = []; }
      let parsedImages: string[] = [];
      try { parsedImages = existingProduct.images ? JSON.parse(existingProduct.images) : []; } catch { parsedImages = []; }

      setForm({
        name: existingProduct.name,
        description: existingProduct.description,
        price: String(existingProduct.price),
        compareAtPrice: existingProduct.compareAtPrice ? String(existingProduct.compareAtPrice) : "",
        imageUrl: existingProduct.imageUrl ?? "",
        categoryId: existingProduct.categoryId,
        status: existingProduct.status || "ACTIVE",
        tags: parsedTags,
        tagInput: "",
        seoTitle: existingProduct.seoTitle ?? "",
        seoDescription: existingProduct.seoDescription ?? "",
        trackQuantity: existingProduct.trackQuantity !== false,
      });
      setImages(parsedImages);
      if (existingProduct.variants) setVariants(existingProduct.variants);
    }
  }, [existingProduct]);

  useEffect(() => {
    if (!form.categoryId && categories.length > 0) {
      setForm(f => ({ ...f, categoryId: f.categoryId || categories[0].id }));
    }
  }, [categories, form.categoryId]);

  const mutation = useMutation({
    mutationFn: async () => {
      const allImages = form.imageUrl ? [form.imageUrl, ...images.filter(i => i !== form.imageUrl)] : images;
      const primaryImage = allImages[0] || null;

      const url = isEdit ? `/api/products/${productId}` : "/api/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: form.price,
          compareAtPrice: form.compareAtPrice || null,
          imageUrl: primaryImage,
          images: allImages,
          categoryId: form.categoryId,
          status: form.status,
          tags: form.tags,
          seoTitle: form.seoTitle || null,
          seoDescription: form.seoDescription || null,
          trackQuantity: form.trackQuantity,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to save"); }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setLastSaved(new Date());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (!isEdit) {
        setLocation(`/admin/products/edit?id=${data.id}`);
      }
    },
    onError: (e: Error) => setError(e.message),
  });

  const saveVariant = useCallback(async (v: Variant) => {
    if (!productId) return;
    await fetch(`/api/products/${productId}/variants/${v.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    setVariants(vs => vs.map(x => x.id === v.id ? v : x));
  }, [productId]);

  const deleteVariant = useCallback(async (id: string) => {
    if (!productId) return;
    await fetch(`/api/products/${productId}/variants/${id}`, { method: "DELETE" });
    setVariants(vs => vs.filter(v => v.id !== id));
  }, [productId]);

  const addVariant = async () => {
    if (!productId || !newVariant.name || !newVariant.price) return;
    const res = await fetch(`/api/products/${productId}/variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newVariant, price: parseFloat(newVariant.price), stock: parseInt(newVariant.stock) }),
    });
    if (res.ok) {
      const v = await res.json();
      setVariants(vs => [...vs, v]);
      setNewVariant({ name: "", price: "", sku: "", stock: "0", color: "" });
      setShowNewVariant(false);
    }
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setImages(imgs => [...imgs, newImageUrl.trim()]);
    if (!form.imageUrl) setForm(f => ({ ...f, imageUrl: newImageUrl.trim() }));
    setNewImageUrl("");
  };

  const removeImage = (url: string) => {
    setImages(imgs => imgs.filter(i => i !== url));
    if (form.imageUrl === url) {
      const remaining = images.filter(i => i !== url);
      setForm(f => ({ ...f, imageUrl: remaining[0] ?? "" }));
    }
  };

  const addTag = () => {
    const t = form.tagInput.trim();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
  };

  const insertFormat = (pre: string, post: string) => {
    const ta = descRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const selected = value.slice(s, e);
    const newVal = value.slice(0, s) + pre + selected + post + value.slice(e);
    setForm(f => ({ ...f, description: newVal }));
    setTimeout(() => { ta.setSelectionRange(s + pre.length, e + pre.length); ta.focus(); }, 0);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!form.name || !form.description || !form.price || !form.categoryId) {
      setError("Please fill in all required fields (name, description, price, category).");
      return;
    }
    mutation.mutate();
  };

  const seoTitle = form.seoTitle || (form.name ? `${form.name} | Luxe Boutique` : "Product | Luxe Boutique");
  const seoDesc = form.seoDescription || form.description.slice(0, 120);
  const allImages = form.imageUrl
    ? [form.imageUrl, ...images.filter(i => i !== form.imageUrl)]
    : images;
  const storefrontOrigin = (() => {
    const configured = (import.meta.env.VITE_STOREFRONT_ORIGIN as string | undefined)?.replace(/\/$/, "");
    if (configured) return configured;
    if (typeof window === "undefined") return "https://luxeboutique.com";

    const { protocol, hostname } = window.location;
    if (hostname === "localhost" || hostname === "127.0.0.1") return `${protocol}//${hostname}:22805`;
    if (hostname.endsWith(".replit.dev") || hostname.endsWith(".repl.co")) return `${protocol}//${hostname}:9000`;
    return "https://luxeboutique.com";
  })();
  const liveProductUrl = productId ? `${storefrontOrigin}/products/${encodeURIComponent(productId)}` : null;

  const stCfg = STATUS_LABEL[form.status] ?? STATUS_LABEL.ACTIVE;
  const lastSavedStr = lastSaved
    ? `Last saved ${Math.round((Date.now() - lastSaved.getTime()) / 60000)} min ago`
    : isEdit ? "Unsaved changes" : "Not yet saved";

  return (
    <AdminLayout sidebar="main">
      <div className="p-8 bg-[#f8f9ff] min-h-screen">

        {/* ── Header ── */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/catalog"
                className="text-[#7c839b] hover:text-black transition-colors text-sm font-[Manrope] flex items-center gap-1 no-underline">
                <span className="material-symbols-outlined text-sm">arrow_back</span> Back to Catalog
              </Link>
              <span className="text-[#c6c6cd]">·</span>
              <span className={`text-[11px] font-[Manrope] font-bold tracking-widest uppercase px-2 py-0.5 rounded ${stCfg.cls}`}>
                {stCfg.label}
              </span>
              <span className="text-[11px] font-[Manrope] text-[#7c839b]">{lastSavedStr}</span>
            </div>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-black">
              {form.name || (isEdit ? "Edit Product" : "New Product")}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/catalog">
              <button type="button"
                className="px-6 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all">
                Discard
              </button>
            </Link>
            <button
              onClick={() => handleSubmit()}
              disabled={mutation.isPending}
              className="px-8 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all shadow-md disabled:opacity-60 flex items-center gap-2"
            >
              {mutation.isPending && <span className="material-symbols-outlined text-sm animate-spin">autorenew</span>}
              {mutation.isPending ? "Saving..." : saved ? "Saved!" : isEdit ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#ffdad6] text-[#93000a] text-sm font-[Manrope] rounded-lg flex items-center gap-2">
            <span className="material-symbols-outlined text-base">error</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-12 gap-6">

            {/* ── Left column ── */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">

              {/* General Info */}
              <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[24px] font-serif font-semibold text-black mb-6">General Information</h3>
                <div className="space-y-6">
                  <div>
                    <label className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Product Name <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                      className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:border-black px-4 py-3 font-[Manrope] outline-none transition-colors"
                      type="text" value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Description <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <div className="border border-[#c6c6cd] rounded-lg overflow-hidden focus-within:border-black transition-colors">
                      <div className="bg-[#eff4ff] px-4 py-2 border-b border-[#c6c6cd] flex items-center gap-4">
                        {[
                          { icon: "format_bold",   action: () => insertFormat("**", "**")    },
                          { icon: "format_italic",  action: () => insertFormat("_", "_")      },
                          { icon: "list",           action: () => insertFormat("\n- ", "")    },
                          { icon: "link",           action: () => insertFormat("[", "](url)") },
                        ].map(({ icon, action }) => (
                          <button key={icon} type="button" onClick={action}
                            className="text-[#45464d] hover:text-black transition-colors">
                            <span className="material-symbols-outlined text-lg">{icon}</span>
                          </button>
                        ))}
                      </div>
                      <textarea
                        ref={descRef}
                        className="w-full bg-[#f8f9ff] border-none focus:ring-0 px-4 py-3 font-[Manrope] text-[#0b1c30] outline-none resize-none"
                        rows={6} value={form.description}
                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Describe the product in detail..."
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Media Gallery */}
              <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-[24px] font-serif font-semibold text-black">Media Gallery</h3>
                  <button type="button" onClick={() => setNewImageUrl(" ")}
                    className="text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-[#006c49] flex items-center gap-1 hover:underline">
                    <span className="material-symbols-outlined text-sm">add</span> Add Media
                  </button>
                </div>

                {/* Image URL adder */}
                <div className="flex gap-2 mb-4">
                  <input
                    className="flex-1 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none focus:border-black transition-colors"
                    placeholder="Paste image URL and press Add..."
                    value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addImageUrl())}
                  />
                  <button type="button" onClick={addImageUrl}
                    className="px-4 py-2 bg-black text-white text-[10px] font-[Manrope] font-bold uppercase tracking-widest hover:bg-[#006c49] transition-colors rounded-lg">
                    Add
                  </button>
                </div>

                {allImages.length > 0 ? (
                  <div className="grid grid-cols-4 gap-3">
                    {allImages.map((url, i) => (
                      <div key={url}
                        className={`relative group cursor-pointer overflow-hidden rounded-lg ${i === 0 ? "col-span-2 row-span-2" : "aspect-square"}`}
                        style={i === 0 ? { aspectRatio: "1/1" } : {}}>
                        <img src={url} alt={`Product image ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                        {/* Always-visible Primary badge */}
                        {i === 0 && (
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded pointer-events-none">
                            Primary
                          </div>
                        )}

                        {/* Always-visible remove × button */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(url); }}
                          title="Remove image"
                          className="absolute top-2 right-2 w-6 h-6 bg-white/90 hover:bg-[#ffdad6] rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <span className="material-symbols-outlined text-[#ba1a1a] text-sm leading-none">close</span>
                        </button>

                        {/* Hover overlay — star (set primary) for non-primary images */}
                        {i !== 0 && (
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" onClick={() => {
                              setImages(imgs => [url, ...imgs.filter(x => x !== url)]);
                              setForm(f => ({ ...f, imageUrl: url }));
                            }} title="Set as primary" className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow">
                              <span className="material-symbols-outlined text-black text-sm">star</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Upload slot */}
                    <div className="border-2 border-dashed border-[#c6c6cd] flex flex-col items-center justify-center gap-1.5 text-[#7c839b] hover:bg-[#eff4ff] hover:border-black transition-colors rounded-lg aspect-square cursor-pointer">
                      <span className="material-symbols-outlined text-2xl">upload</span>
                      <span className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest">Upload</span>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-[#c6c6cd] rounded-lg flex flex-col items-center justify-center gap-3 py-12 text-[#7c839b] hover:bg-[#eff4ff] transition-colors cursor-pointer">
                    <span className="material-symbols-outlined text-4xl text-[#c6c6cd]">image</span>
                    <p className="text-sm font-[Manrope] font-bold">No images yet</p>
                    <p className="text-xs font-[Manrope]">Paste an image URL above to add media</p>
                  </div>
                )}
              </section>

              {/* Product Variants */}
              <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[24px] font-serif font-semibold text-black mb-6">Product Variants</h3>

                {!isEdit && (
                  <div className="mb-4 p-3 bg-[#eff4ff] rounded-lg text-xs font-[Manrope] text-[#45464d] flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-[#006c49]">info</span>
                    Save the product first to add variants.
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#c6c6cd]">
                        {["Variant", "Price", "SKU", "Stock", ""].map(h => (
                          <th key={h} className="py-3 pr-3 text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map(v => (
                        <VariantRow key={v.id} v={v} onSave={saveVariant} onDelete={deleteVariant} />
                      ))}
                      {showNewVariant && (
                        <tr className="border-b border-[#e5eeff] bg-[#f8f9ff]">
                          <td className="py-3 pr-3">
                            <input className="w-full border border-[#c6c6cd] rounded px-2 py-1 text-sm font-[Manrope] outline-none"
                              placeholder="e.g. Black / L"
                              value={newVariant.name} onChange={e => setNewVariant(n => ({ ...n, name: e.target.value }))} />
                          </td>
                          <td className="py-3 pr-3">
                            <div className="relative">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[#45464d] text-xs">$</span>
                              <input className="w-full border border-[#c6c6cd] rounded pl-5 pr-2 py-1 text-sm font-[Manrope] outline-none"
                                type="number" step="0.01" min="0" placeholder="0.00"
                                value={newVariant.price} onChange={e => setNewVariant(n => ({ ...n, price: e.target.value }))} />
                            </div>
                          </td>
                          <td className="py-3 pr-3">
                            <input className="w-full border border-[#c6c6cd] rounded px-2 py-1 text-sm font-[Manrope] outline-none"
                              placeholder="SKU-001"
                              value={newVariant.sku} onChange={e => setNewVariant(n => ({ ...n, sku: e.target.value }))} />
                          </td>
                          <td className="py-3 pr-3">
                            <input className="w-20 border border-[#c6c6cd] rounded px-2 py-1 text-sm font-[Manrope] outline-none"
                              type="number" min="0"
                              value={newVariant.stock} onChange={e => setNewVariant(n => ({ ...n, stock: e.target.value }))} />
                          </td>
                          <td className="py-3 flex items-center gap-2">
                            <button type="button" onClick={addVariant}
                              className="px-3 py-1 bg-black text-white text-[10px] font-[Manrope] font-bold uppercase tracking-widest hover:bg-[#006c49] transition-colors">
                              Add
                            </button>
                            <button type="button" onClick={() => setShowNewVariant(false)}
                              className="px-3 py-1 border border-[#c6c6cd] text-[10px] font-[Manrope] font-bold uppercase tracking-widest hover:bg-[#eff4ff] transition-colors">
                              Cancel
                            </button>
                          </td>
                        </tr>
                      )}
                      {variants.length === 0 && !showNewVariant && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-sm font-[Manrope] text-[#7c839b]">
                            No variants yet — add sizes, colors, or other options below.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {isEdit && !showNewVariant && (
                  <button type="button" onClick={() => setShowNewVariant(true)}
                    className="mt-6 w-full py-3 border border-dashed border-[#c6c6cd] text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] hover:bg-[#eff4ff] transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span> Add New Variant
                  </button>
                )}
              </section>
            </div>

            {/* ── Right column ── */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">

              {/* Status & Organisation */}
              <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] mb-6">
                  Status & Organization
                </h3>
                <div className="space-y-5">
                  <div>
                    <label className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Product Status
                    </label>
                    <select
                      className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:border-black px-4 py-2 font-[Manrope] outline-none"
                      value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                      {STATUS_OPTS.map(s => (
                        <option key={s} value={s}>{STATUS_LABEL[s]?.label ?? s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Category <span className="text-[#ba1a1a]">*</span>
                    </label>
                    {categories.length === 0 ? (
                      <div className="text-sm text-[#7c839b] font-[Manrope]">
                        No categories yet.{" "}
                        <Link href="/categories" className="text-black underline">Create one</Link>
                      </div>
                    ) : (
                      <select
                        className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:border-black px-4 py-2 font-[Manrope] outline-none"
                        value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {form.tags.map(tag => (
                        <span key={tag} className="bg-[#e5eeff] text-[#0b1c30] px-2 py-0.5 text-xs font-[Manrope] font-medium rounded-full flex items-center gap-1">
                          {tag}
                          <button type="button" onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }))}>
                            <span className="material-symbols-outlined text-[12px] leading-none">close</span>
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-3 py-1.5 text-sm font-[Manrope] outline-none focus:border-black"
                        placeholder="Add tag..."
                        value={form.tagInput}
                        onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                      />
                      <button type="button" onClick={addTag}
                        className="px-3 py-1.5 bg-[#eff4ff] text-black text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-colors rounded-lg">
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Pricing & Stock */}
              <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] mb-6">
                  Pricing & Stock
                </h3>
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                        Price <span className="text-[#ba1a1a]">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45464d] font-[Manrope] text-sm">$</span>
                        <input
                          className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg pl-7 py-2 font-[Manrope] outline-none focus:border-black"
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                        Compare At
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#45464d] font-[Manrope] text-sm">$</span>
                        <input
                          className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg pl-7 py-2 font-[Manrope] outline-none focus:border-black"
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={form.compareAtPrice} onChange={e => setForm(f => ({ ...f, compareAtPrice: e.target.value }))} />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">
                      Inventory Policy
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, trackQuantity: !f.trackQuantity }))}
                        className={`relative w-10 h-5 rounded-full transition-colors ${form.trackQuantity ? "bg-[#006c49]" : "bg-[#c6c6cd]"}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${form.trackQuantity ? "right-0.5" : "left-0.5"}`} />
                      </button>
                      <span className="text-sm font-[Manrope] text-[#0b1c30]">
                        {form.trackQuantity ? "Track quantity" : "Don't track"}
                      </span>
                    </div>
                  </div>
                  {form.compareAtPrice && parseFloat(form.compareAtPrice) > parseFloat(form.price || "0") && (
                    <div className="p-3 bg-[#eff4ff] rounded-lg text-xs font-[Manrope] text-[#45464d]">
                      <span className="font-bold text-[#006c49]">
                        {Math.round((1 - parseFloat(form.price) / parseFloat(form.compareAtPrice)) * 100)}% off
                      </span>{" "}
                      compared to original price
                    </div>
                  )}
                </div>
              </section>

              {/* Live storefront preview */}
              <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <h3 className="text-[11px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] mb-6">
                  Live Storefront Preview
                </h3>
                {liveProductUrl ? (
                  <>
                    <div className="overflow-hidden rounded-lg border border-[#c6c6cd] bg-[#f8f9ff]">
                      <div className="flex items-center justify-between gap-3 border-b border-[#c6c6cd] bg-white px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-[Manrope] font-bold text-[#0b1c30]">{seoTitle}</p>
                          <p className="truncate text-[10px] font-[Manrope] text-[#006621]">{liveProductUrl}</p>
                        </div>
                        <a
                          href={liveProductUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="shrink-0 text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-black hover:text-[#006c49]"
                        >
                          Open live page
                        </a>
                      </div>
                      <iframe
                        src={liveProductUrl}
                        title={`Live storefront preview for ${form.name || "product"}`}
                        loading="lazy"
                        className="block h-[620px] w-full border-0 bg-white"
                      />
                    </div>
                    <p className="mt-3 text-[10px] font-[Manrope] text-[#7c839b]">
                      This is the actual storefront product page, loaded from the saved product record.
                    </p>
                  </>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#c6c6cd] bg-[#f8f9ff] px-6 py-12 text-center">
                    <span className="material-symbols-outlined mb-3 text-3xl text-[#7c839b]">visibility</span>
                    <p className="font-[Manrope] text-sm font-bold text-[#0b1c30]">Save the product to preview the live storefront page.</p>
                    <p className="mt-1 font-[Manrope] text-xs text-[#7c839b]">{seoDesc || "Your product description will appear on the live page."}</p>
                  </div>
                )}

                <button type="button" onClick={() => setShowSeoEdit(v => !v)}
                  className="mt-4 text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-black border-b border-black pb-0.5 hover:text-[#006c49] hover:border-[#006c49] transition-colors">
                  {showSeoEdit ? "Hide SEO Fields" : "Edit SEO Meta"}
                </button>

                {showSeoEdit && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-1">
                        SEO Title
                      </label>
                      <input
                        className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-black"
                        placeholder={`${form.name} | Luxe Boutique`}
                        value={form.seoTitle} onChange={e => setForm(f => ({ ...f, seoTitle: e.target.value }))} />
                    </div>
                    <div>
                      <label className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#45464d] block mb-1">
                        SEO Description
                      </label>
                      <textarea
                        className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-3 py-2 text-sm font-[Manrope] outline-none focus:border-black resize-none"
                        rows={3} placeholder="Brief description for search engines..."
                        value={form.seoDescription} onChange={e => setForm(f => ({ ...f, seoDescription: e.target.value }))} />
                      <p className="text-[10px] font-[Manrope] text-[#7c839b] mt-1">{form.seoDescription.length}/160 characters</p>
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
