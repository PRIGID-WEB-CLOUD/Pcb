import AdminLayout from "./AdminLayout";

export default function AdminProductEditorPage() {
  return (
    <AdminLayout sidebar="main">
      <div className="p-8 bg-[#f8f9ff] min-h-screen">
        {/* Header */}
        <div className="flex justify-between items-end mb-12">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-[12px] font-[Manrope] font-bold tracking-widest bg-[#6cf8bb] text-[#00714d] px-2 py-1 rounded uppercase">PUBLISHED</span>
              <span className="text-[12px] font-[Manrope] text-[#45464d]">Last saved 2 minutes ago</span>
            </div>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-black">Silk Evening Blazer</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-6 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all">Discard</button>
            <button className="px-8 py-2 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all shadow-md">Save Changes</button>
          </div>
        </div>

        {/* 12-col grid */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
            {/* General Info */}
            <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <h3 className="text-[24px] font-serif font-semibold text-black mb-6">General Information</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">Product Name</label>
                  <input className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:ring-black focus:border-black px-4 py-3 font-[Manrope]" type="text" defaultValue="Silk Evening Blazer" />
                </div>
                <div>
                  <label className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase text-[#45464d] block mb-2">Description</label>
                  <div className="border border-[#c6c6cd] rounded-lg overflow-hidden">
                    <div className="bg-[#eff4ff] px-4 py-2 border-b border-[#c6c6cd] flex gap-4">
                      {["format_bold", "format_italic", "list", "link"].map((icon) => (
                        <span key={icon} className="material-symbols-outlined cursor-pointer text-[#45464d] hover:text-black transition-colors">{icon}</span>
                      ))}
                    </div>
                    <textarea className="w-full bg-[#f8f9ff] border-none focus:ring-0 px-4 py-3 font-[Manrope] outline-none" rows={6} defaultValue="This double-breasted evening blazer is crafted from premium mulberry silk, featuring peaked lapels and silk-covered buttons. Perfect for gala events and sophisticated evenings." />
                  </div>
                </div>
              </div>
            </section>

            {/* Media Gallery */}
            <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[24px] font-serif font-semibold text-black">Media Gallery</h3>
                <button className="font-[Manrope] font-bold text-xs tracking-widest text-[#006c49] flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">add</span> Add Media
                </button>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2 row-span-2 relative group cursor-pointer overflow-hidden rounded aspect-square bg-slate-100">
                  <img
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCYZiYjc9LBW2RK0oY6eXEnYiorJVsPJq1eS1wzxbiRMlSBCNMvejZjn7Pu0EP394bb-jEg3OSBEeTrq3vdNKl528V8P9z34MmvvyH685IeW7HCWu8aSkXZVHzzYBGduLeiLheCfr9BMTq_3Gp7aauRJOksWY-87MRMl7nLQ5lHNR2TyZ92vbQowJQoa6IQUu3dqWVbrt1D7R85X7KGP"
                    alt="Product main"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="material-symbols-outlined text-white">edit</span>
                  </div>
                </div>
                {[
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuDfC3XnzPysfBJEnU31jnIoNQXBFYriVVlu9KjnqAjH_y__am2kXcJZg_gEOG7E5DvQ25pHfQaxCX-UoKk0M7lcrSFRr5EW5mE-kZ49tQxFujOl5esTIXmUjlyXYRb4LB42wnz85zhNaCIyyLxOqitp1UgVPGjRsERpmo1xpyBH6sYX5A9pLt6eObeY39ZJ_R0_Rrv7wh8TgAVWu2jqXDkMOxVcPyxqwGogrs8x8av5sMo4QmAxPNp91f4vpsI5W9--337lIZxOLKM",
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuAz7CJf-MsikZex2qSS70sZeEQabTZnQDgLi0fv0AH_baGueTmNG_VKp39DjicwXhWuWDBczPHYSiLV-wygGoL3wWe-dgQ4Oc49lLoZ61IZs0O8WQSv8Z8XQIs538FM5ke-Uo5CXoKBmkKt4OzzVxfgDtMvc8KD6HY2pS3vEYwFqqK8j5ssrZMXeFm-dPzPMeHzZoc7UrKlrEGAjZ0JAZgTydsSNfWumAZpCX7XWgvGY-ls5V4hy3EVSyHfdMhHzTf2ibV7kXQ4W24",
                ].map((src, i) => (
                  <div key={i} className="relative group cursor-pointer overflow-hidden rounded aspect-square bg-slate-100">
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={src} alt="" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="material-symbols-outlined text-white">delete</span>
                    </div>
                  </div>
                ))}
                <div className="border-2 border-dashed border-[#c6c6cd] flex flex-col items-center justify-center gap-2 text-[#45464d] hover:bg-[#eff4ff] transition-colors rounded aspect-square cursor-pointer">
                  <span className="material-symbols-outlined text-3xl">upload</span>
                  <span className="text-[12px] font-[Manrope] font-bold tracking-widest uppercase">Upload</span>
                </div>
              </div>
            </section>

            {/* Variants */}
            <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <h3 className="text-[24px] font-serif font-semibold text-black mb-6">Product Variants</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-[#c6c6cd]">
                      {["Variant", "Price", "SKU", "Stock", "Actions"].map((h) => (
                        <th key={h} className="py-4 text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Midnight Black / 48R", price: "$1,250.00", sku: "BLZ-48R-BLK", stock: "12 in stock", dot: "bg-[#006c49]" },
                      { name: "Midnight Black / 50R", price: "$1,250.00", sku: "BLZ-50R-BLK", stock: "Out of stock", dot: "bg-[#ba1a1a]" },
                    ].map((v) => (
                      <tr key={v.sku} className="border-b border-[#eff4ff]">
                        <td className="py-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-black"></div>
                          <span className="font-[Manrope]">{v.name}</span>
                        </td>
                        <td className="py-4 font-[Manrope]">{v.price}</td>
                        <td className="py-4 font-[Manrope] text-[#45464d]">{v.sku}</td>
                        <td className="py-4">
                          <span className={`inline-block w-2 h-2 rounded-full ${v.dot} mr-2`}></span>
                          <span className="font-[Manrope]">{v.stock}</span>
                        </td>
                        <td className="py-4">
                          <span className="material-symbols-outlined cursor-pointer text-[#45464d] hover:text-black">more_horiz</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="mt-6 w-full py-3 border border-dashed border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all">Add New Variant</button>
            </section>
          </div>

          {/* Right Column */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Status */}
            <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <h3 className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] uppercase mb-6">Status & Organization</h3>
              <div className="space-y-6">
                <div>
                  <label className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] block mb-2 uppercase">Product Status</label>
                  <select className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:ring-black px-4 py-2 font-[Manrope] outline-none">
                    <option>Active</option><option>Draft</option><option>Archived</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] block mb-2 uppercase">Category</label>
                  <select className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg focus:ring-black px-4 py-2 font-[Manrope] outline-none">
                    <option>Evening Wear</option><option>Outerwear</option><option>Limited Edition</option>
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] block mb-2 uppercase">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {["Silk", "Tailored"].map((tag) => (
                      <span key={tag} className="bg-[#e5eeff] px-2 py-1 text-xs font-medium flex items-center gap-1">
                        {tag} <span className="material-symbols-outlined text-xs cursor-pointer">close</span>
                      </span>
                    ))}
                  </div>
                  <input className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg px-4 py-2 text-sm font-[Manrope] outline-none" placeholder="Add tag..." type="text" />
                </div>
              </div>
            </section>

            {/* Pricing */}
            <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <h3 className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] uppercase mb-6">Pricing & Stock</h3>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] block mb-2 uppercase">Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-[#45464d]">$</span>
                      <input className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg pl-8 py-2 font-[Manrope] outline-none" type="text" defaultValue="1,250.00" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] block mb-2 uppercase">Compare At</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-[#45464d]">$</span>
                      <input className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg pl-8 py-2 font-[Manrope] outline-none" type="text" placeholder="0.00" />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] block mb-2 uppercase">Inventory Policy</label>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-5 bg-[#6ffbbe] rounded-full relative cursor-pointer">
                      <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                    </div>
                    <span className="text-sm font-[Manrope]">Track quantity</span>
                  </div>
                </div>
              </div>
            </section>

            {/* SEO */}
            <section className="bg-white p-6 rounded-lg shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <h3 className="text-[12px] font-[Manrope] font-bold tracking-widest text-[#45464d] uppercase mb-6">Search Engine Preview</h3>
              <div className="p-4 bg-white border border-[#c6c6cd] rounded">
                <div className="text-[#1a0dab] text-lg hover:underline cursor-pointer font-medium truncate">Silk Evening Blazer | Luxe Boutique</div>
                <div className="text-[#006621] text-sm mb-1">https://luxe.com/products/silk-evening-blazer</div>
                <div className="text-[#45464d] text-xs line-clamp-2">Discover the epitome of elegance with our Mulberry Silk Evening Blazer. Expertly tailored for a flawless fit...</div>
              </div>
              <button className="mt-4 text-[12px] font-[Manrope] font-bold tracking-widest text-black border-b border-black pb-0.5 uppercase">Edit SEO Meta</button>
            </section>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
