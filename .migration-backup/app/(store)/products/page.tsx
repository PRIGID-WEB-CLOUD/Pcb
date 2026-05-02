"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import ProductCard from "@/components/ProductCard";

function ProductsContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [resProducts, resCategories] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories")
      ]);
      const productsData = await resProducts.json();
      const categoriesData = await resCategories.json();
      setProducts(productsData);
      setCategories(categoriesData);
      
      if (categoryParam) {
        // Find category by ID or name
        const found = categoriesData.find((c: any) => 
          c.id === categoryParam || c.name.toLowerCase() === categoryParam.toLowerCase()
        );
        if (found) setSelectedCategory(found.id);
      }
      
      setLoading(false);
    };
    fetchData();
  }, [categoryParam]);

  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter((p: any) => p.categoryId === selectedCategory);

  return (
    <div className="bg-white min-h-screen">
      {/* Hero Header */}
      <section className="relative h-[45vh] w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=2070&auto=format&fit=crop"
            alt="Collection Hero"
            fill
            className="object-cover object-center"
            priority
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-2xl space-y-4 text-white"
          >
            <span className="text-[10px] font-bold tracking-[0.4em] uppercase block">
              The Collection
            </span>
            <h1 className="text-5xl md:text-7xl font-serif leading-[1.1] tracking-tight">
              Curated <br />
              <span className="italic font-light">Essentials</span>
            </h1>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

      <div className="flex flex-col md:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-8">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-4 mb-6">Categories</h3>
            <ul className="space-y-4 text-sm">
              <li>
                <button 
                  onClick={() => setSelectedCategory("all")}
                  className={`w-full text-left transition-colors ${selectedCategory === "all" ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"}`}
                >
                  All New Arrivals
                </button>
              </li>
              {categories.map((category: any) => (
                <li key={category.id}>
                  <button 
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left transition-colors ${selectedCategory === category.id ? "text-slate-900 font-bold" : "text-slate-500 hover:text-slate-900"}`}
                  >
                    {category.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Product Grid */}
        <main className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-4 animate-pulse">
                  <div className="aspect-[3/4] bg-slate-50 rounded-lg"></div>
                  <div className="h-4 bg-slate-100 w-1/2"></div>
                  <div className="h-4 bg-slate-100 w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredProducts.map((product: any) => (
                <ProductCard 
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  imageUrl={product.imageUrl}
                  category={product.category?.name || "Uncategorized"}
                />
              ))}
            </div>
          )}

          {!loading && filteredProducts.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-lg">
              <p className="text-slate-500">No products found in this category.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
