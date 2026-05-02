import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import AuthProvider from '@/components/AuthProvider';
import CookieBanner from '@/components/CookieBanner';
import { CurrencyProvider } from '@/components/CurrencyContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'LUXE BOUTIQUE | Definitive Modern Elegance',
  description: 'A curated selection of luxury fashion, home, and lifestyle essentials.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
        <body suppressHydrationWarning className="bg-white min-h-screen flex flex-col font-sans antialiased text-slate-900 selection:bg-slate-900 selection:text-white">
          <AuthProvider>
            <CurrencyProvider>
              <main className="flex-grow">
                {children}
              </main>
              <CookieBanner />
            </CurrencyProvider>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
