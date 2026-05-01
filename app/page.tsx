"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import ProductCard from "@/components/ProductCard";
import { useEffect, useState } from "react";
import { ArrowRight, Play, Star } from "lucide-react";

export default function HomePage() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.slice(0, 4)));
  }, []);

  return (
    <div className="bg-white">
      {/* Hero Section - Dramatic Wide Layout */}
      <section className="relative h-[92vh] w-full flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop"
            alt="Editorial Luxury Hero"
            fill
            className="object-cover scale-105"
            priority
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/30" />
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
              <h1 className="text-white text-5xl md:text-8xl font-serif leading-[0.95] tracking-tight">
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

        {/* Floating Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 text-white/50">
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-white/50 to-transparent" />
        </div>
      </section>

      {/* Featured Collections Bento Grid */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 h-auto md:h-[800px]">
          {/* Main Collection */}
          <div className="md:col-span-8 relative group overflow-hidden bg-slate-50 min-h-[400px]">
            <Image 
              src="https://images.unsplash.com/photo-1441984904996-e0b6ba687e12?q=80&w=2070&auto=format&fit=crop"
              alt="Ready to Wear"
              fill
              className="object-cover transition-transform duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-500" />
            <div className="absolute bottom-12 left-12 text-white space-y-4">
              <h3 className="text-4xl font-serif italic text-white leading-none">Ready-to-Wear</h3>
              <p className="text-sm font-light tracking-wide max-w-xs">Curated essentials for the modern lifestyle, crafted from biodegradable materials.</p>
              <Link href="/products" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-white pb-1 group/btn overflow-hidden">
                <span>View All</span>
                <ArrowRight size={12} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          <div className="md:col-span-4 flex flex-col gap-8">
            {/* Accessories */}
            <div className="flex-1 relative group overflow-hidden bg-slate-100 min-h-[300px]">
              <Image 
                src="https://images.unsplash.com/photo-1549444226-9020f666f2a6?q=80&w=2072&auto=format&fit=crop"
                alt="Accessories"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/30 transition-colors" />
              <div className="absolute bottom-8 left-8 text-white">
                <h3 className="text-2xl font-serif italic mb-2">Accessories</h3>
                <Link href="/products" className="text-[10px] font-bold uppercase tracking-widest border-b border-white pb-1">Explore</Link>
              </div>
            </div>

            {/* The Lab */}
            <div className="flex-1 relative group overflow-hidden bg-slate-900 min-h-[300px]">
              <Image 
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=1974&auto=format&fit=crop"
                alt="Sustainable Footwear"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110 opacity-70 group-hover:opacity-90"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-950/40" />
              <div className="absolute inset-0 flex items-center justify-center text-center p-8 border border-white/10">
                <div className="space-y-4">
                  <span className="text-[10px] text-white/60 font-bold uppercase tracking-[0.4em]">The Innovation</span>
                  <h3 className="text-2xl font-serif text-white">Sustainable <br /> <span className="italic font-light">Footwear</span></h3>
                  <Link href="/products" className="inline-block bg-white text-slate-950 px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-transparent hover:text-white border border-white transition-all">Shop Lab</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Highlight - Curated Section */}
      <section className="bg-slate-50 py-32 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          <div className="flex flex-col md:flex-row justify-between items-end gap-8">
            <div className="space-y-4">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">Handpicked</span>
              <h2 className="text-5xl font-serif text-slate-900 leading-tight">Curated <span className="italic font-light text-slate-400">Exclusives</span></h2>
            </div>
            <p className="text-slate-500 max-w-sm text-sm font-light leading-relaxed">
              A selection of our most-coveted silhouettes, re-imagined for the current season in limited quantities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
            {products.length > 0 ? (
              products.map((product: any) => (
                <div key={product.id} className="group cursor-pointer">
                  <Link href={`/products/${product.id}`} className="block space-y-6">
                    <div className="relative aspect-[3/4] overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
                      <Image
                        src={product.imageUrl || "https://picsum.photos/seed/product/600/800"}
                        alt={product.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-900 border border-slate-200">New</div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-slate-900/90 text-white text-center">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Select Size</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">{product.category?.name || "Boutique"}</p>
                        <h3 className="text-sm font-medium text-slate-900 group-hover:text-slate-500 transition-colors uppercase tracking-wide">{product.name}</h3>
                      </div>
                      <span className="text-sm font-bold text-slate-900">${product.price.toFixed(2)}</span>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              [1,2,3,4].map(i => (
                <div key={i} className="space-y-4 animate-pulse">
                  <div className="aspect-[3/4] bg-slate-200" />
                  <div className="h-4 bg-slate-200 w-1/3" />
                  <div className="h-4 bg-slate-200 w-full" />
                </div>
              ))
            )}
          </div>

          <div className="pt-12 text-center">
            <Link href="/products" className="inline-flex items-center gap-4 group">
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] border-b border-slate-900 pb-2">Full Catalogue</span>
              <div className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <ArrowRight size={14} />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Narrative Section - Full Width Image / Text Overlap */}
      <section className="py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <div className="flex flex-col md:flex-row items-center gap-16 md:gap-0">
              <div className="w-full md:w-7/12 relative z-10">
                <div className="aspect-[16/10] relative overflow-hidden shadow-2xl">
                  <Image 
                    src="https://images.unsplash.com/photo-1445205170230-053b830c6050?q=80&w=2071&auto=format&fit=crop"
                    alt="Atelier"
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div className="w-full md:w-5/12 bg-white md:-ml-24 relative z-20 p-8 md:p-16 shadow-xl border border-slate-100">
                <div className="space-y-8">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em]">Our Ethos</span>
                  <h2 className="text-5xl font-serif text-slate-900 leading-tight">The Modern <br /><span className="italic font-light">Heritage</span></h2>
                  <p className="text-slate-600 text-sm font-light leading-relaxed">
                    Every garment tells a story of longevity. We source our textiles from heritage mills in Italy and Japan, ensuring each thread meets the highest standards of environmental stewardship.
                  </p>
                  <p className="text-slate-500 text-xs italic">
                    "Style is eternal, but our impact is what defines us."
                  </p>
                  <Link href="/about" className="inline-block text-[10px] font-bold uppercase tracking-widest border-b border-slate-900 pb-2 hover:border-slate-400 transition-colors">
                    Read the Manifesto
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter - Stripped Back Minimalist */}
      <section className="bg-slate-950 py-32 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-12">
          <div className="space-y-4">
            <span className="text-white/40 text-[10px] font-bold uppercase tracking-[0.5em]">The Newsletter</span>
            <h2 className="text-5xl font-serif leading-tight">Join the Journal</h2>
            <p className="text-white/60 text-base font-light font-serif italic">Exclusive drops, atelier stories, and cultural curation.</p>
          </div>
          
          <form className="max-w-lg mx-auto group">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-0 border-b border-white/20 focus-within:border-white transition-colors pb-2">
              <input 
                type="email" 
                placeholder="EMAIL ADDRESS" 
                className="bg-transparent border-none focus:ring-0 text-center sm:text-left text-[10px] tracking-widest w-full py-4 placeholder:text-white/30" 
              />
              <button className="text-[10px] font-bold uppercase tracking-widest whitespace-nowrap px-8 py-4 sm:py-0 hover:text-slate-400 transition-colors">
                Subscribe
              </button>
            </div>
          </form>
          
          <p className="text-[9px] text-white/30 uppercase tracking-[0.2em]">Zero noise. Pure curation.</p>
        </div>
      </section>
    </div>
  );
}
