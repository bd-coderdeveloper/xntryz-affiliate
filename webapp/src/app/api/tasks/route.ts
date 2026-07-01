import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const body = await request.json();
    const { page_id, page_name, page_avatar, post_id, affiliate_link, post_url, link_name, thumbnail_url, post_time } = body;

    if (!post_id || !affiliate_link) {
      return NextResponse.json(
        { error: 'Missing post_id or affiliate_link' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { data, error } = await supabase
      .from('affiliate_tasks')
      .insert({
        page_id: page_id || 'UNKNOWN_PAGE',
        page_name: page_name || null,
        page_avatar: page_avatar || null,
        post_id,
        affiliate_link,
        post_url: post_url || '',
        link_name: link_name || null,
        thumbnail_url: thumbnail_url || null,
        post_time: post_time || null,
        worker_id: null
      });

    if (error) {
      if (error.code === '23505') {
        // Unique constraint violation
        return NextResponse.json({ message: 'Task already exists' }, { status: 200, headers: corsHeaders });
      }
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ success: true, data }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

// Support CORS for the Chrome Extension
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
