import { useState } from "react";
import { Link, useLocation } from "wouter";

interface AdminLayoutProps {
  children: React.ReactNode;
  sidebar?: "main" | "channels";
}

const mainNavItems = [
  { icon: "dashboard", label: "Dashboard", href: "/admin" },
  { icon: "inventory_2", label: "Catalog", href: "/admin/catalog" },
  { icon: "category", label: "Categories", href: "/admin/categories" },
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
  const [collapsed, setCollapsed] = useState(true);
  const navItems = sidebar === "channels" ? channelNavItems : mainNavItems;

  const sidebarW = collapsed ? "w-[68px]" : "w-64";
  const contentL = collapsed ? "ml-[68px]" : "ml-64";
  const topbarL = collapsed ? "left-[68px]" : "left-64";

  return (
    <div className="min-h-screen bg-[#f8f9ff] font-[Manrope,sans-serif] text-[#0b1c30]">
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          font-family: 'Material Symbols Outlined';
          display: inline-block;
          vertical-align: middle;
        }
        .admin-sidebar { transition: width 0.22s cubic-bezier(0.4,0,0.2,1); }
        .admin-topbar  { transition: left  0.22s cubic-bezier(0.4,0,0.2,1); }
        .admin-main    { transition: margin-left 0.22s cubic-bezier(0.4,0,0.2,1); }
        .sidebar-label { transition: opacity 0.15s ease, max-width 0.22s cubic-bezier(0.4,0,0.2,1), margin 0.22s; overflow: hidden; white-space: nowrap; }
      `}</style>

      {/* Sidebar */}
      <aside className={`admin-sidebar fixed left-0 top-0 h-screen ${sidebarW} bg-slate-50 border-r border-slate-200 flex flex-col z-40 overflow-hidden`}>

        {/* Logo + Toggle */}
        <div className="flex items-center border-b border-slate-100 h-16 px-3 shrink-0">
          {!collapsed && (
            <Link href="/admin" className="flex items-center gap-3 cursor-pointer no-underline flex-1 min-w-0 pl-2">
              <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-sm">dashboard</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-serif font-black tracking-widest text-slate-900 uppercase leading-tight">BOUTIQUE</h1>
                <p className="text-[9px] font-[Manrope] uppercase tracking-widest text-[#7c839b]">Admin Terminal</p>
              </div>
            </Link>
          )}
          {collapsed && (
            <Link href="/admin" className="flex items-center justify-center w-full cursor-pointer no-underline">
              <div className="w-8 h-8 bg-black rounded-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-sm">dashboard</span>
              </div>
            </Link>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors ${collapsed ? "mt-0 ml-0 w-full justify-center" : "ml-auto"}`}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="material-symbols-outlined text-base">
              {collapsed ? "menu_open" : "menu"}
            </span>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = sidebar === "main"
              ? (item.href === "/admin" ? location === "/admin" : location.startsWith(item.href))
              : location === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 py-3 transition-all duration-200 font-serif text-sm uppercase tracking-wider cursor-pointer rounded-sm
                  ${collapsed ? "justify-center px-2" : "px-4"}
                  ${isActive
                    ? "bg-white text-emerald-700 border-r-2 border-emerald-600 font-bold shadow-sm"
                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  }`}
              >
                <span className="material-symbols-outlined shrink-0">{item.icon}</span>
                {!collapsed && <span className="sidebar-label">{item.label}</span>}
              </Link>
            );
          })}

          {sidebar === "channels" && !collapsed && (
            <div className="pt-4 px-2">
              <button className="w-full bg-black text-white py-3 px-4 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors flex items-center justify-center gap-2 rounded-sm">
                <span className="material-symbols-outlined text-sm">add</span> Add New Channel
              </button>
            </div>
          )}
          {sidebar === "channels" && collapsed && (
            <div className="pt-4 flex justify-center">
              <button title="Add New Channel" className="w-10 h-10 bg-black text-white flex items-center justify-center hover:bg-[#006c49] transition-colors rounded-sm">
                <span className="material-symbols-outlined text-sm">add</span>
              </button>
            </div>
          )}
        </nav>

        {/* Bottom links */}
        <div className="mt-auto border-t border-slate-200 px-2 py-3 space-y-0.5">
          {sidebar === "channels" ? (
            <>
              <a href="#" title="Help Center" className={`flex items-center gap-3 py-2 text-slate-500 text-xs font-serif italic hover:text-emerald-600 transition-colors rounded-sm ${collapsed ? "justify-center px-2" : "px-4"}`}>
                <span className="material-symbols-outlined text-base shrink-0">help</span>
                {!collapsed && <span className="sidebar-label">Help Center</span>}
              </a>
              <a href="#" title="API Docs" className={`flex items-center gap-3 py-2 text-slate-500 text-xs font-serif italic hover:text-emerald-600 transition-colors rounded-sm ${collapsed ? "justify-center px-2" : "px-4"}`}>
                <span className="material-symbols-outlined text-base shrink-0">description</span>
                {!collapsed && <span className="sidebar-label">API Docs</span>}
              </a>
            </>
          ) : (
            <>
              <Link href="/admin/settings" title="Settings" className={`flex items-center gap-3 py-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all font-serif text-sm uppercase tracking-wider rounded-sm ${collapsed ? "justify-center px-2" : "px-4"}`}>
                <span className="material-symbols-outlined shrink-0">settings</span>
                {!collapsed && <span className="sidebar-label">Settings</span>}
              </Link>
              <a href="#" title="Help" className={`flex items-center gap-3 py-3 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all font-serif text-sm uppercase tracking-wider rounded-sm ${collapsed ? "justify-center px-2" : "px-4"}`}>
                <span className="material-symbols-outlined shrink-0">contact_support</span>
                {!collapsed && <span className="sidebar-label">Help</span>}
              </a>
            </>
          )}
        </div>
      </aside>

      {/* Top Bar */}
      <header className={`admin-topbar fixed top-0 ${topbarL} right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm flex items-center justify-between px-8 z-30`}>
        <div className="hidden md:flex items-center bg-slate-50 rounded-full px-4 py-1.5 border border-slate-200 w-72">
          <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
          <input className="bg-transparent border-none outline-none text-xs ml-2 w-full text-slate-700 placeholder-slate-400" placeholder="Search admin..." type="text" />
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <button className="hover:text-emerald-600 transition-colors text-slate-600">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <Link href="/" className="hover:text-emerald-600 transition-colors text-slate-600" title="Back to Store">
            <span className="material-symbols-outlined">storefront</span>
          </Link>
          <button className="hover:text-emerald-600 transition-colors text-slate-600">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className={`admin-main ${contentL} pt-16 min-h-screen`}>
        {children}
      </main>
    </div>
  );
}
