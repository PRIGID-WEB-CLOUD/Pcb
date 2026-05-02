import { Link, useLocation } from "wouter";

interface AdminLayoutProps {
  children: React.ReactNode;
  sidebar?: "main" | "channels";
}

const mainNavItems = [
  { icon: "dashboard", label: "Dashboard", href: "/admin" },
  { icon: "inventory_2", label: "Catalog", href: "/admin/catalog" },
  { icon: "shopping_bag", label: "Orders", href: "/admin/orders" },
  { icon: "group", label: "Customers", href: "/admin/customers" },
  { icon: "analytics", label: "Analytics", href: "/admin/analytics" },
  { icon: "hub", label: "Channels", href: "/admin/channels" },
];

const channelNavItems = [
  { icon: "hub", label: "Channel Hub", href: "/admin/channels" },
  { icon: "storefront", label: "Meta & Facebook", href: "/admin/channels/facebook" },
  { icon: "chat", label: "WhatsApp API", href: "/admin/channels/whatsapp" },
  { icon: "share", label: "X Social", href: "/admin/channels/twitter" },
];

export default function AdminLayout({ children, sidebar = "main" }: AdminLayoutProps) {
  const [location] = useLocation();
  const navItems = sidebar === "channels" ? channelNavItems : mainNavItems;

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-[Manrope,sans-serif] text-[#0b1c30]">
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          font-family: 'Material Symbols Outlined';
          display: inline-block;
          vertical-align: middle;
        }
      `}</style>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 bg-slate-50 border-r border-slate-200 flex flex-col z-40">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <Link href="/admin">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm">dashboard</span>
              </div>
              <div>
                <h1 className="text-base font-serif font-black tracking-widest text-slate-900 uppercase">BOUTIQUE</h1>
                <p className="text-[9px] font-[Manrope] uppercase tracking-widest text-[#7c839b]">Admin Terminal</p>
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = sidebar === "main"
              ? (item.href === "/admin" ? location === "/admin" : location.startsWith(item.href))
              : location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <a className={`flex items-center gap-3 px-4 py-3 transition-all duration-200 font-serif text-sm uppercase tracking-wider cursor-pointer rounded-sm
                  ${isActive
                    ? "bg-white text-emerald-700 border-r-2 border-emerald-600 font-bold shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}>
                  <span className="material-symbols-outlined">{item.icon}</span>
                  <span>{item.label}</span>
                </a>
              </Link>
            );
          })}

          {sidebar === "channels" && (
            <div className="pt-4">
              <button className="w-full bg-black text-white py-3 px-4 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors flex items-center justify-center gap-2 rounded-sm">
                <span className="material-symbols-outlined text-sm">add</span> Add New Channel
              </button>
            </div>
          )}
        </nav>

        <div className="mt-auto border-t border-slate-200 px-3 py-4 space-y-1">
          {sidebar === "channels" ? (
            <>
              <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-serif italic hover:text-emerald-600 transition-colors">
                <span className="material-symbols-outlined text-base">help</span> Help Center
              </a>
              <a href="#" className="flex items-center gap-3 px-4 py-2 text-slate-500 text-xs font-serif italic hover:text-emerald-600 transition-colors">
                <span className="material-symbols-outlined text-base">description</span> API Docs
              </a>
            </>
          ) : (
            <>
              <Link href="/admin/settings">
                <a className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all font-serif text-sm uppercase tracking-wider">
                  <span className="material-symbols-outlined">settings</span> Settings
                </a>
              </Link>
              <a href="#" className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all font-serif text-sm uppercase tracking-wider">
                <span className="material-symbols-outlined">contact_support</span> Help
              </a>
            </>
          )}
        </div>
      </aside>

      {/* Top Bar */}
      <header className="fixed top-0 left-64 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm flex items-center justify-between px-8 z-30">
        <div className="hidden md:flex items-center bg-slate-50 rounded-full px-4 py-1.5 border border-slate-200 w-72">
          <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
          <input className="bg-transparent border-none outline-none text-xs ml-2 w-full text-slate-700 placeholder-slate-400" placeholder="Search admin..." type="text" />
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button className="hover:text-emerald-600 transition-colors text-slate-600">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <Link href="/">
            <button className="hover:text-emerald-600 transition-colors text-slate-600" title="Back to Store">
              <span className="material-symbols-outlined">storefront</span>
            </button>
          </Link>
          <button className="hover:text-emerald-600 transition-colors text-slate-600">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="ml-64 pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
