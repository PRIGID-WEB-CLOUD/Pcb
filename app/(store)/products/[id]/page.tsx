"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "motion/react";
import { ChevronRight, Minus, Plus, ShoppingBag } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCurrency } from "@/components/CurrencyContext";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { formatPrice } = useCurrency();
  const [product, setProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetch(`/api/products/${id}`)
      .then(res => res.json())
      .then(data => {
        setProduct(data);
        setLoading(false);
      });
  }, [id]);

  const addToCart = async () => {
    if (!session) {
      router.push("/login");
      return;
    }

    setAddingToCart(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id, quantity }),
      });
      if (res.ok) {
        router.push("/cart");
      }
    } catch (error) {
      console.error("Cart error:", error);
    } finally {
      setAddingToCart(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-8 py-20">Loading...</div>;
  if (!product) return <div className="max-w-7xl mx-auto px-8 py-20 text-center">Product not found</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
      <nav className="mb-12">
        <ol className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <li><Link href="/">Home</Link></li>
          <li><ChevronRight size={12} /></li>
          <li><Link href="/products">Collections</Link></li>
          <li><ChevronRight size={12} /></li>
          <li className="text-slate-900">{product.name}</li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7">
          <div className="aspect-[3/4] relative bg-slate-50 overflow-hidden rounded-xl shadow-sm">
            <Image
              src={product.imageUrl || "https://picsum.photos/seed/product/800/1000"}
              alt={product.name}
              fill
              className="object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        <div className="lg:col-span-5 space-y-10">
          <header className="space-y-4">
            <span className="text-emerald-600 text-xs font-bold tracking-[0.2em] uppercase">
              {product.category?.name || "Exclusive Edition"}
            </span>
            <h1 className="text-5xl font-serif text-slate-900">{product.name}</h1>
            <p className="text-2xl text-slate-900">{formatPrice(product.price)}</p>
          </header>

          <p className="text-slate-600 text-base leading-relaxed">
            {product.description}
          </p>

          <div className="space-y-6 pt-6 border-t border-slate-100">
            <div className="flex items-center space-x-6">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-900">Quantity</span>
              <div className="flex items-center border border-slate-200 rounded-lg p-2 gap-4">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-1 hover:text-emerald-600"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-bold">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-1 hover:text-emerald-600"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <button 
              onClick={addToCart}
              disabled={addingToCart}
              className="w-full bg-slate-900 text-white py-5 rounded-none font-bold uppercase tracking-widest text-xs flex items-center justify-center space-x-3 hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-300"
            >
              <ShoppingBag size={18} />
              <span>{addingToCart ? "Adding..." : "Add to Bag"}</span>
            </button>
          </div>

          <div className="pt-10 space-y-6">
             <div className="flex items-center space-x-4 text-slate-500">
               <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                  <Image src="https://picsum.photos/seed/truck/40/40" width={20} height={20} alt="truck" />
               </div>
               <span className="text-xs uppercase tracking-widest font-semibold text-slate-900">Complimentary Global Express Shipping</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
