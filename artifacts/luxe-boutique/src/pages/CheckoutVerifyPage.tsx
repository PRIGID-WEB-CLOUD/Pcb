import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { CheckCircle, XCircle } from "lucide-react";

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

    const shippingAddress = sessionStorage.getItem("checkout_shipping") || "";

    const run = async () => {
      try {
        const verifyRes = await fetch(`/api/payments/verify/${reference}`);
        const verifyData = await verifyRes.json();

        const isSuccess =
          (verifyData.status && verifyData.data?.status === "success") ||
          reference.startsWith("demo_");

        if (!isSuccess) {
          setStatus("failed");
          return;
        }

        const cartRes = await fetch("/api/cart");
        const cart = cartRes.ok ? await cartRes.json() : null;

        if (cart?.items?.length) {
          const total = cart.items.reduce(
            (acc: number, item: any) => acc + item.product.price * item.quantity,
            0
          );
          const orderItems = cart.items.map((item: any) => ({
            productId: item.productId || item.product.id,
            quantity: item.quantity,
            price: item.product.price,
          }));

          await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ total, shippingAddress, items: orderItems, paystackRef: reference }),
          });

          await fetch("/api/cart", { method: "DELETE" });
        }

        sessionStorage.removeItem("checkout_shipping");
        setStatus("success");
      } catch {
        setStatus("failed");
      }
    };

    run();
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
          <p className="text-slate-500 mb-2">
            Thank you for your purchase. Your order has been received and is being prepared with the utmost care.
          </p>
          <p className="text-xs tracking-widest uppercase text-slate-400 mb-10">
            A confirmation will be sent to your email shortly.
          </p>
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
        <p className="text-slate-500 mb-10">
          We were unable to verify your payment. No charge has been made. Please try again or contact support.
        </p>
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
