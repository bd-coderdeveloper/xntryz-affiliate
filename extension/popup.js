let eaabToken = null;
let pagesData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const statusDiv = document.getElementById('status');
  const pageSelect = document.getElementById('pageSelect');
  const extractBtn = document.getElementById('extractBtn');
  
  // กำหนดวันที่เริ่มต้น (เช่นย้อนหลัง 7 วัน) และสิ้นสุด (วันนี้) ให้เป็นค่าเริ่มต้น
  const today = new Date();
  const pastWeek = new Date();
  pastWeek.setDate(today.getDate() - 7);
  
  document.getElementById('endDate').value = today.toISOString().split('T')[0];
  document.getElementById('startDate').value = pastWeek.toISOString().split('T')[0];

  try {
    statusDiv.textContent = 'กำลังดึงข้อมูล Token...';
    
    // 1. Fetch EAAB Token จาก Business Facebook
    const urlsToTry = [
      'https://adsmanager.facebook.com/adsmanager/',
      'https://business.facebook.com/content_management',
      'https://business.facebook.com/settings',
      'https://www.facebook.com/'
    ];
    
    for (const url of urlsToTry) {
      try {
        statusDiv.textContent = `กำลังหา Token จาก ${url}...`;
        const res = await fetch(url, { credentials: 'include' });
        const html = await res.text();
        
        const match = html.match(/(EAAB[a-zA-Z0-9_\-\\]{15,})/);
        if (match) {
          eaabToken = match[1].replace(/\\/g, '');
          break; // เจอแล้วหยุดหา
        }
      } catch (e) {
        console.warn('Failed to fetch from', url, e);
      }
    }
    
    if (!eaabToken) {
      throw new Error('ไม่พบ EAAB Token: กรุณาเปิดแท็บ Business Suite ทิ้งไว้แล้วลองใหม่');
    }
    
    statusDiv.textContent = 'ได้ Token แล้ว! กำลังดึงรายชื่อเพจ...';

    // 2. Fetch รายชื่อเพจจาก Graph API
    const pageRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${eaabToken}&fields=id,name,access_token&limit=2000`);
    const pageJson = await pageRes.json();
    
    if (pageJson.error) {
      throw new Error(pageJson.error.message);
    }
    
    pagesData = pageJson.data || [];
    
    if (pagesData.length === 0) {
      pageSelect.innerHTML = '<option value="">คุณไม่ได้เป็นแอดมินเพจใดๆ</option>';
      statusDiv.textContent = 'ไม่พบเพจที่จัดการ';
      return;
    }
    
    // 3. แสดงรายชื่อเพจใน Dropdown
    pageSelect.innerHTML = '';
    pagesData.forEach(page => {
      const option = document.createElement('option');
      option.value = page.id;
      option.textContent = page.name;
      pageSelect.appendChild(option);
    });
    
    statusDiv.textContent = 'พร้อมใช้งาน';
    extractBtn.disabled = false;
    
  } catch (error) {
    statusDiv.style.color = '#ef4444';
    statusDiv.textContent = error.message;
  }
});

document.getElementById('extractBtn').addEventListener('click', async () => {
  const pageId = document.getElementById('pageSelect').value;
  const startDateStr = document.getElementById('startDate').value;
  const endDateStr = document.getElementById('endDate').value;
  const affiliateLink = document.getElementById('affiliateLink').value.trim();
  const linkName = document.getElementById('linkName').value.trim();
  const statusDiv = document.getElementById('status');
  
  if (!affiliateLink) {
    statusDiv.style.color = '#ef4444';
    statusDiv.textContent = 'กรุณาใส่ Shopee Affiliate Link!';
    return;
  }
  
  const page = pagesData.find(p => p.id === pageId);
  if (!page || !page.access_token) {
    statusDiv.style.color = '#ef4444';
    statusDiv.textContent = 'ไม่พบ Token ของเพจที่เลือก';
    return;
  }

  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(endDateStr);
  endDate.setHours(23, 59, 59, 999);

  statusDiv.style.color = '#ff8515';
  statusDiv.textContent = 'กำลังดึงโพสต์...';
  
  let allPosts = [];
  let nextUrl = `https://graph.facebook.com/v21.0/${pageId}/published_posts?fields=id,created_time,permalink_url,full_picture&limit=100&access_token=${page.access_token}`;
  
  try {
    // วนลูป Pagination ดึงโพสต์
    while (nextUrl) {
      const res = await fetch(nextUrl);
      const json = await res.json();
      
      if (json.error) {
        throw new Error(json.error.message);
      }
      
      const posts = json.data || [];
      if (posts.length === 0) break;
      
      let shouldStop = false;
      
      for (const post of posts) {
        const postDate = new Date(post.created_time);
        
        // ถ้าโพสต์เก่ากว่าวันที่เริ่ม ให้หยุดดึง (เพราะโพสต์เรียงจากใหม่ไปเก่า)
        if (postDate < startDate) {
          shouldStop = true;
          break;
        }
        
        if (postDate >= startDate && postDate <= endDate) {
          allPosts.push(post);
        }
      }
      
      if (shouldStop) break;
      
      nextUrl = json.paging && json.paging.next ? json.paging.next : null;
      statusDiv.textContent = `กำลังดึงโพสต์... (พบแล้ว ${allPosts.length} โพสต์)`;
    }
    
    if (allPosts.length === 0) {
      statusDiv.style.color = '#ef4444';
      statusDiv.textContent = 'ไม่พบโพสต์ในช่วงเวลาที่กำหนด';
      return;
    }
    
    statusDiv.textContent = `กำลังส่งข้อมูล ${allPosts.length} โพสต์ไปยังระบบ...`;
    
    // ส่งข้อมูลไปที่ WebApp (Localhost)
    let successCount = 0;
    for (const post of allPosts) {
      try {
        // แยก Post ID อกกจาก PageID_PostID
        const actualPostId = post.id.includes('_') ? post.id.split('_')[1] : post.id;
        
        const response = await fetch('http://localhost:3000/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page_id: pageId,
            post_id: actualPostId,
            post_url: post.permalink_url || `https://www.facebook.com/${actualPostId}`,
            thumbnail_url: post.full_picture || null,
            affiliate_link: affiliateLink,
            link_name: linkName
          })
        });
        
        if (response.ok) {
          successCount++;
        }
      } catch (e) {
        console.error('Failed to send task:', e);
      }
    }
    
    statusDiv.style.color = '#10b981';
    statusDiv.textContent = `ส่งข้อมูลสำเร็จ ${successCount} จาก ${allPosts.length} โพสต์!`;
    
  } catch (error) {
    statusDiv.style.color = '#ef4444';
    statusDiv.textContent = `เกิดข้อผิดพลาด: ${error.message}`;
  }
});
