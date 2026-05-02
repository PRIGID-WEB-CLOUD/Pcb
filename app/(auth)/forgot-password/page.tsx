"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      
      if (res.ok) {
        setSubmitted(true);
        if (data.resetLink) {
          setResetLink(data.resetLink);
        }
      } else {
        // Just show submitted anyway to prevent enumeration, or alert error
        setSubmitted(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white p-12 shadow-2xl rounded-2xl space-y-10"
      >
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-slate-900">Reset Password</h1>
          <p className="text-slate-500 text-sm">Provide your email address to receive reset instructions.</p>
        </div>

        {submitted ? (
          <div className="text-center space-y-8">
            <div className="bg-slate-50 p-6 rounded-2xl">
              <p className="text-slate-900 font-medium text-sm">Action Required</p>
              <p className="text-slate-500 text-xs mt-2 leading-relaxed">
                If an account exists for <span className="font-bold">{email}</span>, you will receive a password reset link shortly. Please check your inbox.
              </p>
              
              {resetLink && (
                <div className="mt-6 p-4 bg-emerald-50 text-emerald-900 rounded-lg text-xs leading-relaxed border border-emerald-100">
                  <p className="font-bold mb-2 uppercase tracking-widest text-[10px]">Development Environment Note</p>
                  <p>In a production application, an email would be sent to the user. For this preview, use this mock email link to reset your password:</p>
                  <Link href={resetLink} className="inline-block mt-3 px-4 py-2 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition-colors">
                    Mock Reset Password Link
                  </Link>
                </div>
              )}
            </div>
            <Link 
              href="/login"
              className="block w-full bg-slate-900 text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all rounded-lg shadow-lg active:scale-95"
            >
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border-b-2 border-slate-100 focus:border-slate-900 outline-none py-3 text-sm transition-colors"
                placeholder="Enter your registered email"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-emerald-600 transition-all rounded-lg shadow-lg active:scale-95 disabled:bg-slate-300"
            >
              {loading ? "Transmitting..." : "Send Reset Link"}
            </button>
          </form>
        )}

        {!submitted && (
          <div className="text-center">
            <p className="text-slate-500 text-xs font-medium">
              Remembered your password?{" "}
              <Link href="/login" className="text-slate-900 font-bold hover:text-emerald-600 transition-colors">
                Sign In
              </Link>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
