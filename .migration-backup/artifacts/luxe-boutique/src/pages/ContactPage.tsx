import { motion } from "motion/react";
import { Mail, Phone, MapPin } from "lucide-react";

export default function ContactPage() {
  const offices = [
    { city: "London", address: "124 Savile Row, Mayfair, London, W1S 3PR", phone: "+44 20 7946 0128", email: "london@luxeboutique.com" },
    { city: "Paris", address: "Place Vendôme, 75001 Paris, France", phone: "+33 1 42 61 57 28", email: "paris@luxeboutique.com" },
  ];
  return (
    <div className="bg-white min-h-screen">
      <section className="bg-slate-50 py-32 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 block mb-6">Inquiry & Connection</span>
            <h1 className="text-5xl font-serif text-slate-900 leading-tight mb-8">Contact <br /><span className="italic font-light">The Atelier</span></h1>
            <p className="text-slate-500 font-medium max-w-xl text-sm leading-relaxed uppercase tracking-widest mx-auto">OUR CONCIERGE TEAM IS AVAILABLE FOR PERSONALIZED ADVICE AND PRIVATE APPOINTMENTS.</p>
          </motion.div>
        </div>
      </section>
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="space-y-12">
              <div className="space-y-4">
                <h2 className="text-3xl font-serif text-slate-900">Send a Message</h2>
                <p className="text-slate-500 text-sm">Please provide your details. We typically respond within 24 operational hours.</p>
              </div>
              <form className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Full Name</label><input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all" placeholder="Enter your name" /></div>
                  <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Email</label><input type="email" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all" placeholder="Enter your email" /></div>
                </div>
                <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Subject</label><input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all" placeholder="Nature of inquiry" /></div>
                <div className="space-y-2"><label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block">Message</label><textarea rows={5} className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all resize-none" placeholder="Your message..." /></div>
                <button type="submit" className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.3em] px-12 py-5 rounded-full hover:bg-emerald-600 transition-all shadow-lg">Send Inquiry</button>
              </form>
            </motion.div>
            <div className="space-y-12">
              {offices.map((office, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="bg-slate-50 p-10 rounded-3xl space-y-6">
                  <h3 className="text-2xl font-serif text-slate-900">{office.city}</h3>
                  <div className="space-y-4 text-sm text-slate-500">
                    <div className="flex items-start gap-4"><MapPin size={16} className="mt-0.5 flex-shrink-0" /><span>{office.address}</span></div>
                    <div className="flex items-center gap-4"><Phone size={16} /><span>{office.phone}</span></div>
                    <div className="flex items-center gap-4"><Mail size={16} /><a href={`mailto:${office.email}`} className="hover:text-slate-900 transition-colors">{office.email}</a></div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
