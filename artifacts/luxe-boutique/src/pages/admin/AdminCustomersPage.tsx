import { useQuery } from "@tanstack/react-query";
import AdminLayout from "./AdminLayout";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: "USER" | "ADMIN";
  createdAt: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name: string | null, email: string) {
  if (name) {
    const parts = name.trim().split(" ");
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

export default function AdminCustomersPage() {
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const admins = users.filter(u => u.role === "ADMIN");
  const regularUsers = users.filter(u => u.role === "USER");

  return (
    <AdminLayout sidebar="main">
      <div className="flex-1 ml-0 p-6 max-w-[1280px] mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-[48px] font-serif font-bold text-black mb-2">Customers</h1>
            <p className="font-[Manrope] text-[#45464d] max-w-md">View all registered users in the boutique ecosystem.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: "Total Users", icon: "people", value: users.length },
            { label: "Customers", icon: "person", value: regularUsers.length },
            { label: "Admins", icon: "admin_panel_settings", value: admins.length },
          ].map((m) => (
            <div key={m.label} className="bg-white p-6 shadow-[0px_4px_20px_rgba(15,23,42,0.05)] border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <span className="font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#7c839b]">{m.label}</span>
                <span className="material-symbols-outlined text-[#006c49]">{m.icon}</span>
              </div>
              <div className="text-[36px] font-serif font-bold text-black">{m.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white shadow-[0px_4px_20px_rgba(15,23,42,0.05)] overflow-hidden border border-slate-100">
          {isLoading ? (
            <div className="p-16 text-center text-[#7c839b] font-[Manrope]">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-16 text-center text-[#7c839b] font-[Manrope]">No users found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {["NAME", "EMAIL", "ROLE", "JOINED"].map((h) => (
                    <th key={h} className="px-6 py-4 font-[Manrope] font-bold text-[11px] tracking-widest uppercase text-[#7c839b]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-sm text-slate-600">
                          {getInitials(u.name, u.email)}
                        </div>
                        <span className="font-serif text-sm font-semibold text-black">{u.name ?? "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-[Manrope] text-[#45464d] text-sm">{u.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold font-[Manrope] ${
                        u.role === "ADMIN"
                          ? "bg-[#dce9ff] text-[#003399]"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-[Manrope] text-[#45464d] text-sm">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="p-6 border-t border-slate-50 font-[Manrope] font-bold text-[11px] tracking-widest text-[#45464d] uppercase">
            Showing {users.length} user{users.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
