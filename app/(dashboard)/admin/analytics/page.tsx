"use client";

import { TrendingUp, BarChart3, Users, MessageSquare, Download, Calendar, Search, Bell, UserCircle } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <header className="mb-12 flex justify-between items-end">
        <div>
          <h1 className="font-serif text-4xl text-slate-900 mb-2">Social Channel Analytics</h1>
          <p className="text-slate-500 font-serif max-w-2xl">Comprehensive performance across your commerce social ecosystem.</p>
        </div>
        <div className="flex gap-4">
             <button className="flex items-center gap-2 px-6 py-3 border border-slate-200 rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-colors">
                 <Calendar size={14} /> Last 30 Days
              </button>
              <button className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-lg font-bold uppercase tracking-widest text-[10px] hover:bg-emerald-600 transition-colors">
                 <Download size={14} /> Export Report
              </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
          <div className="flex justify-between items-start mb-4">
             <Users size={20} className="text-slate-500" />
             <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">+12.5%</span>
          </div>
          <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-2">Total Reach</p>
          <h3 className="text-3xl font-serif">2.4M</h3>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
          <div className="flex justify-between items-start mb-4">
             <BarChart3 size={20} className="text-slate-500" />
             <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold">-0.4%</span>
          </div>
          <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-2">Conversion Rate</p>
          <h3 className="text-3xl font-serif">3.82%</h3>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
          <div className="flex justify-between items-start mb-4">
             <TrendingUp size={20} className="text-slate-500" />
             <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">+5.2%</span>
          </div>
          <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-2">Avg. Order Value</p>
          <h3 className="text-3xl font-serif">$412.00</h3>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
          <div className="flex justify-between items-start mb-4">
             <MessageSquare size={20} className="text-slate-500" />
             <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold">+8.1%</span>
          </div>
          <p className="font-bold text-[10px] uppercase tracking-widest text-slate-400 mb-2">Customer LTV</p>
          <h3 className="text-3xl font-serif">$1,890.00</h3>
        </div>
      </div>
    </div>
  );
}
