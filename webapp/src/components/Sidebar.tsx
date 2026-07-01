"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Sidebar() {
  const pathname = usePathname();

  const links = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/tasks', icon: ShoppingBag, label: 'Task Queue' },
  ];

  return (
    <aside className="w-64 bg-dark-900/80 backdrop-blur-3xl border-r border-dark-800/60 flex flex-col fixed inset-y-0 left-0 z-20 shadow-2xl">
      <div className="p-6 shrink-0 border-b border-dark-800/60 relative overflow-hidden">
        {/* Subtle glow behind logo */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-orange-500/20 rounded-full blur-2xl"></div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-orange-400 to-orange-600 relative z-10">
          FB Affiliate System
        </h1>
        <p className="text-xs text-dark-400 mt-1 relative z-10">RPA Queue Manager</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={`relative flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300 ${
                isActive ? 'text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-orange-500/10 rounded-xl border border-orange-500/20"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-orange-500 rounded-r-full shadow-[0_0_10px_rgba(255,133,21,0.8)]"></div>
              )}
              
              <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-orange-400' : 'text-dark-500 group-hover:text-dark-300'}`} />
              <span className="font-medium relative z-10">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-dark-800/60 shrink-0">
        <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-dark-400 hover:text-red-400 hover:bg-red-500/10 transition-colors group">
          <LogOut className="w-5 h-5 text-dark-500 group-hover:text-red-400 transition-colors" />
          <span className="font-medium">ออกจากระบบ</span>
        </button>
      </div>
    </aside>
  );
}
