import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import AdminLayout from "./AdminLayout";

type Asset = {
  id: string; publicId: string; url: string; secureUrl: string;
  originalName: string; format: string; width: number | null;
  height: number | null; bytes: number | null; folder: string | null;
  createdAt: string;
};
type MediaData = { assets: Asset[]; cloudinaryConfigured: boolean };

function fmtBytes(b: number | null) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type View = "grid" | "list";

export default function AdminMediaPage() {
  const queryClient = useQueryClient();
  const fileRef     = useRef<HTMLInputElement>(null);
  const dropRef     = useRef<HTMLDivElement>(null);

  const [view, setView]         = useState<View>("grid");
  const [search, setSearch]     = useState("");
  const [selected, setSelected] = useState<Asset | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [copied, setCopied]     = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<MediaData>({
    queryKey: ["admin-media"],
    queryFn: async () => {
      const res = await fetch("/api/media");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
      setDeleteId(null);
      if (selected && selected.id === deleteId) setSelected(null);
    },
  });

  const assets = data?.assets ?? [];
  const configured = data?.cloudinaryConfigured ?? false;

  const filtered = search.trim()
    ? assets.filter(a => a.originalName.toLowerCase().includes(search.toLowerCase()) || a.format.toLowerCase().includes(search.toLowerCase()))
    : assets;

  const totalBytes = assets.reduce((s, a) => s + (a.bytes ?? 0), 0);

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    if (!configured) return;
    setUploading(true);
    setUploadError(null);
    const form = new FormData();
    Array.from(files).forEach(f => form.append("files", f));
    try {
      const res = await fetch("/api/media/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      refetch();
    } catch (e: any) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [configured, refetch]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
  }, [uploadFiles]);

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const stats = [
    { label: "Total Images",  value: assets.length,           icon: "photo_library", color: "text-[#006c49] bg-[#e6f7f1]" },
    { label: "Storage Used",  value: fmtBytes(totalBytes),    icon: "storage",       color: "text-blue-600 bg-blue-50"     },
    { label: "Formats",       value: [...new Set(assets.map(a => a.format.toUpperCase()))].slice(0, 3).join(", ") || "—",
                                                               icon: "image",         color: "text-purple-600 bg-purple-50" },
    { label: "Last Uploaded", value: assets[0] ? fmtDate(assets[0].createdAt) : "—", icon: "schedule", color: "text-amber-600 bg-amber-50" },
  ];

  return (
    <AdminLayout sidebar="main">
      <div className="p-8 bg-[#f8f9ff] min-h-screen">

        {/* Header */}
        <div className="flex justify-between items-end mb-10">
          <div>
            <p className="text-[11px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-2">Content</p>
            <h1 className="text-[48px] font-serif font-bold leading-tight text-black">Media Library</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setView(v => v === "grid" ? "list" : "grid")}
              className="px-4 py-2 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all rounded-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">{view === "grid" ? "view_list" : "grid_view"}</span>
              {view === "grid" ? "List" : "Grid"}
            </button>
            <button onClick={() => fileRef.current?.click()}
              disabled={!configured || uploading}
              className="px-6 py-2.5 bg-black text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-all flex items-center gap-2 rounded-lg shadow disabled:opacity-40 disabled:cursor-not-allowed">
              {uploading
                ? <><span className="material-symbols-outlined text-sm animate-spin">autorenew</span> Uploading…</>
                : <><span className="material-symbols-outlined text-sm">upload</span> Upload Images</>
              }
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => e.target.files && uploadFiles(e.target.files)} />
          </div>
        </div>

        {/* Not configured banner */}
        {!configured && !isLoading && (
          <div className="mb-8 p-5 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-600 text-2xl">cloud_off</span>
              <div>
                <p className="font-[Manrope] font-bold text-sm text-amber-800">Cloudinary not configured</p>
                <p className="font-[Manrope] text-xs text-amber-700 mt-0.5">
                  Add your Cloud Name, API Key, and API Secret in Settings to enable image uploads.
                </p>
              </div>
            </div>
            <Link href="/admin/settings">
              <button className="shrink-0 px-5 py-2 bg-amber-600 text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-amber-700 transition-all rounded-lg">
                Go to Settings
              </button>
            </Link>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="mb-6 p-4 bg-[#ffdad6] border border-[#ba1a1a]/20 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-[#ba1a1a]">error</span>
            <p className="text-sm font-[Manrope] font-bold text-[#ba1a1a]">{uploadError}</p>
            <button onClick={() => setUploadError(null)} className="ml-auto">
              <span className="material-symbols-outlined text-[#ba1a1a] text-lg">close</span>
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-xl p-5 shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center ${s.color}`}>
                  <span className="material-symbols-outlined text-lg">{s.icon}</span>
                </div>
                <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b]">{s.label}</p>
              </div>
              <p className="text-[22px] font-serif font-bold text-black leading-none">{s.value}</p>
            </div>
          ))}
        </div>

        <div className={`flex gap-6 ${selected ? "items-start" : ""}`}>

          {/* Main gallery area */}
          <div className="flex-1 min-w-0">

            {/* Toolbar */}
            <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] mb-4 px-5 py-3 flex items-center gap-4">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#7c839b] text-lg">search</span>
                <input
                  className="w-full bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg pl-9 pr-4 py-2 text-sm font-[Manrope] outline-none focus:border-black transition-colors"
                  placeholder="Search by filename or format…"
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>
              <span className="text-[11px] font-[Manrope] text-[#7c839b] whitespace-nowrap">{filtered.length} image{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Drop zone (when no images or always visible as drop target) */}
            {configured && (
              <div
                ref={dropRef}
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={`mb-4 border-2 border-dashed rounded-xl py-5 flex items-center justify-center gap-3 transition-all cursor-pointer ${
                  dragging
                    ? "border-[#006c49] bg-[#e6f7f1] text-[#006c49]"
                    : "border-[#c6c6cd] text-[#7c839b] hover:border-[#006c49] hover:bg-[#f0faf6]"
                }`}
                onClick={() => fileRef.current?.click()}
              >
                <span className="material-symbols-outlined text-2xl">{dragging ? "cloud_upload" : "upload"}</span>
                <p className="text-sm font-[Manrope] font-bold">{dragging ? "Drop to upload" : "Drag & drop images here, or click to browse"}</p>
                <span className="text-[11px] font-[Manrope] text-[#7c839b]">PNG, JPG, WEBP, GIF · Max 20 MB each</span>
              </div>
            )}

            {isLoading ? (
              <div className="bg-white rounded-xl py-32 flex items-center justify-center gap-3 text-[#7c839b] shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <span className="material-symbols-outlined animate-spin text-2xl">autorenew</span>
                <span className="font-[Manrope] text-sm">Loading library…</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-xl py-32 flex flex-col items-center justify-center gap-3 text-[#7c839b] shadow-[0px_4px_20px_rgba(15,23,42,0.05)]">
                <span className="material-symbols-outlined text-5xl text-[#c6c6cd]">photo_library</span>
                <p className="font-[Manrope] font-bold text-sm">{search ? "No images match your search" : "No images uploaded yet"}</p>
                {!search && configured && (
                  <p className="font-[Manrope] text-xs">Use the Upload button or drag & drop images above</p>
                )}
              </div>
            ) : view === "grid" ? (
              /* Grid view */
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map(asset => (
                  <div key={asset.id}
                    onClick={() => setSelected(s => s?.id === asset.id ? null : asset)}
                    className={`group relative aspect-square bg-white rounded-xl overflow-hidden cursor-pointer shadow-[0px_2px_8px_rgba(15,23,42,0.06)] transition-all hover:shadow-[0px_4px_16px_rgba(15,23,42,0.12)] ${
                      selected?.id === asset.id ? "ring-2 ring-[#006c49]" : ""
                    }`}>
                    <img src={asset.secureUrl} alt={asset.originalName}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                      <button onClick={e => { e.stopPropagation(); copyUrl(asset.secureUrl, asset.id); }}
                        className="w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow transition-all"
                        title="Copy URL">
                        <span className="material-symbols-outlined text-sm text-black">
                          {copied === asset.id ? "check" : "content_copy"}
                        </span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeleteId(asset.id); }}
                        className="w-8 h-8 bg-white/90 hover:bg-[#ffdad6] rounded-full flex items-center justify-center shadow transition-all"
                        title="Delete">
                        <span className="material-symbols-outlined text-sm text-[#ba1a1a]">delete</span>
                      </button>
                    </div>

                    {/* Format badge */}
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded pointer-events-none">
                      {asset.format}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List view */
              <div className="bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden">
                <table className="w-full">
                  <thead className="bg-[#f8f9ff] border-b border-[#e5eeff]">
                    <tr>
                      <th className="text-left text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] px-5 py-3">Image</th>
                      <th className="text-left text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] px-5 py-3">Filename</th>
                      <th className="text-left text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] px-5 py-3 hidden sm:table-cell">Dimensions</th>
                      <th className="text-left text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] px-5 py-3 hidden md:table-cell">Size</th>
                      <th className="text-left text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] px-5 py-3 hidden lg:table-cell">Uploaded</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2ff]">
                    {filtered.map(asset => (
                      <tr key={asset.id}
                        onClick={() => setSelected(s => s?.id === asset.id ? null : asset)}
                        className={`hover:bg-[#f8f9ff] transition-colors group cursor-pointer ${selected?.id === asset.id ? "bg-[#f0faf6]" : ""}`}>
                        <td className="px-5 py-3">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-[#f8f9ff] shrink-0">
                            <img src={asset.secureUrl} alt={asset.originalName} className="w-full h-full object-cover" />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <p className="text-sm font-[Manrope] font-bold text-[#0a0f0d] truncate max-w-[200px]">{asset.originalName}</p>
                          <p className="text-[11px] font-[Manrope] text-[#7c839b] uppercase">{asset.format}</p>
                        </td>
                        <td className="px-5 py-3 text-[13px] font-[Manrope] text-[#45464d] hidden sm:table-cell">
                          {asset.width && asset.height ? `${asset.width} × ${asset.height}` : "—"}
                        </td>
                        <td className="px-5 py-3 text-[13px] font-[Manrope] text-[#45464d] hidden md:table-cell">{fmtBytes(asset.bytes)}</td>
                        <td className="px-5 py-3 text-[13px] font-[Manrope] text-[#45464d] hidden lg:table-cell">{fmtDate(asset.createdAt)}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={e => { e.stopPropagation(); copyUrl(asset.secureUrl, asset.id); }}
                              className="w-8 h-8 rounded-full hover:bg-[#eff4ff] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                              <span className="material-symbols-outlined text-sm text-[#45464d]">
                                {copied === asset.id ? "check" : "content_copy"}
                              </span>
                            </button>
                            <button onClick={e => { e.stopPropagation(); setDeleteId(asset.id); }}
                              className="w-8 h-8 rounded-full hover:bg-[#ffdad6] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                              <span className="material-symbols-outlined text-sm text-[#ba1a1a]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Detail panel — slides in when an image is selected */}
          {selected && (
            <div className="w-72 shrink-0 bg-white rounded-xl shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden sticky top-6">
              <div className="aspect-square bg-[#f8f9ff] relative">
                <img src={selected.secureUrl} alt={selected.originalName} className="w-full h-full object-contain p-4" />
                <button onClick={() => setSelected(null)}
                  className="absolute top-3 right-3 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-[#f8f9ff] transition-all">
                  <span className="material-symbols-outlined text-base text-[#45464d]">close</span>
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-1">Filename</p>
                  <p className="text-sm font-[Manrope] font-bold text-[#0a0f0d] break-all">{selected.originalName}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[12px] font-[Manrope]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7c839b] mb-0.5">Format</p>
                    <p className="font-bold uppercase text-[#0a0f0d]">{selected.format}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7c839b] mb-0.5">Size</p>
                    <p className="font-bold text-[#0a0f0d]">{fmtBytes(selected.bytes)}</p>
                  </div>
                  {selected.width && selected.height && (
                    <div className="col-span-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#7c839b] mb-0.5">Dimensions</p>
                      <p className="font-bold text-[#0a0f0d]">{selected.width} × {selected.height} px</p>
                    </div>
                  )}
                  <div className="col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#7c839b] mb-0.5">Uploaded</p>
                    <p className="font-bold text-[#0a0f0d]">{fmtDate(selected.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-[Manrope] font-bold uppercase tracking-widest text-[#7c839b] mb-1.5">URL</p>
                  <div className="bg-[#f8f9ff] rounded-lg p-2 flex items-center gap-2">
                    <p className="text-[10px] font-[Manrope] text-[#45464d] truncate flex-1 font-mono">{selected.secureUrl}</p>
                    <button onClick={() => copyUrl(selected.secureUrl, selected.id + "-panel")}
                      className="shrink-0 w-7 h-7 rounded-md bg-white border border-[#c6c6cd] flex items-center justify-center hover:bg-[#006c49] hover:border-[#006c49] hover:text-white transition-all">
                      <span className="material-symbols-outlined text-sm">{copied === selected.id + "-panel" ? "check" : "content_copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <a href={selected.secureUrl} target="_blank" rel="noopener noreferrer"
                    className="flex-1 py-2 border border-[#c6c6cd] text-center font-[Manrope] font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#eff4ff] transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">open_in_new</span> Open
                  </a>
                  <button onClick={() => setDeleteId(selected.id)}
                    className="flex-1 py-2 border border-[#ffdad6] text-[#ba1a1a] font-[Manrope] font-bold text-[10px] uppercase tracking-widest rounded-lg hover:bg-[#ffdad6] transition-all flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-sm">delete</span> Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
            <div className="w-12 h-12 rounded-full bg-[#ffdad6] flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[#ba1a1a] text-2xl">delete</span>
            </div>
            <h3 className="text-[20px] font-serif font-bold text-black mb-2">Delete image?</h3>
            <p className="text-sm font-[Manrope] text-[#45464d] mb-6">
              This will remove the image from your Cloudinary account and the media library. Any products or posts using this URL will show a broken image.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 border border-[#c6c6cd] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#eff4ff] transition-all rounded-lg">
                Cancel
              </button>
              <button onClick={() => deleteMutation.mutate(deleteId!)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 bg-[#ba1a1a] text-white font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#93000a] transition-all rounded-lg disabled:opacity-60">
                {deleteMutation.isPending ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
