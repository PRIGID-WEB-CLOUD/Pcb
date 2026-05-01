"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import ProductCard from "@/components/ProductCard";
import { useEffect, useState } from "react";
import { ArrowRight, Play } from "lucide-react";

export default function HomePage() {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data.slice(0, 12));
        }
      })
      .catch((err) => console.error("Error fetching products:", err));
  }, []);

  return (
    <div className="bg-white selection:bg-slate-900 selection:text-white">
      {/* Hero Section */}
      <section className="relative h-[72vh] w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop"
            alt="Editorial Luxury Hero"
            fill
            className="object-cover object-center"
            priority
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/25" />
        </div>
        
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-6"
            >
              <span className="text-white text-[10px] md:text-xs font-bold tracking-[0.4em] uppercase block">
                The Summer Atelier 2024
              </span>
              <h1 className="text-white text-5xl md:text-7xl font-serif leading-[1.1] tracking-tight">
                Architectural <br />
                <span className="italic font-light">Elegance</span>
              </h1>
              <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-sm font-light">
                Discover our latest release: A study in precision tailoring and sustainable silk fabrics.
              </p>
              <div className="pt-4 flex flex-wrap gap-4">
                <Link 
                  href="/products" 
                  className="bg-white text-slate-900 px-10 py-5 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all duration-500"
                >
                  Explore Collection
                </Link>
                <button className="flex items-center gap-3 text-white group">
                  <div className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-slate-900 transition-all duration-500">
                    <Play size={14} fill="currentColor" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Watch Film</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Featured Collections Bento Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 bg-white">
        <div className="flex justify-between items-end mb-12">
          <div>
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-2 block">Curation</span>
            <h2 className="text-4xl font-serif text-slate-900 leading-tight">The <span className="italic font-light">Collections</span></h2>
          </div>
          <Link href="/products" className="text-[10px] font-bold uppercase tracking-widest border-b border-slate-900 pb-1">View All</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-auto md:h-[700px]">
          <Link href="/products" className="md:col-span-8 relative group overflow-hidden bg-slate-100">
            <Image 
              src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e12?q=80&w=2070&auto=format&fit=crop"
              alt="Ready to Wear"
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
            <div className="absolute bottom-10 left-10 text-white">
              <h3 className="text-3xl font-serif mb-2">Monochrome Essentials</h3>
              <span className="text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1">Explore</span>
            </div>
          </Link>
          <div className="md:col-span-4 flex flex-col gap-8">
            <Link href="/products" className="flex-1 relative group overflow-hidden bg-slate-100">
              <Image 
                src="https://images.unsplash.com/photo-1549444226-9020f666f2a6?q=80&w=2072&auto=format&fit=crop"
                alt="Accessories"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-xl font-serif mb-1">Accessories</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1">Shop</span>
              </div>
            </Link>
            <Link href="/products" className="flex-1 relative group overflow-hidden bg-slate-100">
              <Image 
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1974&auto=format&fit=crop"
                alt="Footwear"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-xl font-serif mb-1">Footwear</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1">Shop</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Latest Arrivals Carousel */}
      <section className="py-24 bg-slate-50 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="flex justify-between items-end">
            <div className="space-y-4">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">New In</span>
              <h2 className="text-4xl font-serif text-slate-900">Latest Arrivals</h2>
            </div>
            <div className="flex gap-2">
               <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-colors group">
                  <ArrowRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
               </button>
               <button className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-white transition-colors group">
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>
          </div>

          <div className="flex gap-8 overflow-x-auto pb-8 snap-x no-scrollbar">
            {products.length > 0 ? (
              products.slice(0, 6).map((product: any) => (
                <div key={product.id} className="min-w-[300px] md:min-w-[350px] snap-start">
                  <ProductCard 
                    id={product.id}
                    name={product.name}
                    price={product.price}
                    imageUrl={product.imageUrl}
                    category={product.category?.name || "Boutique"}
                  />
                </div>
              ))
            ) : (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="min-w-[300px] aspect-[3/4] bg-slate-200 animate-pulse rounded-lg" />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Trending Now Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
          <div className="text-center space-y-4">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.6em]">Most Wanted</span>
            <h2 className="text-5xl font-serif text-slate-900 leading-tight tracking-tight">Trending <span className="italic font-light text-slate-400 text-6xl">Now</span></h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
            {products.length > 6 ? (
              products.slice(6, 10).map((product: any) => (
                <ProductCard 
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  price={product.price}
                  imageUrl={product.imageUrl}
                  category={product.category?.name || "Collection"}
                />
              ))
            ) : (
              [1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-6 animate-pulse">
                  <div className="aspect-[3/4] bg-slate-100" />
                  <div className="h-4 bg-slate-100 w-3/4" />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Editorial / Blog Section */}
      <section className="py-32 overflow-hidden bg-slate-50 border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
          <div className="relative">
            <div className="aspect-[3/4] md:aspect-square relative overflow-hidden shadow-2xl">
              <Image 
                src="https://images.unsplash.com/photo-1445205170230-053b830c6050?q=80&w=2071&auto=format&fit=crop"
                alt="Atelier Narrative"
                fill
                className="object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <motion.div 
              initial={{ x: 50, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="absolute -bottom-12 -right-12 bg-slate-900 p-12 hidden lg:block max-w-sm shadow-2xl"
            >
              <p className="text-white font-serif text-2xl italic leading-snug mb-6">&ldquo;Sustainability isn&apos;t a trend, it&apos;s our heritage and future.&rdquo;</p>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">— Elena Rossi, Creative Director</p>
            </motion.div>
          </div>
          <div className="space-y-10">
            <div className="space-y-4">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.5em]">The Journal</span>
              <h2 className="text-5xl font-serif text-slate-900 leading-[1.1] tracking-tight">The Modern <br /><span className="italic font-light">Heritage</span></h2>
            </div>
            <p className="text-slate-600 text-lg font-light leading-relaxed">
              Every garment tells a story of longevity. We source our textiles from heritage mills in Italy and Japan, ensuring each thread meets the highest standards of environmental stewardship and timeless design.
            </p>
            <div className="pt-4">
               <Link href="/products" className="inline-flex items-center gap-4 group">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] border-b border-slate-900 pb-2">Read the Manifesto</span>
                <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                  <ArrowRight size={14} />
                </div>
              </Link>
            </div>
            
            <div className="pt-12 border-t border-slate-100">
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] mb-4">Join our list</p>
               <form className="flex border-b border-slate-300 focus-within:border-slate-900 transition-colors pb-2">
                  <input 
                    type="email" 
                    placeholder="EMAIL ADDRESS" 
                    className="bg-transparent border-none focus:ring-0 text-[10px] tracking-widest w-full py-2 placeholder:text-slate-300"
                  />
                  <button className="text-[10px] font-bold uppercase tracking-widest px-4 hover:text-slate-500 transition-colors">Join</button>
               </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

