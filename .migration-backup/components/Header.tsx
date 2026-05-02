"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, User, Search, Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function Header() {
  const router = useRouter();
  const { data: session } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsSearchOpen(false);
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header 
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        isScrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-100 py-4" : "bg-transparent py-8"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center transition-all duration-500">
        <Link href="/" className={`text-xl md:text-2xl font-serif tracking-[0.3em] uppercase transition-colors duration-500 ${isScrolled ? "text-slate-900" : "text-white"}`}>
          LUXE
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-12">
          {[
            { label: "Collections", href: "/products" },
            { label: "New Arrivals", href: "/products?new=true" },
            { label: "Journal", href: "/blog" },
            { label: "Heritage", href: "/sustainability" }
          ].map((item) => (
            <Link 
              key={item.label}
              href={item.href} 
              className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-500 hover:opacity-50 ${
                isScrolled ? "text-slate-900" : "text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className={`flex items-center space-x-8 transition-colors duration-500 ${isScrolled ? "text-slate-900" : "text-white"}`}>
          <div className="relative">
            <button 
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="hover:opacity-50 transition-opacity"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>
            <AnimatePresence>
              {isSearchOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute right-0 top-10 w-64 bg-white p-2 rounded shadow-lg border border-slate-100"
                >
                  <form onSubmit={handleSearch} className="flex items-center">
                    <input 
                      type="text" 
                      placeholder="Search collections..." 
                      className="w-full text-xs p-2 outline-none text-slate-900 placeholder:text-slate-400"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" className="text-slate-400 hover:text-slate-900 px-2">
                       <Search size={14} />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <Link href="/cart" className="relative group">
            <ShoppingBag size={18} strokeWidth={1.5} />
            <span className="absolute -top-2 -right-2 text-[8px] bg-slate-900 text-white w-4 h-4 rounded-full flex items-center justify-center font-bold">0</span>
          </Link>
          <Link href={session ? "/account" : "/login"} className="hidden sm:block hover:opacity-50 transition-opacity">
            <User size={18} strokeWidth={1.5} />
          </Link>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="md:hidden"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-100 overflow-hidden"
          >
            <div className="px-8 py-12 flex flex-col space-y-8">
              {[
                { label: "Collections", href: "/products" },
                { label: "New Arrivals", href: "/products?new=true" },
                { label: "Journal", href: "/blog" },
                { label: "Heritage", href: "/sustainability" }
              ].map((item) => (
                <Link 
                  key={item.label}
                  href={item.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-sm font-bold uppercase tracking-[0.3em] text-slate-900 border-b border-slate-50 pb-4"
                >
                  {item.label}
                </Link>
              ))}
              <div className="flex space-x-8 pt-4">
                 <Link href={session ? "/account" : "/login"} onClick={() => setIsMobileMenuOpen(false)} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Account</Link>
                 <Link href="/cart" onClick={() => setIsMobileMenuOpen(false)} className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Bag</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
