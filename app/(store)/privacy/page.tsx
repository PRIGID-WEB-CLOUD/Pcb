"use client";

import { motion } from "motion/react";

export default function PrivacyPage() {
  const policies = [
    {
      title: "Data Stewardship",
      content: "Luxe Boutique respects the sanctity of your private data. We collect information only as necessary to provide our bespoke services, including transaction processing, personalized styling invitations, and order logistics."
    },
    {
      title: "Security Infrastructure",
      content: "All sensitive data is protected via 256-bit SSL encryption. Payment information is processed through PCI DSS compliant gateways like Paystack, ensuring that full credit card details are never stored on our operational servers."
    },
    {
      title: "Cookies & Experience",
      content: "We utilize precise cryptographic identifiers to maintain your high-fashion preferences, bag persistence, and secure session management. You retain absolute control over these identifiers through your browser configuration."
    },
    {
      title: "Third-Party Disclosure",
      content: "We do not engage in the commercial exchange of user datasets. Information is only shared with trusted logistics and payment partners strictly for the facilitation of your purchase completion."
    },
    {
      title: "Your Rights",
      content: "In alignment with global privacy standards, you maintain the right to access, rectify, or request the erasure of your personal records from our database at any moment through your account dashboard or concierge request."
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
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 block mb-6">Legal & Governance</span>
            <h1 className="text-5xl font-serif text-slate-900 leading-tight">Privacy <br /><span className="italic font-light">Architecture</span></h1>
            <p className="mt-8 text-slate-500 font-medium max-w-xl text-sm leading-relaxed uppercase tracking-widest">
              OUR COMMITMENT TO DATA INTEGRITY AND USER ANONYMITY WITHIN THE DIGITAL ATELIER.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-24">
            {policies.map((policy, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-12"
              >
                <div className="md:col-span-1 border-l-2 border-slate-900 pl-8 h-fit">
                  <h3 className="text-xs font-bold uppercase tracking-[0.4em] text-slate-900 leading-none py-2">{policy.title}</h3>
                </div>
                <div className="md:col-span-2">
                  <p className="text-slate-500 leading-relaxed text-sm font-light">
                    {policy.content}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-32 pt-16 border-t border-slate-100 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-4">Last Updated: October 2024</p>
            <p className="text-slate-500 text-xs italic">For specialized legal consultation regarding your data, please contact legal@luxeboutique.com</p>
          </div>
        </div>
      </section>
    </div>
  );
}
