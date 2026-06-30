document.getElementById('extractBtn').addEventListener('click', async () => {
  const productId = document.getElementById('productId').value.trim();
  const statusDiv = document.getElementById('status');
  
  if (!productId) {
    statusDiv.style.color = 'red';
    statusDiv.textContent = 'กรุณาใส่รหัสสินค้าก่อน!';
    return;
  }

  statusDiv.style.color = '#ff8515';
  statusDiv.textContent = 'กำลังดึงข้อมูล...';

  // ส่งคำสั่งไปยัง content.js ของแท็บปัจจุบัน
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'extract_posts', productId }, (response) => {
      if (chrome.runtime.lastError) {
        statusDiv.style.color = 'red';
        statusDiv.textContent = 'เกิดข้อผิดพลาด: โปรดเปิดหน้า Facebook Page แล้วลองใหม่';
        return;
      }
      
      if (response && response.success) {
        statusDiv.style.color = '#4ade80'; // Green
        statusDiv.textContent = `ส่งข้อมูลสำเร็จ ${response.count} โพสต์!`;
      } else {
        statusDiv.style.color = 'red';
        statusDiv.textContent = 'ไม่พบโพสต์ หรือเกิดข้อผิดพลาด';
      }
    });
  });
});
