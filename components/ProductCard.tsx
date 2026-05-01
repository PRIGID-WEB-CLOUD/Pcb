"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
}

export default function ProductCard({ id, name, price, imageUrl, category }: ProductCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="group cursor-pointer"
    >
      <Link href={`/products/${id}`} className="block space-y-6">
        <div className="relative aspect-[3/4] overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
          <Image
            src={imageUrl || "https://picsum.photos/seed/product/600/800"}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-900 border border-slate-200">
            Exclusive
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 bg-slate-900/90 text-white text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest">Discover More</span>
          </div>
        </div>
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-slate-400">{category}</p>
            <h3 className="text-sm font-medium text-slate-900 group-hover:text-slate-500 transition-colors uppercase tracking-wide truncate max-w-[180px]">{name}</h3>
          </div>
          <span className="text-sm font-bold text-slate-900">${price.toFixed(2)}</span>
        </div>
      </Link>
    </motion.div>
  );
}
