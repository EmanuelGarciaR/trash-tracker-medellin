import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH: Actualiza el estado y/o nivel de llenado de un contenedor específico por su ID.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await request.json();
    const { status, fill_level } = body;

    const updates: any = { last_updated: new Date().toISOString() };
    if (status !== undefined) updates.status = status;
    if (fill_level !== undefined) updates.fill_level = fill_level;

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

// DELETE: Elimina un contenedor específico de la base de datos por su ID.
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const id = params.id;
  const { error } = await supabase
    .from('containers')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Container deleted successfully' });
}
