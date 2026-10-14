import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AMP CSR Portal',
  description: 'Customer Service Representative Portal for AMP Car Wash Memberships',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
