'use client';

import { useActionState } from 'react';
import { signInWithEmail } from './actions';
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(signInWithEmail, null);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <form action={formAction} className="w-full max-w-md bg-white p-12 shadow-2xl rounded-2xl space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-slate-900">Admin Sign In</h1>
          <p className="text-slate-500 text-sm">Access the administrative dashboard.</p>
        </div>

        {state?.error && (
            <div className="rounded-md px-3 py-2 text-sm text-red-500 text-center font-bold">
            {state.error}
            </div>
        )}

        <div className='flex flex-col gap-1.5 w-full'>
          <label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Email address</label>
          <input id="email" name="email" type="email" required placeholder="admin@my-company.com"
            className="w-full border-b-2 border-slate-100 focus:border-slate-900 outline-none py-3 text-sm transition-colors"/>
        </div>

        <div className='flex flex-col gap-1.5 w-full'>
          <label htmlFor="password" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Password</label>
          <div className="relative">
            <input id="password" name="password" type={showPassword ? "text" : "password"} required placeholder="*****"
              className="w-full border-b-2 border-slate-100 focus:border-slate-900 outline-none py-3 text-sm transition-colors pr-10"/>
            <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isPending}
          className="w-full bg-slate-900 text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-600 transition-all rounded-lg shadow-lg active:scale-95 disabled:bg-slate-300">
          {isPending ? "Authenticating..." : "Sign In (Admin)"}
        </button>
      </form>
    </div>
  );
}
