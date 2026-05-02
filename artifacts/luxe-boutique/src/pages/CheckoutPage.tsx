import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Lock, ChevronLeft } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export default function CheckoutPage() {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shippingAddress, setShippingAddress] = useState("");
  const [processing, setProcessing] = useState(false);
  const { formatPrice } = useCurrency();

  useEffect(() => {
    fetch("/api/cart").then(r => r.json()).then(d => { setCart(d); setLoading(false); });
  }, []);

  const total = cart?.items?.reduce((acc: number, item: any) => acc + (item.product.price * item.quantity), 0) || 0;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress) { alert("Please enter shipping address"); return; }
    setProcessing(true);
    try {
      const initRes = await fetch("/api/payments/initialize", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, callbackUrl: `${window.location.origin}/checkout/verify` }),
      });
      const data = await initRes.json();
      if (data.status) window.location.assign(data.data.authorization_url);
    } catch { console.error("Checkout error"); } finally { setProcessing(false); }
  };

  if (loading) return <div className="max-w-7xl mx-auto px-8 py-20 text-center uppercase tracking-widest font-bold">Secure Checkout Initializing...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-12 mb-12">
          <Link href="/cart" className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors"><ChevronLeft size={16} /> Return to Bag</Link>
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
                <textarea required value={shippingAddress} onChange={e => setShippingAddress(e.target.value)} rows={4}
                  placeholder="Enter your full shipping address..." className="w-full bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all outline-none resize-none" />
              </div>
              <div className="mt-12 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">02</span>
                <h3 className="text-xl font-bold">Payment</h3>
                <Lock size={14} className="text-emerald-600 ml-2" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                <p className="text-slate-600 text-sm">You will be redirected to our secure payment gateway to complete the purchase.</p>
              </div>
              <button type="submit" disabled={processing || !cart?.items?.length} className="w-full bg-slate-900 text-white py-5 rounded-none font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50">
                <Lock size={14} />
                {processing ? "Processing..." : `Secure Checkout — ${formatPrice(total)}`}
              </button>
            </form>
          </section>
        </div>
        <div className="lg:col-span-5">
          <div className="bg-slate-50 p-8 rounded-xl sticky top-28 space-y-6">
            <h3 className="font-bold text-lg text-slate-900">Your Order</h3>
            <div className="space-y-4 divide-y divide-slate-200">
              {cart?.items?.map((item: any) => (
                <div key={item.id} className="flex gap-4 pt-4 first:pt-0">
                  <div className="w-16 h-20 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm text-slate-900">{item.product.name}</p>
                    <p className="text-xs text-slate-400 mt-1">Qty: {item.quantity}</p>
                    <p className="font-bold text-sm text-slate-900 mt-1">{formatPrice(item.product.price * item.quantity)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-200 space-y-2">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-bold">{formatPrice(total)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Shipping</span><span className="text-emerald-600 font-bold text-xs uppercase tracking-widest">Complimentary</span></div>
              <div className="flex justify-between pt-2 border-t border-slate-200"><span className="font-bold text-lg">Total</span><span className="font-bold text-lg">{formatPrice(total)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
