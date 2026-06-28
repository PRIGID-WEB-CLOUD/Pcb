import { Link } from "wouter";
import { motion } from "motion/react";
import { useCurrency } from "@/contexts/CurrencyContext";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
}

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=800&auto=format&fit=crop";

export default function ProductCard({ id, name, price, imageUrl, category }: ProductCardProps) {
  const { formatPrice } = useCurrency();
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -5 }} className="group cursor-pointer">
      <Link href={`/products/${id}`} className="block space-y-6">
        <div className="relative aspect-[3/4] overflow-hidden bg-white shadow-sm ring-1 ring-slate-100">
          <img
            src={imageUrl || FALLBACK_IMAGE}
            alt={name}
            className="object-cover w-full h-full transition-transform duration-700 group-hover:scale-105"
            referrerPolicy="no-referrer"
            onError={(e) => {
              const target = e.currentTarget;
              if (target.src !== FALLBACK_IMAGE) target.src = FALLBACK_IMAGE;
            }}
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
          <span className="text-sm font-bold text-slate-900">{formatPrice(price)}</span>
        </div>
      </Link>
    </motion.div>
  );
}
