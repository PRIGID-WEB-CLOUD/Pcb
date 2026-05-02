'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function verifyOtp(
  prevState: { error: string } | null,
  formData: FormData
) {
  const otp = formData.get('otp') as string;
  const email = formData.get('email') as string;

  try {
    const { error } = await auth.signIn.emailOtp({
      email,
      passcode: otp,
    });

    if (error) {
      return { error: error.message || 'Invalid or expired OTP' };
    }

    redirect('/admin');
  } catch (err) {
    if (err instanceof Error && err.message.includes('redirect')) {
      throw err;
    }
    return { error: 'Authentication failed' };
  }
}
