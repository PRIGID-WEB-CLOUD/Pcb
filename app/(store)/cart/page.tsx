"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, Trash2, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export default function CartPage() {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    const res = await fetch("/api/cart");
    const data = await res.json();
    setCart(data);
    setLoading(false);
  };

  useEffect(() => {
    const fetchCart = async () => {
      const res = await fetch("/api/cart");
      const data = await res.json();
      setCart(data);
      setLoading(false);
    };
    fetchCart();
  }, []);

  const refreshCart = async () => {
    const res = await fetch("/api/cart");
    const data = await res.json();
    setCart(data);
    setLoading(false);
  };

  const updateQuantity = async (productId: string, newQty: number) => {
    if (newQty < 1) return;
    await fetch(`/api/cart/${productId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: newQty }),
    });
    refreshCart();
  };

  const removeItem = async (productId: string) => {
    await fetch(`/api/cart/${productId}`, { method: "DELETE" });
    refreshCart();
  };

  const subtotal = cart?.items?.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0) || 0;

  if (loading) return <div className="max-w-7xl mx-auto px-8 py-20">Loading your bag...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 min-h-[60vh]">
      <header className="mb-12">
        <h1 className="text-5xl font-serif text-slate-900">Shopping Bag</h1>
        <p className="text-slate-500 mt-2">You have {cart?.items?.length || 0} items in your bag.</p>
      </header>

      {cart?.items?.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Cart Items */}
          <div className="lg:col-span-8 space-y-6">
            {cart.items.map((item: any) => (
              <div key={item.id} className="bg-white p-6 shadow-sm border border-slate-50 flex gap-6 rounded-lg transition-all hover:shadow-md">
                <div className="w-32 h-40 relative bg-slate-50 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={item.product.imageUrl || "https://picsum.photos/seed/product/200/300"}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 flex flex-col justify-between py-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{item.product.name}</h3>
                      <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">One Size / Standard Edition</p>
                    </div>
                    <span className="text-lg font-bold">${(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-end mt-8">
                    <div className="flex items-center border border-slate-200 rounded-full p-2 gap-4">
                      <button onClick={() => updateQuantity(item.productId, item.quantity - 1)} className="hover:text-emerald-600"><Minus size={14} /></button>
                      <span className="font-bold w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.productId, item.quantity + 1)} className="hover:text-emerald-600"><Plus size={14} /></button>
                    </div>
                    <button 
                      onClick={() => removeItem(item.productId)}
                      className="text-slate-400 hover:text-red-500 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-4">
            <div className="bg-slate-50 p-8 rounded-xl sticky top-32 space-y-8">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Order Summary</h2>
              <div className="space-y-4 border-t border-slate-200 pt-6">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest">Complimentary</span>
                </div>
                <div className="flex justify-between text-slate-600 pt-4 border-t border-slate-200">
                  <span className="text-lg font-bold text-slate-900">Total</span>
                  <span className="text-xl font-bold text-slate-900">${subtotal.toFixed(2)}</span>
                </div>
              </div>
              <Link 
                href="/checkout"
                className="w-full bg-slate-900 text-white py-5 rounded-none font-bold uppercase tracking-widest text-xs flex items-center justify-center space-x-3 hover:bg-emerald-600 transition-all"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-2xl space-y-6">
          <p className="text-slate-500 text-lg">Your bag is empty.</p>
          <Link href="/products" className="inline-block border-b-2 border-slate-900 pb-1 text-xs font-bold uppercase tracking-widest hover:text-emerald-600 hover:border-emerald-600">
            Discover the Collection
          </Link>
        </div>
      )}
    </div>
  );
}
