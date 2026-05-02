'use client';

import { useActionState } from 'react';
import { initiateAdminOtp } from './actions';

export default function AdminLoginPage() {
  const [state, formAction, isPending] = useActionState(initiateAdminOtp, null);

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <form action={formAction} className="w-full max-w-md bg-white p-12 shadow-2xl rounded-2xl space-y-10">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-serif text-slate-900">Admin Sign In</h1>
          <p className="text-slate-500 text-sm">Access the administrative dashboard via OTP.</p>
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

        <button type="submit" disabled={isPending}
          className="w-full bg-slate-900 text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-600 transition-all rounded-lg shadow-lg active:scale-95 disabled:bg-slate-300">
          {isPending ? "Sending OTP..." : "Get OTP Link"}
        </button>
      </form>
    </div>
  );
}
