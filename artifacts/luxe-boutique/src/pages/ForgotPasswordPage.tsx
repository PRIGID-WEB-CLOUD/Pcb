import { useState } from "react";
import { Link } from "wouter";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {submitted ? (
          <div className="text-center">
            <h1 className="font-serif text-3xl text-slate-900 mb-3">Check Your Inbox</h1>
            <p className="text-slate-500 text-sm mb-8">
              If an account exists for <strong>{email}</strong>, a password reset link will be sent shortly.
            </p>
            <Link href="/login">
              <button className="text-xs tracking-widest uppercase font-bold text-slate-500 hover:text-slate-900 transition-colors border-b border-slate-300 pb-0.5">
                Return to Sign In
              </button>
            </Link>
          </div>
        ) : (
          <>
            <h1 className="font-serif text-3xl text-slate-900 mb-2 text-center">Forgot Password</h1>
            <p className="text-slate-400 text-sm text-center mb-10">Enter your email and we'll send a reset link.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="text-[10px] uppercase tracking-widest font-bold text-slate-500 block mb-2">Email Address</label>
                <input
                  type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full border-b border-slate-200 py-3 text-sm focus:outline-none focus:border-slate-900 bg-transparent transition-colors"
                />
              </div>
              <button type="submit"
                className="w-full py-4 bg-slate-900 text-white text-xs tracking-widest uppercase font-bold hover:bg-emerald-700 transition-colors">
                Send Reset Link
              </button>
            </form>
            <p className="text-center mt-6 text-xs text-slate-400">
              Remembered it?{" "}
              <Link href="/login" className="font-bold text-slate-700 hover:text-slate-900">Sign In</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
