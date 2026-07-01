import uiautomator2 as u2
import time

try:
    d = u2.connect("127.0.0.1:5555")
    print("Connected")
    
    # Test setting and getting clipboard
    d.set_clipboard("test_post_id_123")
    time.sleep(1)
    clip = d.clipboard
    print(f"Clipboard content: {clip}")
    
    if clip == "test_post_id_123":
        print("Clipboard works!")
    else:
        print("Clipboard failed!")
except Exception as e:
    print(f"Error: {e}")
