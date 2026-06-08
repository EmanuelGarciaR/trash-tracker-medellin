import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Recupera todos los contenedores ordenados por la actualización más reciente.
export async function GET() {
  const { data, error } = await supabase
    .from('containers')
    .select('*')
    .order('last_updated', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST: Crea un nuevo contenedor con el nombre, latitud y longitud proporcionados.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, lat, lng } = body;

    if (!name || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: 'Missing required fields (name, lat, lng)' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('containers')
      .insert([{ name, lat, lng }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
