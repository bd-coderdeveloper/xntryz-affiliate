'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import { RefreshCw, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';

type AffiliateTask = {
  id: string;
  post_id: string;
  product_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
};

export default function TaskQueuePage() {
  const [tasks, setTasks] = useState<AffiliateTask[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [postId, setPostId] = useState('');
  const [productId, setProductId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('affiliate_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleAddTask = async () => {
    if (!postId || !productId) return alert('กรุณากรอกข้อมูลให้ครบถ้วน');
    setIsAdding(true);

    const { error } = await supabase
      .from('affiliate_tasks')
      .insert({
        page_id: 'MANUAL', // TODO: เปลี่ยนเป็นดึงจาก Extension ภายหลัง
        post_id: postId,
        product_id: productId
      });

    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      setPostId('');
      setProductId('');
      fetchTasks();
    }
    setIsAdding(false);
  };

  const handleResetFailed = async () => {
    if (!confirm('คุณต้องการรีเซ็ตคิวงานที่ "ล้มเหลว" หรือ "ค้างกำลังแท็ก" ให้กลับมา "รอดำเนินการ" ใหม่ทั้งหมดหรือไม่?')) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('affiliate_tasks')
      .update({ status: 'pending', error_message: null })
      .in('status', ['failed', 'processing']);
      
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      fetchTasks();
    }
  };

  const handleClearCompleted = async () => {
    if (!confirm('คุณต้องการลบประวัติคิวงานที่ "สำเร็จแล้ว" ทั้งหมดหรือไม่?')) return;
    
    setLoading(true);
    const { error } = await supabase
      .from('affiliate_tasks')
      .delete()
      .eq('status', 'completed');
      
    if (error) {
      alert(`Error: ${error.message}`);
    } else {
      fetchTasks();
    }
  };

  return (
    <div className="p-8 pb-20 font-sans">
      <div className="flex flex-col gap-8 max-w-5xl mx-auto">
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Task Queue</h1>
            <p className="text-dark-300">จัดการคิวงานสำหรับ Bot อัตโนมัติ</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleResetFailed} className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium border border-orange-500/30">
              <RefreshCw className="w-4 h-4" /> รีเซ็ตงานที่มีปัญหา
            </button>
            <button onClick={handleClearCompleted} className="bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-medium border border-dark-700">
              <XCircle className="w-4 h-4" />
              ล้างประวัติที่สำเร็จแล้ว
            </button>
            <button onClick={fetchTasks} className="btn-primary px-4 py-2 flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </button>
          </div>
        </div>

        {/* Add Task Box */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <label className="text-sm text-dark-300">Post ID</label>
            <input type="text" value={postId} onChange={e => setPostId(e.target.value)} className="input-primary" placeholder="รหัสโพสต์" />
          </div>
          <div className="flex-1 space-y-2">
            <label className="text-sm text-dark-300">Product ID (Affiliate)</label>
            <input type="text" value={productId} onChange={e => setProductId(e.target.value)} className="input-primary" placeholder="รหัสสินค้า" />
          </div>
          <button onClick={handleAddTask} disabled={isAdding} className="btn-primary py-3 px-6 h-[50px] flex items-center gap-2">
            {isAdding ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            เพิ่มคิว
          </button>
        </div>

        {/* Task List */}
        <div className="bg-dark-900 border border-dark-800 rounded-2xl shadow-xl overflow-hidden">
          <table className="w-full text-left text-sm text-dark-300">
            <thead className="bg-dark-950/50 text-dark-400 font-medium border-b border-dark-800">
              <tr>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Post ID</th>
                <th className="px-6 py-4">Product ID</th>
                <th className="px-6 py-4 text-right">Created At</th>
              </tr>
            </thead>
            <tbody>
              {loading && tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">กำลังโหลดข้อมูล...</td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8">ยังไม่มีคิวงาน</td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id} className="border-b border-dark-800/50 hover:bg-dark-800/30 transition-colors">
                    <td className="px-6 py-4">
                      {task.status === 'pending' && <span className="inline-flex items-center gap-1.5 text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-full"><Clock className="w-3.5 h-3.5"/> รอดำเนินการ</span>}
                      {task.status === 'processing' && <span className="inline-flex items-center gap-1.5 text-orange-400 bg-orange-500/10 px-2.5 py-1 rounded-full"><RefreshCw className="w-3.5 h-3.5 animate-spin"/> กำลังแท็ก</span>}
                      {task.status === 'completed' && <span className="inline-flex items-center gap-1.5 text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full"><CheckCircle className="w-3.5 h-3.5"/> สำเร็จ</span>}
                      {task.status === 'failed' && <span className="inline-flex items-center gap-1.5 text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full"><XCircle className="w-3.5 h-3.5"/> ล้มเหลว</span>}
                    </td>
                    <td className="px-6 py-4 font-mono">{task.post_id}</td>
                    <td className="px-6 py-4 font-mono">{task.product_id}</td>
                    <td className="px-6 py-4 text-right">{new Date(task.created_at).toLocaleString('th-TH')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
