"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";

export default function BlogListingPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/posts")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPosts(data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching posts:", err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pt-20 pb-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="mb-20 text-center space-y-4">
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.5em]">Editorial</span>
          <h1 className="text-6xl font-serif text-slate-900 leading-tight tracking-tight">The <span className="italic font-light">Journal</span></h1>
          <p className="text-slate-500 max-w-xl mx-auto text-lg font-light leading-relaxed">
            Exploration of craft, sustainable philosophy, and the intersection of modern lifestyle and heritage.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16">
          {posts.map((post, index) => (
            <motion.article 
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group cursor-pointer"
            >
              <Link href={`/blog/${post.id}`}>
                <div className="space-y-6">
                  <div className="aspect-[4/5] relative overflow-hidden bg-slate-100">
                    {post.imageUrl ? (
                      <Image 
                        src={post.imageUrl}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-1000 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-200">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="space-y-4">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                      {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                    <h2 className="text-2xl font-serif text-slate-900 leading-snug group-hover:text-slate-600 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-slate-500 text-sm font-light leading-relaxed line-clamp-3">
                      {post.excerpt || post.content.substring(0, 150) + "..."}
                    </p>
                    <div className="pt-2">
                       <span className="inline-flex items-center gap-3 group/link">
                        <span className="text-[10px] font-bold uppercase tracking-widest border-b border-slate-900 pb-1">Read Article</span>
                        <ArrowRight size={14} className="group-hover/link:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>
        
        {posts.length === 0 && (
          <div className="text-center py-20 text-slate-400 italic">
            Gathering stories. Check back soon.
          </div>
        )}
      </div>
    </div>
  );
}
