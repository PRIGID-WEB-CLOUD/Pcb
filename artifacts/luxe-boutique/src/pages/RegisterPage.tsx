import { useState } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [, navigate] = useLocation();
  const { register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    const result = await register(name, email, password);
    if (result.error) { setError(result.error); setLoading(false); }
    else navigate("/login");
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md bg-white p-12 shadow-2xl rounded-2xl space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-slate-900">Join Luxe</h1>
          <p className="text-slate-500 text-sm">Become a member of our exclusive boutique.</p>
        </div>
        {error && <p className="text-red-500 text-xs text-center font-bold tracking-widest">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Full Name</label>
            <input type="text" required value={name} onChange={e => setName(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-slate-900 outline-none py-3 text-sm transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-slate-900 outline-none py-3 text-sm transition-colors" />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} required value={password} onChange={e => setPassword(e.target.value)} className="w-full border-b-2 border-slate-100 focus:border-slate-900 outline-none py-3 text-sm transition-colors pr-10" placeholder="Minimum 8 characters" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all rounded-lg shadow-lg active:scale-95 disabled:bg-slate-300">
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>
        <div className="text-center">
          <p className="text-slate-500 text-xs font-medium">Already have an account?{" "}
            <Link href="/login" className="text-slate-900 font-bold hover:text-emerald-600 transition-colors">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
