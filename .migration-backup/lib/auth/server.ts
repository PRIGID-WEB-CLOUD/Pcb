import { createNeonAuth } from '@neondatabase/auth/next/server';

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL || "https://placeholder-auth.neon.tech",
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET || "default-secret-at-least-thirty-two-chars-long",
    sessionDataTtl: 300,
  },
});
