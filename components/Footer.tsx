export default function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-100 pt-32 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-8 pb-20 border-b border-slate-200">
          {/* Brand & Manifesto */}
          <div className="md:col-span-4 space-y-8">
            <h2 className="text-2xl font-serif tracking-[0.4em] uppercase text-slate-900">LUXE</h2>
            <p className="text-sm text-slate-500 font-light leading-relaxed max-w-xs uppercase tracking-[0.1em]">
              Defining the landscape of modern luxury through conscious design, impeccable quality, and architectural precision.
            </p>
            <div className="flex gap-6">
              {['Instagram', 'Pinterest', 'Journal'].map(social => (
                <a key={social} href="#" className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors">{social}</a>
              ))}
            </div>
          </div>

          {/* Quick Links Group */}
          <div className="md:col-span-5 grid grid-cols-2 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-900">Collections</h4>
              <ul className="space-y-4 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                <li><a href="/products" className="hover:text-slate-900 transition-colors">Spring / Summer</a></li>
                <li><a href="/products" className="hover:text-slate-900 transition-colors">The Atelier</a></li>
                <li><a href="/products" className="hover:text-slate-900 transition-colors">Accessories</a></li>
                <li><a href="/products" className="hover:text-slate-900 transition-colors">Curated Set</a></li>
              </ul>
            </div>
            <div className="space-y-8">
              <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-900">Customer Care</h4>
              <ul className="space-y-4 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                <li><a href="#" className="hover:text-slate-900 transition-colors">Shipping & Returns</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-slate-900 transition-colors">Sustainability</a></li>
              </ul>
            </div>
          </div>

          {/* Global Presence */}
          <div className="md:col-span-3 space-y-8">
            <h4 className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-900">Global Presence</h4>
            <div className="space-y-4 text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-relaxed">
              <p>124 Savile Row, Mayfair<br />London, W1S 3PR</p>
              <p>Place Vendôme<br />75001 Paris, France</p>
            </div>
            <div className="pt-4">
              <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">Appointments Available</span>
            </div>
          </div>
        </div>

        <div className="pt-12 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex gap-8 text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">
            <span>© 2024 LUXE BOUTIQUE</span>
            <span>All Rights Reserved</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Inventory Status: Secure</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
