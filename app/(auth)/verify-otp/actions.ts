'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';

export async function verifyOtp(
  prevState: { error: string } | null,
  formData: FormData
) {
  const otp = formData.get('otp') as string;
  const emailQuery = formData.get('email') as string; // Ideally retrieve from search params or session

  // 1. Fetch User to authenticate
  const user = await prisma.user.findUnique({
      where: { email: emailQuery }
  });

  if (!user || user.role !== 'ADMIN') {
      return { error: 'Access denied.' };
  }

  // 3. Authenticate with NextAuth via OTP
  try {
    const result = await signIn("credentials", {
        email: user.email,
        otp: otp,
        isOtpLogin: "true",
        redirect: false,
    });
    
    if (result?.error) {
        return { error: 'Invalid or expired OTP' };
    }

    redirect('/admin');
  } catch (err) {
      if (err instanceof Error && err.message.includes('redirect')) {
          throw err; // Re-throw redirect errors so Next.js can handle them
      }
      return { error: 'Authentication failed' };
  }
}
