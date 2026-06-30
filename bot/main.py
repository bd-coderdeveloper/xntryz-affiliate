import time
import os
import uiautomator2 as u2
from supabase import create_client, Client
from dotenv import load_dotenv

# โหลดค่าจากไฟล์ .env
load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

import sys

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase Environment Variables in .env file.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ตั้งค่าการเชื่อมต่อ LDPlayer (หรือ Emulator เครื่องอื่นๆ)
# โดยปกติ LDPlayer เครื่องแรกจะใช้ Port 5555 หรือ emulator-5554
DEVICE_URL = "127.0.0.1:5555"
d = None

def connect_device():
    global d
    try:
        print(f"กำลังเชื่อมต่ออุปกรณ์ที่ {DEVICE_URL} ...")
        d = u2.connect(DEVICE_URL)
        print("เชื่อมต่ออุปกรณ์สำเร็จ:", d.device_info)
    except Exception as e:
        print("ไม่สามารถเชื่อมต่ออุปกรณ์ได้:", e)
        sys.exit(1)

def fetch_pending_task():
    try:
        response = supabase.table('affiliate_tasks').select('*').eq('status', 'pending').order('created_at').limit(1).execute()
        data = response.data
        if data and len(data) > 0:
            return data[0]
        return None
    except Exception as e:
        print("Error fetching tasks:", e)
        return None

def update_task_status(task_id, status, error_message=None):
    payload = {"status": status}
    if error_message:
        payload["error_message"] = error_message
    
    try:
        supabase.table('affiliate_tasks').update(payload).eq('id', task_id).execute()
        print(f"Task {task_id} updated to {status}")
    except Exception as e:
        print("Error updating task:", e)

def process_task(task):
    print(f"กำลังรันคิวงาน: โพสต์ {task['post_id']} -> ลิงก์ {task['affiliate_link']}")
    update_task_status(task['id'], 'processing')
    
    try:
        if d is None:
            raise Exception("Device is not connected")
            
        # 1. เปิด Facebook ไปที่โพสต์โดยตรงผ่าน Deep Link
        url = f"https://www.facebook.com/{task['page_id']}/posts/{task['post_id']}"
        print(f"เปิด URL: {url}")
        d.shell(f'am start -a android.intent.action.VIEW -d "{url}"')
        time.sleep(8) # รอโหลดหน้าโพสต์
        
        # 2. กดปุ่ม 'จุดสามจุด' (Menu) ของโพสต์
        print("กำลังค้นหาปุ่มจุดสามจุด...")
        if d(descriptionContains="More").exists(timeout=3):
            d(descriptionContains="More").click()
        elif d(descriptionContains="เพิ่มเติม").exists(timeout=3):
            d(descriptionContains="เพิ่มเติม").click()
        elif d(description="More options").exists(timeout=3):
            d(description="More options").click()
        else:
            print("หาปุ่มจุดสามจุดไม่พบ ลองกดแบบสุ่มตำแหน่ง...")
            d.click(950, 150) # เดาตำแหน่งมุมขวาบนของจอ
        
        time.sleep(3)
        
        # 3. ให้เลือก Manage Product
        print("เลือก Manage Product...")
        if d(textContains="Manage Product").exists(timeout=3):
            d(textContains="Manage Product").click()
        elif d(textContains="จัดการสินค้า").exists(timeout=3):
            d(textContains="จัดการสินค้า").click()
            
        time.sleep(3)
        
        # 4. เลือก Add affiliate product
        print("เลือก Add affiliate product...")
        if d(textContains="Add affiliate product").exists(timeout=3):
            d(textContains="Add affiliate product").click()
        elif d(textContains="เพิ่มสินค้า").exists(timeout=3):
            d(textContains="เพิ่มสินค้า").click()
            
        time.sleep(3)
        
        # 5. ใส่ URL และ Link Name
        print(f"กำลังพิมพ์ URL: {task['affiliate_link']}")
        edit_texts = d(className="android.widget.EditText")
        if edit_texts.exists and len(edit_texts) > 0:
            # สมมติช่องแรกคือ URL
            edit_texts[0].click()
            d.clear_text()
            edit_texts[0].set_text(task['affiliate_link'])
            
            # ถ้ามีช่องที่สอง ให้ใส่เป็น Link Name
            if len(edit_texts) > 1:
                edit_texts[1].click()
                d.clear_text()
                edit_texts[1].set_text("สนใจสั่งซื้อคลิกที่นี่")
        else:
            print("หาช่องกรอกข้อความไม่เจอ")
            
        time.sleep(2)
        
        # กดบันทึก (Save/Add)
        if d(textContains="Add").exists(timeout=3):
            d(textContains="Add").click()
        elif d(textContains="Save").exists(timeout=3):
            d(textContains="Save").click()
        elif d(textContains="บันทึก").exists(timeout=3):
            d(textContains="บันทึก").click()
        elif d(textContains="เพิ่ม").exists(timeout=3):
            d(textContains="เพิ่ม").click()
        
        print("จำลองการทำงานเสร็จสิ้น")
        time.sleep(3) 
        
        update_task_status(task['id'], 'completed')
    except Exception as e:
        print("เกิดข้อผิดพลาดในการแท็ก:", e)
        update_task_status(task['id'], 'failed', str(e))

def main():
    print("=== เริ่มการทำงาน FB Affiliate Bot ===")
    connect_device()
    
    while True:
        task = fetch_pending_task()
        if task:
            process_task(task)
        else:
            # print("ไม่มีคิวงานใหม่ รอก่อน...")
            pass
            
        time.sleep(5) # เช็คคิวใหม่ทุกๆ 5 วินาที

if __name__ == "__main__":
    main()
