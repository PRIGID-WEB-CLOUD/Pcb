'use server';

import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { signIn } from '@/lib/auth';

// NOTE: In a production app, you would integrate with an SMS/Email service like Twilio or Nodemailer.
// This is a placeholder for OTP generation and verification logic.
export async function initiateAdminOtp(
  _prevState: { error: string } | null,
  formData: FormData
) {
  const email = formData.get('email') as string;
  
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || user.role !== 'ADMIN') {
    return { error: 'Invalid admin credentials or not an admin.' };
  }

  // 1. Generate OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); 
  
  // 2. Store OTP in database for verification
  await prisma.user.update({
    where: { id: user.id },
    data: { 
        otpCode,
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
    }
  });

  // Mock: Log the OTP to console since we don't have an email provider
  console.log(`[OTP DEBUG] Code for ${email}: ${otpCode}`);

  // 3. For MVP: just redirect to OTP page
  redirect('/verify-otp?email=' + encodeURIComponent(email));
}
