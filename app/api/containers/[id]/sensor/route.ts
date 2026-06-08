import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: Simula la lectura de un sensor ultrasónico. Calcula el nivel de llenado basado en distance_cm
// y actualiza el estado del contenedor a 'full' o 'empty' según corresponda.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    const { distance_cm } = body;

    if (distance_cm === undefined || typeof distance_cm !== 'number') {
      return NextResponse.json({ error: 'Invalid or missing distance_cm' }, { status: 400 });
    }

    // Depth is 50cm. Calculate fill_level
    let fill_level = Math.round(((50 - distance_cm) / 50) * 100);
    // Clamp between 0 and 100
    fill_level = Math.max(0, Math.min(100, fill_level));

    let statusUpdate = undefined;
    if (fill_level >= 80) {
      statusUpdate = 'full';
    } else if (fill_level < 20) {
      statusUpdate = 'empty';
    }

    const updates: any = {
      fill_level,
      last_updated: new Date().toISOString()
    };
    if (statusUpdate) {
      updates.status = statusUpdate;
    }

    const { data, error } = await supabase
      .from('containers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
