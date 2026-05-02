"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const reference = searchParams.get("reference");

  useEffect(() => {
    if (!reference) return;

    const verify = async () => {
      try {
        const res = await fetch(`/api/payments/verify?reference=${reference}`);
        const data = await res.json();

        if (data.status && data.data.status === "success") {
          // Fetch current cart to create order
          const cartRes = await fetch("/api/cart");
          const cartData = await cartRes.json();

          // Create order
          const orderRes = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shippingAddress: "Handled in Checkout Session", // Simplified
              items: cartData.items.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.product.price
              })),
              total: data.data.amount / 100,
              paymentId: reference
            })
          });

          if (orderRes.ok) {
            setStatus("success");
          } else {
            setStatus("error");
          }
        } else {
          setStatus("error");
        }
      } catch (error) {
        setStatus("error");
      }
    };

    verify();
  }, [reference]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-8">
      {status === "loading" && (
        <>
          <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-serif">Verifying Payment</h1>
            <p className="text-slate-500">Please do not close this window.</p>
          </div>
        </>
      )}

      {status === "success" && (
        <div className="text-center space-y-6">
          <CheckCircle className="w-20 h-20 text-emerald-600 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-4xl font-serif text-slate-900">Payment Successful</h1>
            <p className="text-slate-500">Thank you for your acquisition. Your order is being curated.</p>
          </div>
          <Link href="/" className="inline-block bg-slate-900 text-white px-10 py-4 font-bold uppercase tracking-widest text-xs rounded-lg mt-8">
             Return to Boutique
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="text-center space-y-6">
          <XCircle className="w-20 h-20 text-red-500 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-4xl font-serif text-slate-900">Payment Failed</h1>
            <p className="text-slate-500">We were unable to verify your transaction. Please contact support.</p>
          </div>
          <Link href="/checkout" className="inline-block border-2 border-slate-900 px-10 py-4 font-bold uppercase tracking-widest text-xs rounded-lg mt-8">
             Try Again
          </Link>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div>Loading verification...</div>}>
      <VerifyContent />
    </Suspense>
  );
}
