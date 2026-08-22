import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RecoverAI | Autonomous Revenue Recovery Platform',
  description: 'Production-grade AI-powered payment recovery and revenue operations platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
