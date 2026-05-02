'use server';

import { auth } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export async function initiateAdminOtp(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = formData.get('email') as string;
  
  // Neon Auth handles the OTP trigger
  const { error } = await auth.signIn.emailOtp({
    email,
  });

  if (error) {
    return { error: error.message };
  }

  redirect('/verify-otp?email=' + encodeURIComponent(email));
}
