import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('routes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    if (error) throw error;

    return NextResponse.json({ collectionsToday: count || 0 });
  } catch {
    return NextResponse.json({ error: 'Error fetching metrics' }, { status: 500 });
  }
}
