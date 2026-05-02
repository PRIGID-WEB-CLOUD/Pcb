'use client';

import { useActionState } from 'react';
import { verifyOtp } from './actions';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function VerifyOtpForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [state, formAction, isPending] = useActionState(verifyOtp, null);

  return (
    <form action={formAction} className="w-full max-w-md bg-white p-12 shadow-2xl rounded-2xl space-y-10">
      <input type="hidden" name="email" value={email} />
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-serif text-slate-900">Verify OTP</h1>
        <p className="text-slate-500 text-sm">Enter the code sent to {email}.</p>
      </div>

      {state?.error && (
          <div className="rounded-md px-3 py-2 text-sm text-red-500 text-center font-bold">
          {state.error}
          </div>
      )}

      <div className='flex flex-col gap-1.5 w-full'>
        <label htmlFor="otp" className="text-[10px] font-bold uppercase tracking-widest text-slate-400">OTP Code</label>
        <input id="otp" name="otp" type="text" required placeholder="123456"
          className="w-full border-b-2 border-slate-100 focus:border-slate-900 outline-none py-3 text-sm transition-colors text-center text-2xl tracking-widest"/>
      </div>

      <button type="submit" disabled={isPending}
        className="w-full bg-slate-900 text-white py-5 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-600 transition-all rounded-lg shadow-lg active:scale-95 disabled:bg-slate-300">
        {isPending ? "Verifying..." : "Verify"}
      </button>
    </form>
  );
}

export default function VerifyOtpPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <Suspense>
                <VerifyOtpForm />
            </Suspense>
        </div>
    );
}
