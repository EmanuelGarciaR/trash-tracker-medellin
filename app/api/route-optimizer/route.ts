import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Container } from '@/types';

// Calcular distancia entre dos puntos en km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST: Calcula la ruta de recolección óptima para todos los contenedores 'full' partiendo desde
// las coordenadas proporcionadas, utilizando el Algoritmo del Vecino Más Cercano (Nearest Neighbor Heuristic).
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { start } = body;

    if (!start || start.lat === undefined || start.lng === undefined) {
      return NextResponse.json({ error: 'Missing start coordinates' }, { status: 400 });
    }

    // Buscar todos los contenedores llenos
    const { data, error } = await supabase
      .from('containers')
      .select('*')
      .eq('status', 'full');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const fullContainers: Container[] = data || [];

    if (fullContainers.length === 0) {
      return NextResponse.json({ ordered_containers: [], total_distance_km: 0 });
    }

    // Algoritmo del Vecino Más Cercano
    const ordered_containers: Container[] = [];
    let total_distance_km = 0;

    let currentLat = start.lat;
    let currentLng = start.lng;
    const unvisited = [...fullContainers];

    while (unvisited.length > 0) {
      let nearestIndex = -1;
      let minDistance = Infinity;

      for (let i = 0; i < unvisited.length; i++) {
        const container = unvisited[i];
        const dist = calculateDistance(currentLat, currentLng, container.lat, container.lng);
        if (dist < minDistance) {
          minDistance = dist;
          nearestIndex = i;
        }
      }

      const nearestContainer = unvisited[nearestIndex];
      ordered_containers.push(nearestContainer);
      total_distance_km += minDistance;

      currentLat = nearestContainer.lat;
      currentLng = nearestContainer.lng;

      unvisited.splice(nearestIndex, 1);
    }

    // Insert route record into database
    await supabase.from('routes').insert([{
      container_ids: ordered_containers.map(c => c.id),
      total_distance: total_distance_km
    }]);

    return NextResponse.json({ ordered_containers, total_distance_km });
  } catch (err) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
