import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/QueryProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: { default: "Uni's Music", template: "%s | Uni's Music" },
  description: 'Music for Everyone. Opportunities for Artists.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: "Uni's Music" },
  openGraph: {
    type: 'website',
    siteName: "Uni's Music",
    title: "Uni's Music",
    description: 'Music for Everyone. Opportunities for Artists.',
  },
};

export const viewport: Viewport = {
  themeColor: '#7C3AED',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="min-h-screen bg-bg text-white antialiased" style={{ background: '#0d0121' }}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
