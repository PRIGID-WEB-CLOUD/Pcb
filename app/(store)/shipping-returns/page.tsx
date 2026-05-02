"use client";

import { motion } from "motion/react";

export default function ShippingReturnsPage() {
  const sections = [
    {
      title: "Complimentary Shipping",
      content: "Luxe Boutique offers complimentary express shipping on all orders over $500. For orders below this threshold, a flat rate of $25 applies for standard delivery and $45 for priority express."
    },
    {
      title: "Global Distribution",
      content: "We deliver to over 150 countries worldwide. Our logistics partners include DHL Express and FedEx Priority to ensure your purchase arrives in perfect architectural condition."
    },
    {
      title: "Concierge Returns",
      content: "If your selection does not perfectly align with your expectations, we offer a 14-day return period. Items must be in original, unworn condition with all security tags intact. We provide collection services for our premium members."
    },
    {
      title: "Exchanges",
      content: "To facilitate a seamless experience, we offer one complimentary exchange per order for size or color variations within the same silhouette."
    }
  ];

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-slate-50 py-32 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 block mb-6">Logistics & Service</span>
            <h1 className="text-5xl font-serif text-slate-900 leading-tight">Shipping <br /><span className="italic font-light">&amp; Returns</span></h1>
            <p className="mt-8 text-slate-500 font-medium max-w-xl text-sm leading-relaxed uppercase tracking-widest">
              ENSURING THE INTEGRITY OF YOUR COLLECTION FROM OUR ATELIER TO YOUR DOORSTEP.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24">
            {sections.map((section, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="space-y-6"
              >
                <h3 className="text-xl font-serif text-slate-900">{section.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm">
                  {section.content}
                </p>
              </motion.div>
            ))}
          </div>

          <div className="mt-32 p-12 bg-slate-900 rounded-[2rem] text-white flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-lg">
              <h4 className="text-2xl font-serif mb-4">Request a Return</h4>
              <p className="text-white/60 text-sm leading-relaxed">Our automated portal will guide you through the return process. For complex requests or multiple items, our concierge team is available.</p>
            </div>
            <button className="bg-white text-slate-900 text-[10px] font-bold uppercase tracking-[0.3em] px-12 py-5 rounded-full hover:bg-slate-100 transition-all font-serif italic">
              Access Portal
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
