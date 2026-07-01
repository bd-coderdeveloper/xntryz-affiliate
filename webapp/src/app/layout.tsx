import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from '@/components/Sidebar';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FB Affiliate System",
  description: "Affiliate Product Tagging Queue Manager",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className={`${inter.className} min-h-screen bg-dark-950 flex`}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="flex-1 ml-64 min-h-screen relative">
          {children}
        </main>
      </body>
    </html>
  );
}
