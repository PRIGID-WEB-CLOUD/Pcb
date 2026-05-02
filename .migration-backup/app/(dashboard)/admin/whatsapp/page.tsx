"use client";

import { MessageSquare, RefreshCw, Copy, Database, Settings } from "lucide-react";

export default function WhatsAppConsole() {
  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <header className="mb-12">
        <h1 className="font-serif text-4xl text-slate-900 mb-2">WhatsApp API Console</h1>
        <p className="text-slate-500 font-serif max-w-2xl">Configure your cloud integration, manage automated customer journeys, and sync your retail catalog.</p>
      </header>

      <section className="bg-white p-8 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-slate-50 rounded-lg text-emerald-600">
            <MessageSquare size={20} />
          </div>
          <h3 className="font-serif text-xl font-bold">API Configuration</h3>
        </div>
        
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Phone Number ID</label>
              <div className="flex items-center gap-2 bg-slate-50 p-4 rounded text-sm font-mono border border-slate-100">
                <span>105938472019482</span>
                <Copy size={16} className="ml-auto cursor-pointer text-slate-400 hover:text-slate-900" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Business Account ID</label>
              <div className="flex items-center gap-2 bg-slate-50 p-4 rounded text-sm font-mono border border-slate-100">
                <span>294817502938411</span>
                <Copy size={16} className="ml-auto cursor-pointer text-slate-400 hover:text-slate-900" />
              </div>
            </div>
          </div>
          <button className="bg-slate-900 text-white px-8 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center gap-2">
            <RefreshCw size={14} /> Refresh Token
          </button>
        </div>
      </section>
    </div>
  );
}
