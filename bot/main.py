import time
import os
import uiautomator2 as u2
from supabase import create_client, Client
from dotenv import load_dotenv

# โหลดค่าจากไฟล์ .env
load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase Environment Variables in .env file.")
    exit(1)

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
        exit(1)

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
            
        # 1. เปิด Facebook ไปที่โพสต์โดยตรงผ่าน Deep Link (Intent)
        url = f"https://www.facebook.com/{task['page_id']}/posts/{task['post_id']}"
        print(f"เปิด URL: {url}")
        d.shell(f'am start -a android.intent.action.VIEW -d "{url}"')
        time.sleep(5) # รอโหลดหน้าโพสต์
        
        # 2. กดปุ่ม 'จุดสามจุด' (Menu) ของโพสต์ (อาจจะต้องหา selector ที่เหมาะสมกับเวอร์ชัน)
        # ตัวอย่าง: หาปุ่มที่มี description ว่า "More options" หรือ text ว่า "เพิ่มเติม"
        print("กำลังค้นหาปุ่มเมนูโพสต์...")
        # d(descriptionContains="More").click()
        
        # 3. กด 'แก้ไขโพสต์' (Edit Post)
        # d(textContains="แก้ไข").click()
        
        # 4. พิมพ์ลิงก์หรือแท็กสินค้า
        # (แก้ไขตามความต้องการของบอทว่าจะใส่ affiliate_link เข้าไปแบบไหน)
        # d(textContains="แก้ไขโพสต์").send_keys(task['affiliate_link'])
        
        # 5. กดบันทึก
        # d(textContains="บันทึก").click()
        
        print("จำลองการทำงานเสร็จสิ้น (ต้องแก้ Selector ให้ตรงกับแอพจริง)")
        time.sleep(3) # จำลองใช้เวลา 3 วินาที
        
        # สมมติว่าทำงานสำเร็จ
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
