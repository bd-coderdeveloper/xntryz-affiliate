// ฟังข้อความที่ส่งมาจาก popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract_posts') {
    const productId = request.productId;
    const pageId = getPageId();
    
    // ค้นหา Post ID จากหน้าเว็บ
    const posts = extractPosts();
    
    if (posts.length === 0) {
      sendResponse({ success: false, count: 0 });
      return;
    }

    // ส่งข้อมูลไปยังระบบ WebApp (Localhost)
    sendToWebApp(pageId, posts, productId)
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

// ฟังก์ชันดึง Post ID ทั้งหมดที่แสดงอยู่บนหน้าพร้อมรูปปก (ถ้ามี)
function extractPosts() {
  const postsMap = new Map();
  
  // ค้นหาลิงก์ที่น่าจะเป็นลิงก์โพสต์ หรือ Reel
  const links = document.querySelectorAll('a[href*="/posts/"], a[href*="fbid="], a[href*="/reel/"], a[href*="/videos/"]');
  
  links.forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;
    
    let postId = null;
    
    // รูปแบบ /PAGE_NAME/posts/POST_ID หรือ /reel/POST_ID
    const postMatch = href.match(/\/(?:posts|reel|videos)\/([a-zA-Z0-9]+)/);
    if (postMatch) {
      postId = postMatch[1];
    }
    
    // รูปแบบ ?fbid=POST_ID
    const fbidMatch = href.match(/[?&]fbid=([0-9]+)/);
    if (fbidMatch) {
      postId = fbidMatch[1];
    }

    if (postId) {
      // พยายามหารูปภาพที่อยู่ข้างใน <a> หรืออยู่ใกล้ๆ
      let thumbnail = null;
      const img = a.querySelector('img');
      const svgImage = a.querySelector('image');
      
      if (img && img.src) {
        thumbnail = img.src;
      } else if (svgImage && svgImage.getAttribute('xlink:href')) {
        thumbnail = svgImage.getAttribute('xlink:href');
      }

      // พยายามหาเวลาของโพสต์
      let postTime = a.getAttribute('aria-label') || '';
      if (!postTime && a.innerText && a.innerText.trim().length < 20) {
        postTime = a.innerText.trim();
      }

      // เก็บลง Map (ถ้ามี thumbnail ให้แทนที่ของเดิมที่อาจไม่มี)
      // อัปเดต postTime ด้วยถ้ามีอันใหม่ที่ชัดเจนกว่า
      if (!postsMap.has(postId)) {
        postsMap.set(postId, { id: postId, thumbnail: thumbnail, time: postTime });
      } else {
        const existing = postsMap.get(postId);
        if (thumbnail && !existing.thumbnail) existing.thumbnail = thumbnail;
        if (postTime && !existing.time) existing.time = postTime;
      }
    }
  });

  return Array.from(postsMap.values());
}

// ฟังก์ชันส่งข้อมูลเข้า WebApp (ยิงเข้า API โดยตรง)
async function sendToWebApp(pageId, posts, productId) {
  let successCount = 0;
  
  for (const post of posts) {
    try {
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          page_id: pageId,
          post_id: post.id,
          product_id: productId,
          thumbnail_url: post.thumbnail,
          link_name: post.time || '' // ส่งเวลาไปใน field link_name
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
