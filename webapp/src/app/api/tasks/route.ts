import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { page_id, post_id, product_id, post_url } = body;

    if (!post_id || !product_id) {
      return NextResponse.json(
        { error: 'Missing post_id or product_id' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('affiliate_tasks')
      .insert({
        page_id: page_id || 'UNKNOWN_PAGE',
        post_id,
        product_id,
        post_url: post_url || ''
      });

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

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
