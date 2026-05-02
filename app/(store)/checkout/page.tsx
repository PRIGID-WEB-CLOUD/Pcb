"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Lock, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useCurrency } from "@/components/CurrencyContext";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState("");
  const [processing, setProcessing] = useState(false);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    fetch("/api/cart")
      .then(res => res.json())
      .then(data => {
        setCart(data);
        setLoading(false);
      });
  }, []);

  const total = cart?.items?.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0) || 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress) return alert("Please enter shipping address");

    setProcessing(true);
    try {
      const initRes = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: total,
          callbackUrl: `${window.location.origin}/checkout/verify` 
        }),
      });
      const data = await initRes.json();
      
      if (data.status) {
        // In a real app we'd save the order in PENDING state first
        window.location.assign(data.data.authorization_url);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-8 py-20 text-center uppercase tracking-widest font-bold">Secure Checkout Initializing...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-12 mb-12">
           <Link href="/cart" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronLeft size={16} /> Return to Bag
           </Link>
           <h1 className="text-4xl font-serif text-slate-900 mt-8">Checkout</h1>
        </div>

        <div className="lg:col-span-7 space-y-12">
          <section className="space-y-8">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">01</span>
              <h3 className="text-xl font-bold">Shipping Information</h3>
            </div>
            
            <form onSubmit={handleCheckout} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Shipping Address</label>
                <textarea 
                  required
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full bg-slate-50 border-none focus:ring-1 focus:ring-slate-900 p-4 h-32 text-sm rounded-lg"
                  placeholder="Street, City, State, Country, Zip Code"
                />
              </div>

              <div className="pt-8 space-y-8">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">02</span>
                  <h3 className="text-xl font-bold">Payment Method</h3>
                </div>
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <Image src="https://picsum.photos/seed/cards/60/40" width={40} height={25} alt="cards" />
                      <span className="font-bold text-sm">Pay securely with Paystack</span>
                   </div>
                   <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      <Lock size={12} /> Encrypted
                   </div>
                </div>
              </div>

              <button 
                type="submit"
                disabled={processing || total === 0}
                className="w-full bg-slate-900 text-white py-5 rounded-none font-bold uppercase tracking-widest text-xs flex items-center justify-center space-x-3 hover:bg-emerald-600 transition-all shadow-xl disabled:bg-slate-300"
              >
                {processing ? "Processing..." : `Pay ${formatPrice(total)} Now`}
              </button>
            </form>
          </section>
        </div>

        <div className="lg:col-span-5">
           <div className="bg-slate-50 p-8 rounded-xl space-y-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Order Summary</h2>
              <div className="space-y-6 max-h-96 overflow-y-auto pr-2">
                {cart?.items?.map((item: any) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-20 h-24 relative bg-white flex-shrink-0 rounded shadow-sm overflow-hidden border border-slate-100">
                      <Image
                        src={item.product.imageUrl || "https://picsum.photos/seed/p/100/150"}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="flex-1 flex flex-col justify-center py-1">
                      <h4 className="font-bold text-sm">{item.product.name}</h4>
                      <p className="text-xs text-slate-500 mt-1">Qty: {item.quantity}</p>
                      <p className="font-bold text-xs mt-2 text-emerald-600">{formatPrice(item.product.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="pt-8 border-t border-slate-200 space-y-4">
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Subtotal</span>
                    <span className="font-bold">{formatPrice(total)}</span>
                 </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-slate-500 uppercase tracking-widest text-[10px] font-bold">Shipping</span>
                    <span className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest">Free</span>
                 </div>
                 <div className="flex justify-between items-end pt-4 border-t border-slate-200">
                    <span className="text-lg font-bold">Total</span>
                    <span className="text-2xl font-bold text-slate-900">{formatPrice(total)}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
