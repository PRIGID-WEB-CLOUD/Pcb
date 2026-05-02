import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        isOtpLogin: { label: "isOtpLogin", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        });

        if (!user) return null;

        // OTP Login Flow (Admin Only)
        if (credentials.isOtpLogin === "true") {
          if (user.role !== "ADMIN") return null;
          if (!credentials.otp || !user.otpCode) return null;
          
          // Check OTP code and expiry
          if (user.otpCode !== credentials.otp) return null;
          if (user.otpExpiry && new Date() > new Date(user.otpExpiry)) return null;

          // Clear OTP after successful use
          await prisma.user.update({
            where: { id: user.id },
            data: { otpCode: null, otpExpiry: null }
          });

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        // Standard Password Flow
        if (!credentials?.password) return null;
        const isValid = await bcrypt.compare(credentials.password as string, user.password);

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
