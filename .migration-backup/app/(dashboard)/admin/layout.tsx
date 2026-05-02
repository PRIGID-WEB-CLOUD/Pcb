import AdminSidebar from "@/components/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50/30">
      <AdminSidebar />
      <div className="flex-1 ml-64 min-h-screen">
        <header className="sticky top-0 w-full border-b border-slate-100 bg-white/80 backdrop-blur-md flex justify-between items-center h-16 px-8 z-30 shadow-sm transition-all">
          <div className="flex items-center gap-4 flex-1">
            <div className="text-sm font-serif text-slate-400 font-medium tracking-wide">
              Secure Environment
            </div>
          </div>
          <div className="flex items-center gap-6">
            <span className="font-serif text-sm tracking-tight font-bold text-slate-900">Management Console</span>
          </div>
        </header>
        <div className="p-10">
          {children}
        </div>
      </div>
    </div>
  );
}
