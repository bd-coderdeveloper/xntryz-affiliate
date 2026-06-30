import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LayoutDashboard, ShoppingBag, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';

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
        <aside className="w-64 bg-dark-900 border-r border-dark-800/60 flex flex-col fixed inset-y-0 left-0 z-20">
          <div className="p-6 shrink-0 border-b border-dark-800/60">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600">
              FB Affiliate System
            </h1>
            <p className="text-xs text-dark-400 mt-1">RPA Queue Manager</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800/50 transition-colors">
              <LayoutDashboard className="w-5 h-5 text-orange-400" />
              <span className="font-medium">Dashboard</span>
            </Link>
            
            <Link href="/tasks" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-dark-300 hover:text-white hover:bg-dark-800/50 transition-colors">
              <ShoppingBag className="w-5 h-5 text-orange-400" />
              <span className="font-medium">Task Queue</span>
            </Link>
          </nav>

          <div className="p-4 border-t border-dark-800/60 shrink-0">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-dark-300 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">ออกจากระบบ</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-64 min-h-screen relative">
          {children}
        </main>
      </body>
    </html>
  );
}
