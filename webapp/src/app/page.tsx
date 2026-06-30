import Link from 'next/link';
import { ShoppingBag, CheckCircle, Clock } from 'lucide-react';

export default function Home() {
  return (
    <div className="p-8 pb-20 font-sans">
      <div className="flex flex-col gap-8 max-w-5xl mx-auto">
        
        <div className="glass-panel p-8 rounded-2xl flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Dashboard
            </h1>
            <p className="text-dark-300">
              ยินดีต้อนรับสู่ระบบจัดการคิวงาน Affiliate (FB Affiliate System)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Pending Tasks</h3>
            </div>
            <p className="text-4xl font-bold text-blue-400">0</p>
            <p className="text-sm text-dark-400 mt-2">รอดำเนินการ</p>
          </div>
          
          <div className="bg-dark-900 border border-dark-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Completed</h3>
            </div>
            <p className="text-4xl font-bold text-green-400">0</p>
            <p className="text-sm text-dark-400 mt-2">แท็กสำเร็จแล้ว</p>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-xl text-center">
          <ShoppingBag className="w-12 h-12 text-orange-500 mx-auto mb-4 opacity-80" />
          <h2 className="text-xl font-bold text-white mb-2">พร้อมเริ่มงานหรือยัง?</h2>
          <p className="text-dark-300 mb-6 max-w-md mx-auto">
            ไปที่หน้า Task Queue เพื่อดึงโพสต์จากเพจของคุณ และจัดคิวงานให้ Bot ทำงานอัตโนมัติ
          </p>
          <Link href="/tasks" className="btn-primary inline-flex">
            ไปที่หน้า Task Queue
          </Link>
        </div>

      </div>
    </div>
  );
}
