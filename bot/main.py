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

def expand_short_url(url):
    """
    แกะรอยลิงก์ย่อ (เช่น fb.watch หรือ share/v/) ให้เป็นลิงก์เต็ม
    เพื่อให้สามารถตรวจสอบรหัส Post ID ได้
    """
    import re
    try:
        if "fb.watch" in url or "share/" in url:
            print(f"พบลิงก์ย่อ: {url} กำลังถอดรหัส...")
            # ใช้ Dalvik User-Agent เพื่อหลอกว่าเป็นแอปมือถือ ป้องกัน Facebook บล็อก
            headers = {'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 11; Pixel 5 Build/RQ3A.210805.001.A1)'}
            response = requests.get(url, allow_redirects=True, headers=headers, timeout=10)
            
            if response.status_code == 200:
                match_og = re.search(r'og:url"\s*content="([^"]+)"', response.text)
                if match_og:
                    og_url = match_og.group(1)
                    print(f"ถอดรหัสลิงก์สำเร็จเป็น: {og_url}")
                    return og_url
                    
            full_url = response.url
            print(f"ถอดรหัสลิงก์ (Fallback): {full_url}")
            return full_url
        return url
    except Exception as e:
        print(f"Error expanding short url: {e}")
        return url

def add_product_flow(task):
    # 3. ให้เลือก Manage Product
    print("เลือก Manage Product...")
    if d(textContains="Manage Product").exists(timeout=3):
        d(textContains="Manage Product").click()
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
    print(f"\n=== เริ่มประมวลผลเพจ: {page_id} จำนวน {len(page_tasks)} โพสต์ ===")
    
    # ดึงคิวทั้งหมดที่ต้องทำในเพจนี้มาเก็บไว้
    target_tasks = {str(t['post_id']): t for t in page_tasks}
    
    for pid, task in target_tasks.items():
        update_task_status(task['id'], 'processing')
    
    try:
        if d is None:
            raise Exception("Device is not connected")
            
        # 1. สลับโปรไฟล์ไปที่เพจ (ใช้ fb://page/)
        url_page = f"fb://page/{page_id}"
        print(f"กำลังเปิดหน้าเพจ: {url_page}")
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

        print(f"\nกำลังเริ่มสแกนหน้า Timeline ของเพจ เพื่อหา {len(target_tasks)} โพสต์...")
        max_scrolls = 200 # เลื่อนได้สูงสุด 200 ครั้ง
        seen_urls = set()
        
        for scroll_count in range(max_scrolls):
            if not target_tasks:
                print("✅ ประมวลผลครบทุกคิวงานของเพจนี้แล้ว!")
                break
                
            print(f"สแกนรอบที่ {scroll_count+1}/{max_scrolls} (เหลืออีก {len(target_tasks)} โพสต์)")
            
            # หาปุ่ม Share แบบเจาะจง เพื่อป้องกันการไปโดนปุ่ม "Share now" ในเมนู
            shares = d(text="Share", className="android.view.ViewGroup")
            if not shares.exists:
                shares = d(text="แชร์", className="android.view.ViewGroup")
            if not shares.exists:
                shares = d(description="Share")
            if not shares.exists:
                shares = d(description="แชร์")
                
            if shares.exists:
                try:
                    # ลองกด Share อันแรกที่พบ
                    shares[0].click(timeout=3)
                    time.sleep(2)
                    
                    # กด Copy link
                    copy_btn = d(text="Copy link")
                    if not copy_btn.exists:
                        copy_btn = d(text="คัดลอกลิงก์")
                    if not copy_btn.exists:
                        copy_btn = d(descriptionContains="Copy link")
                    if not copy_btn.exists:
                        copy_btn = d(descriptionContains="คัดลอกลิงก์")
                        
                    if copy_btn.exists:
                        copy_btn.click(timeout=3)
                        time.sleep(1.5)
                        
                        # อ่าน Clipboard
                        raw_clip = d.clipboard
                        
                        # ถอดรหัสลิงก์ย่อเป็นลิงก์เต็ม
                        clip = expand_short_url(raw_clip)
                        
                        # เช็คว่ามี post_id เป้าหมายซ่อนอยู่ใน link ไหม
                        matched_pid = None
                        for pid in target_tasks.keys():
                            if pid in clip:
                                matched_pid = pid
                                break
                                
                        if matched_pid:
                            print(f"🎯 เจอโพสต์เป้าหมายแล้ว! (Post ID: {matched_pid})")
                            task = target_tasks[matched_pid]
                            
                            # หาปุ่ม 3 จุดของโพสต์นี้ (More options)
                            more_btns = d(descriptionContains="More options")
                            if not more_btns.exists:
                                more_btns = d(descriptionContains="More")
                            if not more_btns.exists:
                                more_btns = d(descriptionContains="เพิ่มเติม")
                            if not more_btns.exists:
                                more_btns = d(descriptionContains="ตัวเลือก")
                                
                            if more_btns.exists:
                                more_btns[0].click()
                                time.sleep(2)
                                
                                try:
                                    # เข้าสู่วงจรเพิ่มสินค้า
                                    add_product_flow(task)
                                    update_task_status(task['id'], 'completed')
                                    print(f"✅ เพิ่มสินค้าให้โพสต์ {matched_pid} สำเร็จ")
                                except Exception as e:
                                    print(f"❌ เกิดข้อผิดพลาดในการแท็ก: {e}")
                                    update_task_status(task['id'], 'failed', str(e))
                                    d.press("back") # พยายามกดย้อนกลับเผื่อค้างอยู่ในหน้าต่าง
                                    time.sleep(1.5)
                                
                                # ลบออกจากเป้าหมาย
                                del target_tasks[matched_pid]
                            else:
                                print("⚠️ หาปุ่ม 3 จุดไม่เจอ ข้ามไปก่อน")
                        else:
                            if raw_clip in seen_urls:
                                print("เจอโพสต์เดิมซ้ำ! กำลังพยายามเลื่อนหน้าจอให้มากขึ้น...")
                                # เลื่อนหน้าจอแรงๆ เพื่อให้พ้นโพสต์เดิม
                                d.swipe(500, 1500, 500, 300, duration=0.2)
                                time.sleep(1.5)
                                d.swipe(500, 1500, 500, 300, duration=0.2)
                            seen_urls.add(raw_clip)
                    else:
                        print("⚠️ ไม่เจอปุ่ม Copy link ในเมนู Share กดย้อนกลับ")
                        d.press("back")
                        time.sleep(1.5)
                        
                except Exception as e:
                    print(f"Error checking share: {e}")
                    d.press("back") # พยายามกดย้อนกลับเผื่อค้าง
                    time.sleep(1.5)
            
            # เลื่อนหน้าจอลงตามปกติเพื่อเช็คโพสต์ถัดไป
            d.swipe(500, 1200, 500, 400, duration=0.3)
            time.sleep(1.5)
            
        # ถ้าเลื่อนจนหมดโควต้าแล้วยังเหลือคิว
        if target_tasks:
            print(f"⚠️ สแกนจนครบ {max_scrolls} ครั้งแล้ว แต่ยังเหลือโพสต์ที่หาไม่เจออีก {len(target_tasks)} โพสต์")
            for pid, task in target_tasks.items():
                update_task_status(task['id'], 'failed', 'หาโพสต์ไม่พบบน Timeline (อาจอยู่ลึกเกินไป)')
                
    except Exception as e:
        print("❌ เกิดข้อผิดพลาดรุนแรงในการสแกนเพจ:", e)
        for pid, task in target_tasks.items():
            update_task_status(task['id'], 'failed', str(e))

def main():
    print("=== เริ่มการทำงาน FB Affiliate Bot ===")
    connect_device()
    
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
