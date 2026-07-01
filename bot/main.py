from dotenv import load_dotenv
import sys
import functools
import time
import os
import uiautomator2 as u2
from supabase import create_client, Client

# บังคับให้ print ทุกครั้งส่งข้อมูลออกไปที่ Launcher ทันที (แก้ปัญหา Python Buffer)
print = functools.partial(print, flush=True)

# โหลดค่าจากไฟล์ .env
load_dotenv()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Missing Supabase Environment Variables in .env file.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ตั้งค่าการเชื่อมต่อ LDPlayer
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

def add_product_flow(task):
    # 3. ให้เลือก Manage Product
    print("เลือก Manage Product...")
    if d(textContains="Manage Product").exists(timeout=3):
        d(textContains="Manage Product").click()
    elif d(textContains="จัดการสินค้า").exists(timeout=3):
        d(textContains="จัดการสินค้า").click()
    else:
        raise Exception("ไม่พบเมนู Manage Product (อาจจะไม่มีเมนูนี้ในโหมด Reels)")
        
    time.sleep(3)
    
    # 4. เลือก Add affiliate product
    print("เลือก Add affiliate product...")
    if d(textContains="Add affiliate product").exists(timeout=3):
        d(textContains="Add affiliate product").click()
    elif d(textContains="เพิ่มสินค้า").exists(timeout=3):
        d(textContains="เพิ่มสินค้า").click()
    else:
        raise Exception("ไม่พบเมนู Add affiliate product")
        
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
            link_name = task.get('link_name')
            if not link_name:
                link_name = "สนใจสั่งซื้อคลิกที่นี่"
            edit_texts[1].set_text(link_name)
    else:
        raise Exception("หาช่องกรอกข้อความไม่เจอ")
        
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
        
    print("จำลองการทำงานเพิ่มสินค้าเสร็จสิ้น")
    time.sleep(3) 

def process_task(task):
    print(f"\n=== กำลังรันคิวงาน: โพสต์ {task['post_id']} -> ลิงก์ {task['affiliate_link']} ===")
    update_task_status(task['id'], 'processing')
    
    try:
        if d is None:
            raise Exception("Device is not connected")
            
        # 0. สลับโปรไฟล์ไปที่เพจก่อน เพื่อความชัวร์ว่าเราอยู่ในโปรไฟล์ของเพจ
        url_page = f"fb://page/{task['page_id']}"
        print(f"กำลังเปิดหน้าเพจเพื่อสลับโปรไฟล์: {url_page}")
        d.shell(f'am start -a android.intent.action.VIEW -d "{url_page}" com.facebook.katana')
        time.sleep(10) # รอโหลดหน้าเพจให้เสร็จ
        
        print("กำลังหาปุ่มสลับโปรไฟล์...")
        switched = False
        switch_keywords = ["Switch", "switch", "สลับ"]
        for kw in switch_keywords:
            if d(textContains=kw).exists:
                d(textContains=kw)[0].click()
                switched = True
                print(f"สลับโปรไฟล์สำเร็จ (พบข้อความ: {kw})")
                time.sleep(8)
                break
            elif d(descriptionContains=kw).exists:
                d(descriptionContains=kw)[0].click()
                switched = True
                print(f"สลับโปรไฟล์สำเร็จ (พบคำอธิบาย: {kw})")
                time.sleep(8)
                break
                
        if not switched:
            print("ไม่พบปุ่มสลับ อาจจะอยู่ในโปรไฟล์เพจอยู่แล้ว")

        # 1. เปิด Facebook ไปที่โพสต์โดยตรงผ่าน Deep Link (บังคับใช้ลิงก์ Reels)
        # แม้ว่าในฐานข้อมูลจะมี post_url เราจะบังคับสร้างลิงก์ Reels แท้ๆ เพื่อความชัวร์
        url = f"https://www.facebook.com/reel/{task['post_id']}"
            
        print(f"เปิด URL โพสต์ (Reels): {url}")
        # ใส่ com.facebook.katana ต่อท้ายเพื่อบังคับไม่ให้เด้งไปเปิดใน Chrome
        d.shell(f'am start -a android.intent.action.VIEW -d "{url}" com.facebook.katana')
        time.sleep(10) # รอโหลดหน้า Reels Player
        
        # 2. กดปุ่ม 'จุดสามจุด' (Menu) ของโพสต์
        print("กำลังค้นหาปุ่มจุดสามจุด...")
        clicked_more = False
        keywords = ["More options", "More", "more", "เพิ่มเติม", "ตัวเลือก", "Menu", "menu"]
        
        for kw in keywords:
            if d(descriptionContains=kw).exists:
                d(descriptionContains=kw)[0].click()
                clicked_more = True
                print(f"พบปุ่ม 3 จุด ({kw})")
                break
                
        if not clicked_more:
            print("ไม่พบปุ่มจุด 3 จุด กำลังลองกดที่หน้าจอเพื่อปลุกเมนู...")
            d.click(500, 500)
            time.sleep(2)
            for kw in keywords:
                if d(descriptionContains=kw).exists:
                    d(descriptionContains=kw)[0].click()
                    clicked_more = True
                    print(f"พบปุ่ม 3 จุด ({kw}) หลังกดหน้าจอ")
                    break
                    
        if not clicked_more:
            raise Exception("ไม่พบปุ่มเมนู 3 จุดของโพสต์ในหน้า Reels")
        
        time.sleep(3)
        
        # 3. ลองเข้าสู่วงจรเพิ่มสินค้า (ถ้าทำได้)
        add_product_flow(task)
        update_task_status(task['id'], 'completed')
        print(f"✅ ทำงานเสร็จสิ้น โพสต์: {task['post_id']}")
        
    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการแท็ก: {e}")
        update_task_status(task['id'], 'failed', str(e))
        d.press("back")
        time.sleep(1)

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
            
        time.sleep(5)

if __name__ == "__main__":
    main()
