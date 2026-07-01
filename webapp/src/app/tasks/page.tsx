"use client";

import { useState, useEffect } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle, Trash2, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';

type Task = {
  id: string;
  post_id: string;
  product_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'already_exists';
  created_at: string;
  thumbnail_url?: string;
  post_url?: string;
  error_message?: string;
  link_name?: string;
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('public:affiliate_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'affiliate_tasks' }, (payload) => {
        fetchTasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('affiliate_tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetFailed = async () => {
    try {
      await supabase
        .from('affiliate_tasks')
        .update({ status: 'pending', error_message: null })
        .in('status', ['failed', 'processing']);
      
      fetchTasks();
    } catch (err) {
      console.error('Error resetting tasks:', err);
    }
  };

  const handleClearCompleted = async () => {
    if (!confirm("ต้องการล้างประวัติงานที่ทำเสร็จแล้วใช่หรือไม่?")) return;
    
    try {
      await supabase
        .from('affiliate_tasks')
        .delete()
        .eq('status', 'completed');
      
      fetchTasks();
    } catch (err) {
      console.error('Error clearing tasks:', err);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!confirm("ต้องการลบคิวงานนี้ใช่หรือไม่?")) return;
    try {
      await supabase.from('affiliate_tasks').delete().eq('id', id);
      fetchTasks();
    } catch (err) {
      console.error('Error deleting task:', err);
    }
  };

  const getStatusBadge = (status: Task['status'], errorMsg?: string) => {
    switch(status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1.5 text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full text-xs font-medium"><Clock className="w-3.5 h-3.5"/> รอดำเนินการ</span>;
      case 'processing':
        return <span className="inline-flex items-center gap-1.5 text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-full text-xs font-medium"><RefreshCw className="w-3.5 h-3.5 animate-spin"/> กำลังแท็ก</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1.5 text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full text-xs font-medium"><CheckCircle className="w-3.5 h-3.5"/> สำเร็จ</span>;
      case 'failed':
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="inline-flex items-center gap-1.5 text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full text-xs font-medium"><XCircle className="w-3.5 h-3.5"/> ล้มเหลว</span>
            {errorMsg && <span className="text-[10px] text-red-400/80 max-w-[200px] truncate" title={errorMsg}>{errorMsg}</span>}
          </div>
        );
      case 'already_exists':
        return <span className="inline-flex items-center gap-1.5 text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full text-xs font-medium"><CheckCircle className="w-3.5 h-3.5"/> มีอยู่แล้ว</span>;
    }
  };

  return (
    <div className="p-8 pb-20 font-sans max-w-7xl mx-auto">
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8"
      >
        <div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Task Queue</h1>
          <p className="text-dark-300">จัดการคิวงานการแท็กสินค้าในโพสต์ของคุณ</p>
        </div>
        
        <div className="flex gap-3 mt-4 md:mt-0">
          <button 
            onClick={handleResetFailed} 
            className="bg-dark-900 border border-dark-700 text-dark-300 hover:text-white hover:bg-dark-800 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium shadow-lg"
          >
            <RefreshCw className="w-4 h-4" /> รีเซ็ตงานที่มีปัญหา
          </button>
          <button 
            onClick={handleClearCompleted} 
            className="bg-dark-900 border border-dark-700 text-dark-300 hover:text-red-400 hover:bg-red-950 transition-colors px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium shadow-lg"
          >
            <Trash2 className="w-4 h-4" />
            ล้างประวัติสำเร็จ
          </button>
        </div>
      </motion.div>

      {/* Task List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-[2rem] overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between p-6 border-b border-dark-800/60 bg-dark-950/30">
          <h3 className="text-lg font-bold text-white">คิวงานปัจจุบัน</h3>
          <button onClick={fetchTasks} className="text-dark-400 hover:text-white transition-colors p-2 bg-dark-800/50 hover:bg-dark-700/50 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-400' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-sm text-dark-300 border-collapse">
            <thead className="bg-dark-950/50 text-dark-400 font-medium border-b border-dark-800/60">
              <tr>
                <th className="px-6 py-4 w-12"></th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Thumbnail</th>
                <th className="px-6 py-4">Post ID</th>
                <th className="px-6 py-4">Product ID</th>
                <th className="px-6 py-4 text-right">เวลาของโพสต์</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800/30">
              <AnimatePresence>
                {tasks.length === 0 && !loading && (
                  <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <td colSpan={6} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-dark-800/50 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle className="w-8 h-8 text-dark-500" />
                        </div>
                        <p className="text-lg text-dark-300 font-medium">ไม่มีคิวงานในขณะนี้</p>
                        <p className="text-sm text-dark-500 mt-1">ใช้งานส่วนเสริมเพื่อดึงโพสต์จากเพจ</p>
                      </div>
                    </td>
                  </motion.tr>
                )}
                
                {tasks.map(task => (
                  <motion.tr 
                    key={task.id}
                    initial={{ opacity: 0, backgroundColor: 'rgba(0,0,0,0)' }}
                    animate={{ opacity: 1, backgroundColor: 'rgba(0,0,0,0)' }}
                    exit={{ opacity: 0 }}
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                    className="transition-colors group"
                  >
                    <td className="px-6 py-4">
                      {task.status === 'pending' || task.status === 'failed' ? (
                        <button 
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-dark-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="ลบงานนี้"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(task.status, task.error_message)}
                    </td>
                    <td className="px-6 py-4">
                      {task.thumbnail_url ? (
                        <div className="w-16 h-16 rounded-xl overflow-hidden border border-dark-700/50 relative shadow-md group-hover:border-orange-500/30 transition-colors">
                          <img src={task.thumbnail_url} alt="thumbnail" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-dark-800/50 border border-dark-700/30 flex items-center justify-center text-dark-500">
                          <ImageIcon className="w-6 h-6 opacity-50" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium text-dark-200">
                      {task.post_url ? (
                        <a href={task.post_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-orange-400 transition-colors">
                          {task.post_id}
                          <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      ) : (
                        <span>{task.post_id}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {task.product_id ? (
                        <span className="bg-dark-800/50 px-2.5 py-1 rounded-md text-xs border border-dark-700/50 font-mono text-dark-200">
                          {task.product_id}
                        </span>
                      ) : (
                        <span className="text-dark-500 italic">No Product ID</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-dark-400 text-sm">
                      {task.link_name ? (
                        <span className="text-orange-300 font-medium">{task.link_name}</span>
                      ) : (
                        <span>{new Date(task.created_at).toLocaleString('th-TH')}</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}
