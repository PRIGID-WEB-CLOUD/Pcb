"use client";

import { Mail, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function NewsletterPage() {
  const [subscribers, setSubscribers] = useState([
    { id: 1, email: "user1@example.com", subscribedAt: "2026-04-01", status: "Active" },
    { id: 2, email: "user2@example.com", subscribedAt: "2026-04-15", status: "Active" },
  ]);

  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-serif text-4xl text-slate-900 mb-2">Newsletter</h1>
          <p className="text-slate-500 font-serif">Manage customer newsletter subscriptions.</p>
        </div>
        <button className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors">
          <Plus size={14} /> Compose Campaign
        </button>
      </header>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Subscriber Email</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Subscribed At</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {subscribers.map((sub) => (
              <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium">{sub.email}</td>
                <td className="px-6 py-4 text-slate-500">{sub.subscribedAt}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] uppercase font-bold rounded-full">{sub.status}</span>
                </td>
                <td className="px-6 py-4 text-right">
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
