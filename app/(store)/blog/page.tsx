"use client";

import { motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function BlogPage() {
  const posts = [
    {
      id: 1,
      category: "Editorial",
      title: "The Architecture of Modern Silhouettes",
      excerpt: "Exploring the intersection of structural engineering and high-fashion tailoring in our latest collection.",
      image: "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1936&auto=format&fit=crop",
      date: "OCT 12, 2024",
      author: "ALEXANDER THORNE"
    },
    {
      id: 2,
      category: "Heritage",
      title: "Decades of Precision: The Savile Row Legacy",
      excerpt: "Transcending time with techniques passed down through generations of master artisans.",
      image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=2071&auto=format&fit=crop",
      date: "SEP 28, 2024",
      author: "ELIZA VANCE"
    },
    {
      id: 3,
      category: "Sustainability",
      title: "The Future is Slow: Conscious Luxury",
      excerpt: "Why we choose to produce restricted quantities in a world of fast-moving trends.",
      image: "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=2013&auto=format&fit=crop",
      date: "SEP 15, 2024",
      author: "MARCUS REED"
    }
  ];

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-slate-50 py-32 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 block mb-6">The Journal</span>
            <h1 className="text-5xl md:text-7xl font-serif text-slate-900 leading-tight mb-8 italic">Editorial <br /><span className="not-italic font-light">Perspectives</span></h1>
            <p className="text-slate-500 font-medium max-w-xl text-xs leading-relaxed uppercase tracking-[0.3em] mx-auto">
              A CURATED DIARY OF STYLE, ARCHITECTURE, AND THE ART OF LIVING WELL.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-32">
            {posts.map((post, idx) => (
              <motion.article 
                key={post.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`flex flex-col ${idx % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-16 items-center`}
              >
                <div className="w-full lg:w-1/2">
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[2.5rem] shadow-2xl group">
                    <Image 
                      src={post.image}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-[1.5s] ease-out"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>
                <div className="w-full lg:w-1/2 space-y-8">
                  <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">
                    <span>{post.category}</span>
                    <span className="h-px w-8 bg-slate-200"></span>
                    <span>{post.date}</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-serif text-slate-900 leading-tight">{post.title}</h2>
                  <p className="text-slate-500 text-sm leading-relaxed font-light max-w-lg">
                    {post.excerpt}
                  </p>
                  <div className="pt-4">
                    <button className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-900 flex items-center gap-4 group">
                      Read Full Narrative
                      <div className="h-10 w-10 border border-slate-200 rounded-full flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all">
                        <ArrowRight size={14} />
                      </div>
                    </button>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>

          <div className="mt-32 text-center">
            <button className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.4em] px-16 py-6 rounded-full hover:bg-slate-800 hover:scale-105 transition-all shadow-2xl shadow-slate-200">
              Explore All Entries
            </button>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="bg-slate-50 py-24 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="max-w-2xl mx-auto space-y-8">
            <h3 className="text-2xl font-serif text-slate-900">Subscribe for Priority <span className="italic">Insights</span></h3>
            <p className="text-slate-500 text-xs uppercase tracking-widest leading-loose">JOIN OUR PRIVATE LIST FOR EXCLUSIVE EDITORIAL CONTENT AND EARLY ACCESS TO NEW ARRIVALS.</p>
            <form className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto pt-4">
              <input 
                type="email" 
                placeholder="EMAIL ADDRESS" 
                className="flex-1 bg-white border border-slate-100 rounded-full px-8 py-5 text-[10px] font-bold tracking-widest focus:ring-1 focus:ring-slate-900 transition-all outline-none"
              />
              <button className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.3em] px-10 py-5 rounded-full hover:bg-slate-800 transition-all">
                Join
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
