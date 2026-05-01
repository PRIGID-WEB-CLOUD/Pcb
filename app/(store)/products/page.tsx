"use client";

import { useEffect, useState } from "react";
import ProductCard from "@/components/ProductCard";

export default function ProductsPage() {
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
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredProducts = selectedCategory === "all" 
    ? products 
    : products.filter((p: any) => p.categoryId === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <header className="mb-12 space-y-4">
        <h1 className="text-4xl font-serif text-slate-900">Collections</h1>
        <p className="text-slate-500 max-w-2xl">
          Curated seasonal essentials for the discerning modern wardrobe, blending timeless silhouettes with contemporary innovation.
        </p>
      </header>

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
  );
}
