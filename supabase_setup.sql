-- สร้างตารางเก็บคิวงานแท็ก Affiliate
CREATE TABLE public.affiliate_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page_id TEXT NOT NULL,
    post_id TEXT NOT NULL,
    post_url TEXT,
    product_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- ป้องกันการแท็กสินค้าเดิมซ้ำในโพสต์เดิม
    UNIQUE (post_id, product_id)
);

-- สร้าง Trigger สำหรับอัปเดตเวลา updated_at อัตโนมัติ
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_affiliate_tasks_modtime
    BEFORE UPDATE ON public.affiliate_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();

-- เปิดใช้งาน RLS (Row Level Security) (ปรับเป็น true ถ้ามีการใช้ Auth, แต่เบื้องต้นเปิดให้ดึงข้อมูลได้อิสระ)
ALTER TABLE public.affiliate_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all actions for authenticated users" 
ON public.affiliate_tasks FOR ALL 
USING (true); -- เปลี่ยนเป็น auth.uid() = user_id ถ้ามีระบบล็อกอิน
