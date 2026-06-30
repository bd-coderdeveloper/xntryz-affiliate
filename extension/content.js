// ฟังข้อความที่ส่งมาจาก popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract_posts') {
    const productId = request.productId;
    const pageId = getPageId();
    
    // ค้นหา Post ID จากหน้าเว็บ
    const postIds = extractPostIds();
    
    if (postIds.length === 0) {
      sendResponse({ success: false, count: 0 });
      return;
    }

    // ส่งข้อมูลไปยังระบบ WebApp (Localhost)
    sendToWebApp(pageId, postIds, productId)
      .then(count => {
        sendResponse({ success: true, count: count });
      })
      .catch(err => {
        console.error(err);
        sendResponse({ success: false, count: 0 });
      });

    return true; // ต้อง return true เพื่อบอกว่าจะตอบกลับแบบ async
  }
});

// ฟังก์ชันดึง Page ID
function getPageId() {
  // ลองดึงชื่อเพจจาก URL
  const match = window.location.pathname.match(/^\/([^\/]+)/);
  if (match && match[1] !== 'groups' && match[1] !== 'watch' && match[1] !== 'marketplace') {
    return match[1];
  }
  return 'UNKNOWN_PAGE';
}

// ฟังก์ชันดึง Post ID ทั้งหมดที่แสดงอยู่บนหน้า
function extractPostIds() {
  const postIds = new Set();
  
  // ค้นหาลิงก์ที่น่าจะเป็นลิงก์โพสต์
  const links = document.querySelectorAll('a[href*="/posts/"], a[href*="fbid="]');
  
  links.forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    
    // รูปแบบ /PAGE_NAME/posts/POST_ID
    const postMatch = href.match(/\/posts\/([a-zA-Z0-9]+)/);
    if (postMatch) {
      postIds.add(postMatch[1]);
    }
    
    // รูปแบบ ?fbid=POST_ID
    const fbidMatch = href.match(/[?&]fbid=([0-9]+)/);
    if (fbidMatch) {
      postIds.add(fbidMatch[1]);
    }
  });

  return Array.from(postIds);
}

// ฟังก์ชันส่งข้อมูลเข้า WebApp (ยิงเข้า API โดยตรง)
async function sendToWebApp(pageId, postIds, productId) {
  let successCount = 0;
  
  for (const postId of postIds) {
    try {
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page_id: pageId,
          post_id: postId,
          product_id: productId
        })
      });
      
      if (response.ok) {
        successCount++;
      }
    } catch (e) {
      console.error('Failed to send task:', e);
    }
  }
  
  return successCount;
}
