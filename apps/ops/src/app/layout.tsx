import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RecoverAI | Chaos & Simulation Console',
  description: 'Synthetic batch generation and failure injection console for RecoverAI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
