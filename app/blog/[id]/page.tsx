"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, User, Calendar, Clock } from "lucide-react";
import ReactMarkdown from "react-markdown";

export default function BlogDetailPage() {
  const { id } = useParams();
  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    fetch(`/api/posts/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setPost(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching post:", err);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (!post || post.error) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-8">
        <h1 className="text-4xl font-serif text-slate-900">Article not found</h1>
        <Link href="/blog" className="text-[10px] font-bold uppercase tracking-widest border-b border-slate-900 pb-2">
          Back to Journal
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen pb-32">
      {/* Article Hero */}
      <header className="relative h-[70vh] w-full bg-slate-100 overflow-hidden">
        {post.imageUrl ? (
          <Image 
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900">
             <h1 className="text-white font-serif text-4xl opacity-20">The Journal</h1>
          </div>
        )}
        <div className="absolute inset-0 bg-black/30" />
        
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
             <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
             >
                <Link href="/blog" className="inline-flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-8 text-[10px] font-bold uppercase tracking-[0.4em]">
                  <ArrowLeft size={14} />
                  Journal
                </Link>
                <h1 className="text-4xl md:text-6xl text-white font-serif leading-[1.1] tracking-tight mb-8">
                  {post.title}
                </h1>
                <div className="flex items-center justify-center gap-8 text-white/80 text-[10px] font-bold uppercase tracking-[0.4em]">
                  <span className="flex items-center gap-2">
                    <User size={12} />
                    {post.author}
                  </span>
                  <span className="flex items-center gap-2">
                    <Calendar size={12} />
                    {new Date(post.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span className="flex items-center gap-2">
                    <Clock size={12} />
                    5 min read
                  </span>
                </div>
             </motion.div>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="max-w-3xl mx-auto px-4 pt-20">
        <div className="markdown-body prose prose-slate prose-lg lg:prose-xl max-w-none prose-headings:font-serif prose-headings:font-normal prose-headings:text-slate-900 prose-p:font-light prose-p:text-slate-600 prose-p:leading-relaxed">
          <ReactMarkdown>{post.content}</ReactMarkdown>
        </div>

        <div className="mt-20 pt-12 border-t border-slate-100">
          <div className="flex flex-col items-center text-center space-y-6">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Share this story</span>
            <div className="flex gap-8">
              {['Facebook', 'Twitter', 'Pinterest', 'Email'].map((platform) => (
                <button key={platform} className="text-[10px] font-bold uppercase tracking-widest text-slate-900 hover:text-slate-400 transition-colors">
                  {platform}
                </button>
              ))}
            </div>
            <Link href="/blog" className="mt-12 inline-block text-[10px] font-bold uppercase tracking-widest border border-slate-900 px-8 py-4 hover:bg-slate-900 hover:text-white transition-all">
              Return to Journal
            </Link>
          </div>
        </div>
      </article>

      {/* Related Reading Suggestion (Static Placeholder for now or could fetch more) */}
      <section className="mt-40 bg-slate-50 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
            <h2 className="text-4xl font-serif text-slate-900 leading-tight">Related <span className="italic font-light">Reading</span></h2>
            <Link href="/blog" className="text-[10px] font-bold uppercase tracking-widest border-b border-slate-900 pb-1">View Journal</Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
            {/* These could be dynamic but leaving as polished placeholders for the detail view experience */}
            <div className="space-y-6 group cursor-pointer">
              <div className="aspect-video relative overflow-hidden bg-white">
                <Image 
                  src="https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=2070&auto=format&fit=crop"
                  alt="Craft"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
              <div className="space-y-4">
                 <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Craftsmanship</span>
                 <h3 className="text-2xl font-serif">The Loom and the Legacy</h3>
                 <p className="text-slate-500 text-sm font-light leading-relaxed">Understanding the heritage mills of Biella and the future of fine wool production.</p>
              </div>
            </div>
            <div className="space-y-6 group cursor-pointer">
               <div className="aspect-video relative overflow-hidden bg-white">
                <Image 
                  src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=2070&auto=format&fit=crop"
                  alt="Minimalism"
                  fill
                  className="object-cover transition-transform duration-1000 group-hover:scale-105"
                />
              </div>
              <div className="space-y-4">
                 <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Minimalism</span>
                 <h3 className="text-2xl font-serif">A Study in Silence</h3>
                 <p className="text-slate-500 text-sm font-light leading-relaxed">Why the modern wardrobe is moving towards quiet luxury and lasting impact.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
