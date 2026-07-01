from dotenv import load_dotenv
import sys
import functools
import time
import os
import uiautomator2 as u2
from supabase import create_client, Client
import requests

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

def fetch_pending_tasks():
    try:
        response = supabase.table('affiliate_tasks').select('*').eq('status', 'pending').order('created_at').execute()
        return response.data
    except Exception as e:
        print("Error fetching tasks:", e)
        return []

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
    elif d(textContains="Manage products").exists(timeout=3):
        d(textContains="Manage products").click()
    elif d(textContains="จัดการสินค้า").exists(timeout=3):
        d(textContains="จัดการสินค้า").click()
    else:
        raise Exception("ไม่พบเมนู Manage Product ในโพสต์นี้")
        
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

def process_tasks_for_page(page_id, page_tasks):
    print(f"\n=== เริ่มประมวลผลเพจ: {page_id} จำนวน {len(page_tasks)} โพสต์ (โหมด Direct Deep-Link) ===")
    
    try:
        if d is None:
            raise Exception("Device is not connected")
            
        # 1. สลับโปรไฟล์ไปที่เพจ (ใช้ fb://page/) ก่อนเพื่อความชัวร์
        url_page = f"fb://page/{page_id}"
        print(f"กำลังเปิดหน้าเพจเพื่อสลับโปรไฟล์: {url_page}")
        d.shell(f'am start -a android.intent.action.VIEW -d "{url_page}" com.facebook.katana')
        time.sleep(10)
        
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

        # 2. ลูปเปิดโพสต์ทีละงาน
        for task in page_tasks:
            update_task_status(task['id'], 'processing')
            post_id = task['post_id']
            post_url = task.get('post_url')
            
            # สร้าง Deep Link
            # ถ้ามี post_url (เช่นจาก WebApp ส่งมา) ให้เปิดอันนั้น
            # ถ้าไม่มี ให้เดาว่าเป็น /posts/ ของเพจ
            target_url = post_url if post_url else f"https://www.facebook.com/{page_id}/posts/{post_id}"
            
            print(f"\n🎯 [Task: {post_id}] กำลังกระโดดไปที่: {target_url}")
            
            # ยิงคำสั่ง ADB เปิด Facebook ตรงไปที่โพสต์นั้น
            d.shell(f'am start -a android.intent.action.VIEW -d "{target_url}" com.facebook.katana')
            
            # รอโหลดโพสต์ให้เสร็จ
            time.sleep(7)
            
            # หาปุ่ม 3 จุดของโพสต์นี้ (More options)
            # ในหน้า Single Post หรือ Reels Viewer จะมีปุ่มนี้แค่ปุ่มเดียว
            more_btns = d(description="More options")
            if not more_btns.exists:
                more_btns = d(description="More")
            if not more_btns.exists:
                more_btns = d(description="เพิ่มเติม")
            if not more_btns.exists:
                more_btns = d(description="ตัวเลือก")
                
            if more_btns.exists:
                success = False
                for i in range(len(more_btns)):
                    try:
                        print(f"ลองกดปุ่ม 3 จุด อันที่ {i+1}...")
                        more_btns[i].click()
                        time.sleep(2)
                        
                        try:
                            # เข้าสู่วงจรเพิ่มสินค้า
                            add_product_flow(task)
                            update_task_status(task['id'], 'completed')
                            print(f"✅ เพิ่มสินค้าให้โพสต์ {post_id} สำเร็จ")
                            success = True
                            break
                        except Exception as e:
                            if "ไม่พบเมนู Manage Product" in str(e):
                                # อาจจะไปเปิดผิดโพสต์หรือไม่มีเมนูนี้
                                print(f"อันที่ {i+1} ไม่มี Manage Product ข้ามไปลองอันถัดไป...")
                                d.press("back") # ปิดเมนู 3 จุดของปุ่มนี้
                                time.sleep(1.5)
                            else:
                                raise e
                    except Exception as err:
                        print(f"❌ เกิดข้อผิดพลาดในการแท็ก: {err}")
                        update_task_status(task['id'], 'failed', str(err))
                        d.press("back") # พยายามกดย้อนกลับเผื่อค้างอยู่ในหน้าต่าง
                        time.sleep(1.5)
                        break # พังแล้ว ข้ามไปคิวต่อไป
                        
                if not success:
                    print(f"❌ ลองกดปุ่ม 3 จุดทุกอันแล้ว แต่ไม่เจอ Manage Product ในโพสต์ {post_id}")
                    update_task_status(task['id'], 'failed', "ไม่พบเมนู Manage Product ในโพสต์นี้ (เปิดตรง)")
            else:
                print(f"⚠️ หาปุ่ม 3 จุดไม่เจอเลยในโพสต์ {post_id} อาจจะโหลดไม่ขึ้น หรือรูปแบบ UI เปลี่ยนไป")
                update_task_status(task['id'], 'failed', "เปิดลิงก์แล้วแต่ไม่พบปุ่ม 3 จุด")
            
            # ปิดหน้าโพสต์ปัจจุบัน เพื่อให้เครื่องไม่ค้างหรือแอป Facebook หน่วงเกินไป
            # (กด Back 1-2 ทีเพื่อกลับไปหน้าหลัก)
            d.press("back")
            time.sleep(1)
            
    except Exception as e:
        print(f"Error processing page {page_id}: {e}")
        # Mark remaining processing tasks as failed
        for task in page_tasks:
            try:
                # To be safe, just update all to failed if the whole page processing crashes
                update_task_status(task['id'], 'failed', str(e))
            except:
                pass
def reset_orphaned_tasks():
    try:
        response = supabase.table('affiliate_tasks').select('*').eq('status', 'processing').execute()
        orphaned = response.data
        if orphaned:
            print(f"พบงานที่ค้างสถานะ 'processing' จากรอบก่อน จำนวน {len(orphaned)} งาน กำลังรีเซ็ตให้เป็น 'pending'...")
            for t in orphaned:
                supabase.table('affiliate_tasks').update({'status': 'pending'}).eq('id', t['id']).execute()
    except Exception as e:
        print("Error resetting orphaned tasks:", e)

def main():
    print("=== เริ่มการทำงาน FB Affiliate Bot ===")
    connect_device()
    reset_orphaned_tasks()
    
    while True:
        tasks = fetch_pending_tasks()
        if tasks and len(tasks) > 0:
            # จัดกลุ่มคิวงานตาม page_id
            pages = {}
            for t in tasks:
                pid = t['page_id']
                if pid not in pages:
                    pages[pid] = []
                pages[pid].append(t)
                
            # นำทางไปจัดการทีละเพจ
            for page_id, page_tasks in pages.items():
                process_tasks_for_page(page_id, page_tasks)
        else:
            # print("ไม่มีคิวงานใหม่ รอก่อน...")
            pass
            
        time.sleep(5) # เช็คคิวใหม่ทุกๆ 5 วินาที

if __name__ == "__main__":
    main()
