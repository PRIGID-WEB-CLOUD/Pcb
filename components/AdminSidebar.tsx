"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PackageSearch,
  Package as PackageIcon,
  Users as UsersIcon,
  Settings,
  Contact,
  BarChart,
  MessageSquare,
  Globe,
  LayoutGrid,
  Ticket,
  Mail,
  Twitter,
  FileText,
} from "lucide-react";

export default function AdminSidebar() {
  const pathname = usePathname();

  const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/hub", label: "Channel Hub", icon: LayoutGrid },
    { href: "/admin/products", label: "Catalog", icon: PackageSearch },
    { href: "/admin/orders", label: "Orders", icon: PackageIcon },
    { href: "/admin/customers", label: "Customers", icon: UsersIcon },
    { href: "/admin/analytics", label: "Analytics", icon: BarChart },
    { href: "/admin/whatsapp", label: "WhatsApp", icon: MessageSquare },
    { href: "/admin/meta", label: "Meta", icon: Globe },
    { href: "/admin/twitter", label: "Twitter", icon: Twitter },
    { href: "/admin/coupons", label: "Coupons", icon: Ticket },
    { href: "/admin/newsletter", label: "Newsletter", icon: Mail },
    { href: "/admin/blog", label: "Blog", icon: FileText },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white border-r border-slate-100 flex flex-col z-40">
      <div className="p-8">
        <div className="mb-4">
          <Link
            href="/"
            className="text-lg font-serif font-black tracking-[0.2em] text-slate-900"
          >
            BOUTIQUE
          </Link>
          <p className="font-serif uppercase tracking-widest text-[10px] font-semibold text-slate-400 mt-1">
            Admin Terminal
          </p>
        </div>
      </div>
      <nav className="flex-1 space-y-1">
        {links.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-8 py-4 transition-all duration-200 ${
                isActive
                  ? "bg-slate-50 text-emerald-700 border-r-2 border-emerald-600 font-bold font-serif text-sm uppercase tracking-widest"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-serif text-sm uppercase tracking-widest"
              }`}
            >
              <link.icon size={18} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-8 border-t border-slate-100">
        <Link
          href="/logout"
          className="flex items-center gap-3 text-slate-500 hover:text-red-600 transition-colors font-serif text-xs uppercase tracking-widest"
        >
          <Contact size={16} />
          <span>Exit Console</span>
        </Link>
      </div>
    </aside>
  );
}
