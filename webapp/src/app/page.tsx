"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, CheckCircle, Clock, RefreshCw, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { motion, Variants } from 'framer-motion';

export default function Home() {
  const [stats, setStats] = useState({
    pending: 0,
    processing: 0,
    completed: 0,
    failed: 0,
    already_exists: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('affiliate_tasks')
        .select('status');
        
      if (error) throw error;
      
      const counts = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        already_exists: 0,
        total: data ? data.length : 0
      };
      
      if (data) {
        data.forEach(task => {
          if (task.status in counts) {
            counts[task.status as keyof typeof counts]++;
          }
        });
      }
      
      setStats(counts);
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  return (
    <div className="p-8 pb-20 font-sans min-h-screen relative">
      <motion.div 
        className="flex flex-col gap-8 max-w-6xl mx-auto relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        
        {/* Header */}
        <motion.div variants={itemVariants} className="glass-panel p-10 rounded-[2rem] flex flex-col md:flex-row items-start md:items-center justify-between relative overflow-hidden group">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500/20 to-transparent blur-2xl group-hover:from-orange-500/30 transition-all duration-700"></div>
          <div className="relative z-10">
            <h1 className="text-4xl font-extrabold text-white mb-3 tracking-tight">
              Dashboard Overview
            </h1>
            <p className="text-dark-300 text-lg">
              ยินดีต้อนรับสู่ระบบจัดการคิวงาน Affiliate (FB Affiliate System)
            </p>
          </div>
          <button 
            onClick={fetchStats}
            className="mt-6 md:mt-0 relative z-10 flex items-center gap-2 px-5 py-2.5 bg-dark-800/80 hover:bg-dark-700/80 border border-dark-700 text-dark-200 hover:text-white rounded-xl transition-all shadow-lg"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
            รีเฟรชข้อมูล
          </button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Pending */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3.5 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-medium text-dark-200">Pending</h3>
            </div>
            <p className="text-5xl font-bold text-white tracking-tight">{loading ? '...' : stats.pending}</p>
            <p className="text-sm text-blue-400 font-medium mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span> รอดำเนินการ
            </p>
          </div>

          {/* Processing */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3.5 bg-orange-500/10 rounded-2xl border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]">
                <RefreshCw className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="text-lg font-medium text-dark-200">Processing</h3>
            </div>
            <p className="text-5xl font-bold text-white tracking-tight">{loading ? '...' : stats.processing}</p>
            <p className="text-sm text-orange-400 font-medium mt-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span> กำลังทำงาน
            </p>
          </div>
          
          {/* Completed */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3.5 bg-green-500/10 rounded-2xl border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.15)]">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-medium text-dark-200">Completed</h3>
            </div>
            <p className="text-5xl font-bold text-white tracking-tight">{loading ? '...' : stats.completed}</p>
            <p className="text-sm text-green-400 font-medium mt-3">
              แท็กสำเร็จแล้ว
            </p>
          </div>

          {/* Already Exists */}
          <div className="glass-panel rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3.5 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
                <CheckCircle className="w-6 h-6 text-yellow-400" />
              </div>
              <h3 className="text-lg font-medium text-dark-200">Skipped</h3>
            </div>
            <p className="text-5xl font-bold text-white tracking-tight">{loading ? '...' : stats.already_exists}</p>
            <p className="text-sm text-yellow-400 font-medium mt-3">
              มีลิงก์อยู่แล้ว
            </p>
          </div>
        </motion.div>

        {/* Failed Banner if any */}
        {stats.failed > 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="glass-panel bg-red-950/20 border-red-900/50 rounded-2xl p-6 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-red-200">Attention Needed</h4>
                <p className="text-red-300/80">พบงานที่ทำงานล้มเหลวจำนวน {stats.failed} รายการ</p>
              </div>
            </div>
            <Link href="/tasks" className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-colors font-medium">
              ตรวจสอบ
            </Link>
          </motion.div>
        )}

        {/* CTA */}
        <motion.div variants={itemVariants} className="glass-panel rounded-[2rem] p-12 text-center relative overflow-hidden group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-orange-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 bg-dark-800/80 border border-dark-700 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-500 group-hover:rotate-6">
              <ShoppingBag className="w-10 h-10 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">พร้อมเริ่มงานหรือยัง?</h2>
            <p className="text-dark-300 mb-8 max-w-md text-lg">
              ไปที่หน้า Task Queue เพื่อดึงโพสต์จากเพจของคุณ และจัดคิวงานให้ Bot ทำงานอัตโนมัติ
            </p>
            <Link href="/tasks" className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-lg w-auto min-w-[200px] justify-center">
              จัดการคิวงาน
            </Link>
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
