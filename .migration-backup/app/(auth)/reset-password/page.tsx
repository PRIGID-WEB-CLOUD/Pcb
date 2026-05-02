"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
import { Eye, EyeOff } from "lucide-react";

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();
      
      if (res.ok) {
        setSubmitted(true);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error(error);
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-6">
        <p className="text-rose-600 text-sm font-medium">Invalid or missing reset token.</p>
        <Link 
          href="/forgot-password"
          className="block w-full bg-slate-900 text-white py-4 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all rounded-lg"
        >
          Request New Link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {submitted ? (
        <div className="text-center space-y-8">
          <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl text-emerald-900">
            <p className="font-bold text-sm">Update Successful</p>
            <p className="text-xs mt-2 leading-relaxed">
              Your password has been securely reset. You can now access your account with your new credentials.
            </p>
          </div>
          <Link 
            href="/login"
            className="block w-full bg-slate-900 text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all rounded-lg shadow-lg active:scale-95"
          >
            Sign In Now
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-rose-50 text-rose-600 text-xs font-bold p-4 rounded-xl text-center uppercase tracking-wider">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b-2 border-slate-100 focus:border-slate-900 outline-none py-3 text-sm transition-colors pr-10"
                placeholder="Minimum 8 characters"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-slate-900 text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all rounded-lg shadow-lg active:scale-95 disabled:bg-slate-300"
          >
            {loading ? "Updating..." : "Confirm New Password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-12 shadow-2xl rounded-2xl space-y-10"
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-slate-900">Set Password</h1>
          <p className="text-slate-500 text-sm">Please create a new password for your account.</p>
        </div>

        <Suspense fallback={<div className="text-center text-sm text-slate-500">Loading form...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
