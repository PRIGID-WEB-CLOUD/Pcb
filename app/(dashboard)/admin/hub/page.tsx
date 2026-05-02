"use client";

import { useState } from "react";
import { Store, MessageSquare, Share, Database, RefreshCw, Trash2, Settings } from "lucide-react";

export default function ChannelHub() {
  const [channels, setChannels] = useState([
    { id: 1, name: "Meta & Facebook", icon: Store, status: "Connected", description: "Primary marketing and ad pixel synchronization" },
    { id: 2, name: "Meta Commerce", icon: Database, status: "Connected", description: "Inventory and product catalog direct feed." },
    { id: 3, name: "WhatsApp API", icon: MessageSquare, status: "Pending", description: "Direct communication and transactional alerts." },
    { id: 4, name: "X Social", icon: Share, status: "Error", description: "Brand sentiment tracking and auto-posting." },
  ]);

  const updateChannel = (id: number) => {
    alert(`Updating channel ${id}...`);
  };

  const uninstallChannel = (id: number) => {
    setChannels(prev => prev.filter(c => c.id !== id));
  };
  return (
    <div className="max-w-[1280px] mx-auto py-8">
      <header className="mb-12">
        <h1 className="font-serif text-4xl text-slate-900 mb-2">Omnichannel Hub</h1>
        <p className="text-slate-500 font-serif max-w-2xl">Manage your global brand presence across integrated ecosystems.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {channels.map((channel) => (
          <div key={channel.id} className="bg-white p-6 rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.03)] border border-slate-100 flex flex-col justify-between">
              <div>
                <div className="p-3 bg-slate-50 rounded-lg inline-block text-slate-900 mb-4">
                    <channel.icon size={24} />
                </div>
                <h3 className="font-serif text-lg font-bold mb-1">{channel.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{channel.description}</p>
                <span className={`inline-block mb-4 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${channel.status === 'Connected' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{channel.status}</span>
              </div>
              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <button onClick={() => updateChannel(channel.id)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                    <RefreshCw size={18} />
                </button>
                <button onClick={() => uninstallChannel(channel.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <Trash2 size={18} />
                </button>
                <button className="p-2 text-slate-400 hover:text-emerald-600 transition-colors ml-auto">
                    <Settings size={18} />
                </button>
              </div>
          </div>
        ))}
      </div>
    </div>
  );
}
