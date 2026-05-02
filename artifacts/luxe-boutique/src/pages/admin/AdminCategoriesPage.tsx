import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type Category = { id: string; name: string };

export default function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setNewName("");
      setFormError(null);
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update category");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setEditId(null);
      setEditName("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to delete category");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setDeleteConfirm(null);
      setDeleteError(null);
    },
    onError: (e: Error) => {
      setDeleteConfirm(null);
      setDeleteError(e.message);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) { setFormError("Name is required"); return; }
    createMutation.mutate(newName.trim());
  };

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setEditName(cat.name);
  };

  return (
    <AdminLayout sidebar="main">
      <div className="p-8 max-w-[900px] mx-auto">
        <div className="mb-12">
          <h2 className="text-[36px] font-serif font-bold">Categories</h2>
          <p className="text-[#7c839b] text-[16px] mt-1">Organize your product catalog with categories.</p>
        </div>

        <div className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)] p-6 mb-8 rounded-sm">
          <h3 className="text-[16px] font-serif font-semibold mb-4">Add New Category</h3>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              className="flex-1 bg-[#f8f9ff] border border-[#c6c6cd] px-4 py-2 font-[Manrope] outline-none focus:border-black"
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Category name"
            />
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-black text-white px-6 py-2 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:bg-[#006c49] transition-colors disabled:opacity-60"
            >
              {createMutation.isPending ? "Adding..." : "Add"}
            </button>
          </form>
          {formError && <p className="mt-2 text-sm text-[#ba1a1a] font-[Manrope]">{formError}</p>}
        </div>

        {deleteError && (
          <div className="mb-4 p-4 bg-[#ffdad6] text-[#93000a] text-sm font-[Manrope] rounded flex items-start justify-between gap-3">
            <span>{deleteError}</span>
            <button onClick={() => setDeleteError(null)} className="shrink-0 text-[#93000a] hover:opacity-70">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        <div className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden rounded-sm">
          {isLoading ? (
            <div className="p-12 text-center text-[#7c839b] font-[Manrope]">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="p-12 text-center text-[#7c839b] font-[Manrope]">No categories yet. Add one above.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#eff4ff] border-b border-slate-100">
                  <th className="p-6 font-[Manrope] font-bold text-[11px] text-[#7c839b] tracking-widest uppercase">Name</th>
                  <th className="p-6 font-[Manrope] font-bold text-[11px] text-[#7c839b] tracking-widest uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-6">
                      {editId === cat.id ? (
                        <input
                          className="bg-[#f8f9ff] border border-[#c6c6cd] px-3 py-1.5 font-[Manrope] outline-none focus:border-black w-full max-w-xs"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          autoFocus
                        />
                      ) : (
                        <span className="font-[Manrope] font-semibold text-[#0b1c30]">{cat.name}</span>
                      )}
                    </td>
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        {editId === cat.id ? (
                          <>
                            <button
                              onClick={() => updateMutation.mutate({ id: cat.id, name: editName })}
                              disabled={updateMutation.isPending}
                              className="text-[#006c49] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:underline"
                            >
                              {updateMutation.isPending ? "Saving..." : "Save"}
                            </button>
                            <button
                              onClick={() => setEditId(null)}
                              className="text-slate-400 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(cat)}
                              className="text-[#006c49] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:underline"
                            >
                              Edit
                            </button>
                            {deleteConfirm === cat.id ? (
                              <>
                                <button
                                  onClick={() => deleteMutation.mutate(cat.id)}
                                  disabled={deleteMutation.isPending}
                                  className="text-[#ba1a1a] font-[Manrope] font-bold text-xs tracking-widest uppercase hover:underline"
                                >
                                  {deleteMutation.isPending ? "Deleting..." : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="text-slate-400 font-[Manrope] font-bold text-xs tracking-widest uppercase hover:text-slate-700"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(cat.id)}
                                className="text-slate-400 hover:text-[#ba1a1a] font-[Manrope] font-bold text-xs tracking-widest uppercase transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="p-6 border-t border-slate-100">
            <p className="text-xs text-[#7c839b] font-[Manrope]">{categories.length} categor{categories.length !== 1 ? "ies" : "y"}</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
