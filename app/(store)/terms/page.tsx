"use client";

import { motion } from "motion/react";

export default function TermsPage() {
  const terms = [
    {
      title: "Service Paradigm",
      content: "Luxe Boutique provides a curated digital atelier for the acquisition of premium apparel. By engaging with our platform, you acknowledge your intent to interact with a high-fidelity commerce environment governed by architectural precision."
    },
    {
      title: "Intellectual Integrity",
      content: "All visual elements, silhouettes, and textual narratives displayed within this digital storefront are the exclusive property of Luxe Boutique. Reproduction or unauthorized digital extraction for commercial repurposing is strictly prohibited."
    },
    {
      title: "Purchase Governance",
      content: "Transactions are finalized upon receipt of payment confirmation from our secure processing partners. We reserve the right to decline order fulfillment in instances of anomalous inventory shifts or suspected identity discrepancy."
    },
    {
      title: "Liability & Limitations",
      content: "While we strive for absolute accuracy in digital representation, minor variations in material texture or pigment may occur. Our liability is restricted solely to the total transaction value of the acquired garment."
    },
    {
      title: "Governing Law",
      content: "These conditions are governed by the laws of the United Kingdom. Any legal discourse arising from the use of this atelier shall be addressed within the jurisdiction of London courts."
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
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 block mb-6">Foundational & Legal</span>
            <h1 className="text-5xl font-serif text-slate-900 leading-tight">Terms <br /><span className="italic font-light">of Service</span></h1>
            <p className="mt-8 text-slate-500 font-medium max-w-xl text-sm leading-relaxed uppercase tracking-widest">
              THE STRUCTURAL COVENANT BETWEEN THE ATELIER AND THE CURATED CLIENTELE.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-24">
            {terms.map((term, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-12"
              >
                <div className="md:col-span-1 border-l-2 border-slate-900 pl-8 h-fit">
                  <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-slate-900 leading-none py-2">{term.title}</h3>
                </div>
                <div className="md:col-span-2">
                  <p className="text-slate-500 leading-relaxed text-sm font-light">
                    {term.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-32 pt-16 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Effective Date: October 18, 2024</p>
            <p className="text-slate-500 text-xs italic">For comprehensive legal documentation or dispute resolution, contact legal@luxeboutique.com</p>
          </div>
        </div>
      </section>
    </div>
  );
}
