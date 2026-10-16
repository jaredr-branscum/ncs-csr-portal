import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'AMP CSR Portal — Customer Service & Memberships',
  description:
    'Customer Service Representative portal for AMP car wash memberships, vehicle subscriptions, and billing support.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="bg-slate-50 text-slate-900 antialiased h-full overflow-hidden flex flex-col">
        <Header />
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden">{children}</main>
      </body>
    </html>
  );
}
