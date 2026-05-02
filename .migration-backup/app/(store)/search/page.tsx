"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import ProductCard from "@/components/ProductCard";
import { Search } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/products");
        const allProducts = await res.json();
        const filtered = allProducts.filter((p: any) => 
          p.name.toLowerCase().includes(query.toLowerCase()) || 
          p.description.toLowerCase().includes(query.toLowerCase())
        );
        setProducts(filtered);
      } catch (error) {
        console.error("Failed to fetch products for search", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (query) {
      fetchResults();
    } else {
      setTimeout(() => {
        setProducts([]);
        setLoading(false);
      }, 0);
    }
  }, [query]);

  return (
    <div className="bg-slate-50 min-h-[80vh] py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-16 text-center space-y-4">
          <h1 className="text-4xl font-serif text-slate-900 tracking-tight">Search Results</h1>
          {query ? (
            <p className="text-slate-500 font-medium tracking-wide">Showing results for <span className="text-slate-900 font-bold italic">&quot;{query}&quot;</span></p>
          ) : (
            <p className="text-slate-500 font-medium tracking-wide">Enter a search term to find products.</p>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900"></div>
          </div>
        ) : (
          <>
            {products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {products.map((product: any) => (
                  <ProductCard 
                    key={product.id}
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    imageUrl={product.imageUrl}
                    category={product.category?.name || "Boutique"}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-16 text-center space-y-6">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <Search size={32} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-serif text-slate-900">No results found</h3>
                  <p className="text-slate-500 max-w-sm mx-auto">We couldn&apos;t find any items matching your search. Try exploring our curated collections instead.</p>
                </div>
                <Link 
                  href="/products" 
                  className="inline-block bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.2em] px-10 py-4 rounded-full mt-4 hover:bg-slate-800 transition-all"
                >
                  Explore Collections
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
