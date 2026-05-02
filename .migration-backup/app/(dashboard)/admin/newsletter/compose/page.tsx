"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ComposeCampaignPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const handleSend = async () => {
    try {
      const response = await fetch("/api/newsletter/send", {
        method: "POST",
        body: JSON.stringify({ subject, content }),
        headers: { "Content-Type": "application/json" },
      });
      const data = await response.json();
      if (response.ok) {
        alert("Campaign sent successfully!");
        router.push("/admin/newsletter");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Failed to send campaign");
    }
  };

  return (
    <div className="max-w-[800px] mx-auto py-8">
      <header className="mb-8">
        <h1 className="font-serif text-4xl text-slate-900 mb-2">Compose Campaign</h1>
        <p className="text-slate-500 font-serif">Create and send a new newsletter to all subscribers.</p>
      </header>
      <div className="bg-white p-8 rounded-xl border border-slate-100 shadow-sm space-y-6">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Subject Line</label>
          <input 
            type="text" 
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Enter newsletter subject..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Content</label>
          <textarea 
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 border border-slate-200 rounded-lg h-64 focus:outline-none focus:ring-2 focus:ring-slate-900"
            placeholder="Write your newsletter content here..."
          />
        </div>
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
          <button 
            onClick={() => router.push("/admin/newsletter")}
            className="text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:text-slate-900"
          >
            Cancel
          </button>
          <button 
            onClick={handleSend}
            className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-lg font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-600 transition-colors"
          >
            <Send size={14} /> Send Campaign
          </button>
        </div>
      </div>
    </div>
  );
}
