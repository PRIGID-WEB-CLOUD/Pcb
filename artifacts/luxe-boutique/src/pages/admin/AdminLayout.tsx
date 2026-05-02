import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext";

interface AdminLayoutProps {
  children: React.ReactNode;
  sidebar?: "main" | "channels";
}

const mainNavItems = [
  { icon: "dashboard",    label: "Dashboard",  href: "/admin"           },
  { icon: "inventory_2",  label: "Catalog",    href: "/admin/catalog"   },
  { icon: "category",     label: "Categories", href: "/admin/categories"},
  { icon: "shopping_bag", label: "Orders",     href: "/admin/orders"    },
  { icon: "group",        label: "Customers",  href: "/admin/customers" },
  { icon: "sell",         label: "Coupons",    href: "/admin/coupons"   },
  { icon: "analytics",    label: "Analytics",  href: "/admin/analytics" },
  { icon: "photo_library", label: "Media",      href: "/admin/media"       },
  { icon: "article",      label: "Journal",    href: "/admin/blog"        },
  { icon: "mail",         label: "Newsletter", href: "/admin/newsletter"  },
  { icon: "hub",          label: "Channels",   href: "/admin/channels"    },
  { icon: "group_add",    label: "Team",       href: "/admin/team"        },
  { icon: "settings",     label: "Settings",   href: "/admin/settings"    },
];

const channelNavItems = [
  { icon: "hub",        label: "Channel Hub",    href: "/admin/channels"          },
  { icon: "storefront", label: "Meta & Facebook",href: "/admin/channels/facebook" },
  { icon: "chat",       label: "WhatsApp API",   href: "/admin/channels/whatsapp" },
  { icon: "share",      label: "X Social",       href: "/admin/channels/twitter"  },
];

type Order = { id: string; status: string; total: number; createdAt: string };

function getInitials(name: string | null | undefined, email: string) {
  if (name && name.trim()) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const statusIcon: Record<string, { icon: string; cls: string }> = {
  PENDING:    { icon: "pending_actions", cls: "text-amber-600 bg-amber-50"   },
  PROCESSING: { icon: "autorenew",       cls: "text-blue-600 bg-blue-50"     },
  SHIPPED:    { icon: "local_shipping",  cls: "text-purple-600 bg-purple-50" },
  DELIVERED:  { icon: "check_circle",    cls: "text-[#006c49] bg-[#f0faf6]"  },
  CANCELLED:  { icon: "cancel",          cls: "text-red-500 bg-red-50"       },
};

export default function AdminLayout({ children, sidebar = "main" }: AdminLayoutProps) {
  const [location]  = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(true);

  const [showNotif, setShowNotif] = useState(false);
  const [showUser,  setShowUser]  = useState(false);
  const [orders,    setOrders]    = useState<Order[]>([]);
  const [seenIds,   setSeenIds]   = useState<Set<string>>(new Set());

  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);

  const navItems = sidebar === "channels" ? channelNavItems : mainNavItems;
  const sidebarW = collapsed ? "w-[68px]" : "w-64";
  const contentL = collapsed ? "ml-[68px]" : "ml-64";
  const topbarL  = collapsed ? "left-[68px]" : "left-64";

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) setOrders(await res.json());
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setShowUser(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const recentOrders  = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const actionableOrders = orders.filter((o) => o.status === "PENDING" || o.status === "PROCESSING");
  const unreadCount = actionableOrders.filter((o) => !seenIds.has(o.id)).length;

  const openNotif = () => {
    setShowNotif((v) => !v);
    setShowUser(false);
    if (!showNotif) {
      setSeenIds(new Set(actionableOrders.map((o) => o.id)));
    }
  };

  const openUser = () => {
    setShowUser((v) => !v);
    setShowNotif(false);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = "/admin/login";
  };

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

      {/* ── Sidebar ── */}
      <aside className={`admin-sidebar fixed left-0 top-0 h-screen ${sidebarW} bg-slate-50 border-r border-slate-200 flex flex-col z-40 overflow-hidden`}>

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
            <span className="material-symbols-outlined text-base">{collapsed ? "menu_open" : "menu"}</span>
          </button>
        </div>

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

      {/* ── Top Bar ── */}
      <header className={`admin-topbar fixed top-0 ${topbarL} right-0 h-16 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm flex items-center justify-between px-8 z-30`}>
        <div className="hidden md:flex items-center bg-slate-50 rounded-full px-4 py-1.5 border border-slate-200 w-72">
          <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
          <input className="bg-transparent border-none outline-none text-xs ml-2 w-full text-slate-700 placeholder-slate-400" placeholder="Search admin..." type="text" />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {/* Store link */}
          <Link href="/" className="w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-[#006c49] transition-colors" title="Back to Store">
            <span className="material-symbols-outlined text-xl">storefront</span>
          </Link>

          {/* ── Notifications ── */}
          <div ref={notifRef} className="relative">
            <button
              onClick={openNotif}
              className="relative w-9 h-9 flex items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-[#006c49] transition-colors"
              title="Notifications"
            >
              <span className="material-symbols-outlined text-xl">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#006c49] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotif && (
              <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-[0_8px_40px_rgba(15,23,42,0.15)] border border-slate-100 z-50 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <h3 className="font-serif font-semibold text-[15px]">Notifications</h3>
                    {actionableOrders.length > 0 && (
                      <p className="text-[10px] font-[Manrope] font-bold text-amber-600 mt-0.5">
                        {actionableOrders.length} order{actionableOrders.length !== 1 ? "s" : ""} need attention
                      </p>
                    )}
                  </div>
                  <Link href="/admin/orders" onClick={() => setShowNotif(false)}>
                    <span className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#006c49] hover:underline cursor-pointer">View All</span>
                  </Link>
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                  {recentOrders.length === 0 ? (
                    <div className="py-12 text-center text-[#7c839b] font-[Manrope]">
                      <span className="material-symbols-outlined text-3xl text-slate-200 block mb-2">notifications_none</span>
                      No orders yet
                    </div>
                  ) : (
                    recentOrders.map((o) => {
                      const s = statusIcon[o.status] ?? { icon: "receipt", cls: "text-slate-500 bg-slate-100" };
                      const isActionable = o.status === "PENDING" || o.status === "PROCESSING";
                      return (
                        <Link key={o.id} href="/admin/orders" onClick={() => setShowNotif(false)}>
                          <div className={`flex items-start gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors ${isActionable ? "bg-amber-50/40" : ""}`}>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${s.cls}`}>
                              <span className="material-symbols-outlined text-sm">{s.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-[Manrope] font-bold text-xs text-[#0b1c30]">
                                  Order #{o.id.slice(0, 8).toUpperCase()}
                                </p>
                                {isActionable && (
                                  <span className="text-[9px] font-bold uppercase tracking-widest text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
                                    Action needed
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#7c839b] font-[Manrope] mt-0.5">
                                {o.status.charAt(0) + o.status.slice(1).toLowerCase()} · ${o.total.toFixed(2)}
                              </p>
                            </div>
                            <span className="text-[10px] text-[#7c839b] font-[Manrope] shrink-0 mt-0.5">{timeAgo(o.createdAt)}</span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>

                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                  <Link href="/admin/orders" onClick={() => setShowNotif(false)}>
                    <button className="w-full py-2 text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#006c49] hover:text-black transition-colors">
                      Open Order Management
                    </button>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ── User avatar ── */}
          <div ref={userRef} className="relative">
            <button
              onClick={openUser}
              className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full hover:bg-slate-100 transition-colors"
              title={user?.name ?? user?.email ?? "Account"}
            >
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs shrink-0 select-none">
                {user ? getInitials(user.name, user.email) : "?"}
              </div>
              {!collapsed && user && (
                <span className="font-[Manrope] font-bold text-xs text-[#0b1c30] hidden lg:block max-w-[100px] truncate">
                  {user.name ?? user.email}
                </span>
              )}
              <span className="material-symbols-outlined text-slate-400 text-sm hidden lg:inline">expand_more</span>
            </button>

            {showUser && (
              <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-[0_8px_40px_rgba(15,23,42,0.15)] border border-slate-100 z-50 overflow-hidden">
                {/* Profile header */}
                <div className="px-5 py-5 flex items-center gap-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-bold text-base shrink-0 select-none">
                    {user ? getInitials(user.name, user.email) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-serif font-semibold text-[15px] text-[#0b1c30] truncate">
                      {user?.name ?? "Administrator"}
                    </p>
                    <p className="font-[Manrope] text-[11px] text-[#7c839b] truncate mt-0.5">
                      {user?.email}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-[#eff4ff] text-[#006c49] text-[9px] font-[Manrope] font-bold uppercase tracking-widest rounded-full">
                      <span className="material-symbols-outlined text-[10px]">verified</span>
                      {user?.role ?? "Admin"}
                    </span>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  <Link href="/admin" onClick={() => setShowUser(false)}>
                    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                      <span className="material-symbols-outlined text-slate-400 text-base">dashboard</span>
                      <span className="font-[Manrope] text-sm text-[#0b1c30]">Dashboard</span>
                    </div>
                  </Link>
                  <Link href="/admin/settings" onClick={() => setShowUser(false)}>
                    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                      <span className="material-symbols-outlined text-slate-400 text-base">settings</span>
                      <span className="font-[Manrope] text-sm text-[#0b1c30]">Settings</span>
                    </div>
                  </Link>
                  <Link href="/" onClick={() => setShowUser(false)}>
                    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors">
                      <span className="material-symbols-outlined text-slate-400 text-base">storefront</span>
                      <span className="font-[Manrope] text-sm text-[#0b1c30]">View Store</span>
                    </div>
                  </Link>
                </div>

                <div className="border-t border-slate-100 py-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-red-50 cursor-pointer transition-colors group"
                  >
                    <span className="material-symbols-outlined text-slate-400 text-base group-hover:text-red-500 transition-colors">logout</span>
                    <span className="font-[Manrope] text-sm text-[#0b1c30] group-hover:text-red-500 transition-colors">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className={`admin-main ${contentL} pt-16 min-h-screen`}>
        {children}
      </main>
    </div>
  );
}
