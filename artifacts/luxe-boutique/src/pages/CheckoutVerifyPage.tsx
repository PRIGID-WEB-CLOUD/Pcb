import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, XCircle } from "lucide-react";
import { Link } from "wouter";

export default function CheckoutVerifyPage() {
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get("reference") || params.get("trxref");

    if (!reference) {
      setStatus("failed");
      return;
    }

    fetch(`/api/payments/verify/${reference}`)
      .then(r => r.json())
      .then(async data => {
        if (data.status && (data.data?.status === "success" || reference.startsWith("demo_"))) {
          await fetch("/api/cart", { method: "DELETE" }).catch(() => {});
          setStatus("success");
        } else {
          setStatus("failed");
        }
      })
      .catch(() => setStatus("failed"));
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto mb-6" />
          <p className="text-xs tracking-widest uppercase text-slate-400">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle className="mx-auto text-emerald-600 mb-6" size={56} />
          <h1 className="font-serif text-4xl text-slate-900 mb-3">Order Confirmed</h1>
          <p className="text-slate-500 mb-2">Thank you for your purchase. Your order has been received and is being prepared with the utmost care.</p>
          <p className="text-xs tracking-widest uppercase text-slate-400 mb-10">A confirmation will be sent to your email shortly.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/account/orders">
              <button className="px-8 py-4 bg-slate-900 text-white text-xs tracking-widest uppercase font-bold hover:bg-emerald-700 transition-colors">
                View Orders
              </button>
            </Link>
            <Link href="/products">
              <button className="px-8 py-4 border border-slate-200 text-xs tracking-widest uppercase font-bold hover:bg-slate-50 transition-colors">
                Continue Shopping
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <XCircle className="mx-auto text-red-500 mb-6" size={56} />
        <h1 className="font-serif text-4xl text-slate-900 mb-3">Payment Failed</h1>
        <p className="text-slate-500 mb-10">We were unable to verify your payment. No charge has been made. Please try again or contact support.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/checkout">
            <button className="px-8 py-4 bg-slate-900 text-white text-xs tracking-widest uppercase font-bold hover:bg-emerald-700 transition-colors">
              Try Again
            </button>
          </Link>
          <Link href="/contact">
            <button className="px-8 py-4 border border-slate-200 text-xs tracking-widest uppercase font-bold hover:bg-slate-50 transition-colors">
              Contact Support
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
