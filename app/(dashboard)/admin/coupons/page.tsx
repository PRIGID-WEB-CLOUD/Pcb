"use client";

import { Ticket, Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([
    { id: 1, code: "SUMMER20", discount: "20%", expiry: "2026-08-31", status: "Active" },
    { id: 2, code: "WELCOME10", discount: "10%", expiry: "2026-12-31", status: "Active" },
  ]);

  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-serif text-4xl text-slate-900 mb-2">Coupons</h1>
          <p className="text-slate-500 font-serif">Manage discount codes and promotions.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors">
          <Plus size={14} /> Create Coupon
        </button>
      </header>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Coupon Code</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Discount</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Expiry</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-mono font-bold">{coupon.code}</td>
                <td className="px-6 py-4 font-medium">{coupon.discount}</td>
                <td className="px-6 py-4 text-slate-500">{coupon.expiry}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] uppercase font-bold rounded-full">{coupon.status}</span>
                </td>
                <td className="px-6 py-4 text-right flex justify-end gap-2">
                  <button className="text-slate-400 hover:text-slate-900"><Edit2 size={16}/></button>
                  <button className="text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
