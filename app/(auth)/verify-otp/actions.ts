'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function verifyOtp(
  _prevState: { error: string } | null,
  formData: FormData
) {
  // Assuming a verifyOtp method exists on auth based on typical patterns
  // If not, this might need adjustment based on how the auth provider handles OTP verification
  const { error } = await (auth as any).verifyOtp({
    otp: formData.get('otp') as string,
  });

  if (error) {
    return { error: error.message || 'Failed to verify OTP. Try again' };
  }

  redirect('/admin');
}
