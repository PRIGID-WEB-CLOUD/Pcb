import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Return a successful response even if the user doesn't exist to prevent email enumeration
      return NextResponse.json({ message: "If an account exists, a reset link will be provided.", resetLink: null });
    }

    // Generate token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    await prisma.user.update({
      where: { email },
      data: {
        resetToken: token,
        resetTokenExpiry: tokenExpiry,
      },
    });

    // In a real application, you would send an email here using a service like Resend, Sendgrid, etc.
    // For this demonstration, we'll return the reset link directly in the response so it can be shown in the UI.
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/reset-password?token=${token}`;

    console.log(`[Email Service Mock] Password reset link for ${email}: ${resetUrl}`);

    return NextResponse.json({ 
      message: "If an account exists, a reset link will be provided.",
      resetLink: resetUrl // We return this to show in the UI for the demo only
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
