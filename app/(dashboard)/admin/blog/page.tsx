"use client";

import { FileText, Plus, Trash2, Edit2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function BlogManagementPage() {
  const [posts, setPosts] = useState([
    { id: 1, title: "How to Style Your Silk Blazer", status: "Published", date: "2026-05-01" },
    { id: 2, title: "Summer Collection Sneak Peek", status: "Draft", date: "2026-04-28" },
  ]);

  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="font-serif text-4xl text-slate-900 mb-2">Blog Management</h1>
          <p className="text-slate-500 font-serif">Manage your brand's editorial content.</p>
        </div>
        <Link href="/admin/blog/compose" className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors">
          <Plus size={14} /> Create New Post
        </Link>
      </header>
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Post Title</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Date</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {posts.map((post) => (
              <tr key={post.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium">{post.title}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded-full ${post.status === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'}`}>{post.status}</span>
                </td>
                <td className="px-6 py-4 text-slate-500">{post.date}</td>
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
