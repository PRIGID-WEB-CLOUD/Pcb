"use client";

import { useState } from "react";
import { RefreshCw, Database, Settings, Table, Copy, CheckCircle } from "lucide-react";

export default function MetaCommerceManager() {
  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <header className="mb-12">
        <h1 className="font-serif text-4xl text-slate-900 mb-2">Meta Commerce Manager</h1>
        <p className="text-slate-500 font-serif max-w-2xl">Manage your Facebook and Instagram shop presence, synchronize product catalogs, and automate social distribution through a unified editorial dashboard.</p>
      </header>

      <div className="grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-7 bg-white p-8 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 flex flex-col justify-between overflow-hidden relative">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-50 rounded-lg text-emerald-600">
                <Database size={20} />
              </div>
              <h3 className="font-serif text-xl font-bold">Catalog Sync</h3>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Sync Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                  <span className="text-sm font-bold">Healthy & Live</span>
                </div>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Total Items</p>
                <span className="text-sm font-bold">1,248 Products</span>
              </div>
            </div>
          </div>
          <div className="flex gap-4">
            <button className="bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center gap-2">
              <RefreshCw size={14} /> Run Manual Sync
            </button>
            <button className="border border-slate-200 text-slate-900 px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors">
              View Sync Logs
            </button>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-5 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-slate-50 rounded-lg text-slate-900">
              <Settings size={20} />
            </div>
            <h3 className="font-serif text-xl font-bold">Shop Settings</h3>
          </div>
          <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-sm mb-1">Enable Facebook Shop</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">Make your catalog visible</p>
              </div>
              <div className="w-12 h-6 bg-emerald-600 rounded-full relative cursor-pointer">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full"></div>
              </div>
          </div>
        </section>
      </div>
    </div>
  );
}
