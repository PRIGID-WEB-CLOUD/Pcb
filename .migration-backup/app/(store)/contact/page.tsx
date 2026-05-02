"use client";

import { motion } from "motion/react";
import { Mail, Phone, MapPin, Globe } from "lucide-react";

export default function ContactPage() {
  const offices = [
    {
      city: "London",
      address: "124 Savile Row, Mayfair, London, W1S 3PR",
      phone: "+44 20 7946 0128",
      email: "london@luxeboutique.com"
    },
    {
      city: "Paris",
      address: "Place Vendôme, 75001 Paris, France",
      phone: "+33 1 42 61 57 28",
      email: "paris@luxeboutique.com"
    }
  ];

  return (
    <div className="bg-white min-h-screen">
      <section className="bg-slate-50 py-32 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-400 block mb-6">Inquiry & Connection</span>
            <h1 className="text-5xl font-serif text-slate-900 leading-tight mb-8">Contact <br /><span className="italic font-light">The Atelier</span></h1>
            <p className="text-slate-500 font-medium max-w-xl text-sm leading-relaxed uppercase tracking-widest mx-auto">
              OUR CONCIERGE TEAM IS AVAILABLE FOR PERSONALIZED ADVICE AND PRIVATE APPOINTMENTS.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
            {/* Contact Form */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h2 className="text-3xl font-serif text-slate-900 leading-tight">Send a Message</h2>
                <p className="text-slate-500 text-sm">Please provide your details and the nature of your inquiry. We typically respond within 24 operational hours.</p>
              </div>

              <form className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1">Full Name</label>
                    <input type="text" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all" placeholder="Enter your name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1">Email Address</label>
                    <input type="email" className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all" placeholder="Enter your email" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1">Inquiry Type</label>
                  <select className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all appearance-none">
                    <option>Product Information</option>
                    <option>Order Status</option>
                    <option>Private Appointment</option>
                    <option>Press & Media</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 block ml-1">Message</label>
                  <textarea rows={6} className="w-full bg-slate-50 border-none rounded-2xl p-5 text-sm focus:ring-1 focus:ring-slate-900 transition-all resize-none" placeholder="How can we assist you?"></textarea>
                </div>
                <button className="bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[0.3em] px-16 py-5 rounded-full hover:bg-slate-800 hover:scale-105 transition-all shadow-xl shadow-slate-200">
                  Transmit Message
                </button>
              </form>
            </motion.div>

            {/* Office Locations */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-16"
            >
              {offices.map((office, idx) => (
                <div key={idx} className="bg-slate-50/50 p-12 rounded-[2.5rem] border border-slate-100 space-y-8">
                  <div className="flex items-center justify-between">
                    <h3 className="text-3xl font-serif text-slate-900">{office.city} <span className="italic font-light">Atelier</span></h3>
                    <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center text-slate-900 shadow-sm">
                      <Globe size={20} strokeWidth={1.5} />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <MapPin size={18} className="text-slate-400 shrink-0 mt-1" />
                      <p className="text-sm text-slate-500 leading-relaxed">{office.address}</p>
                    </div>
                    <div className="flex gap-4">
                      <Phone size={18} className="text-slate-400 shrink-0" />
                      <p className="text-sm font-bold text-slate-900">{office.phone}</p>
                    </div>
                    <div className="flex gap-4">
                      <Mail size={18} className="text-slate-400 shrink-0" />
                      <p className="text-sm text-slate-500 hover:text-slate-900 transition-colors cursor-pointer border-b border-slate-200 pb-1 inline-block">{office.email}</p>
                    </div>
                  </div>

                  <button className="text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-slate-900 group">
                    View on Map
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </button>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
