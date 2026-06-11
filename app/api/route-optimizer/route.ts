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
      return NextResponse.json({ ordered_containers: [], total_distance_km: 0, geometry: null, osrm_fallback: false });
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

    let geometry = null;
    let osrm_fallback = false;
    let final_distance = total_distance_km;

    // Intentar obtener ruta real de OSRM con reintentos
    const coords = [
      `${start.lng},${start.lat}`,
      ...ordered_containers.map(c => `${c.lng},${c.lat}`)
    ].join(';');

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeout = 5000 * attempt; // 5s, 10s, 15s
        console.log(`OSRM attempt ${attempt}/${MAX_RETRIES} (timeout: ${timeout}ms)`);
        const osrmRes = await fetch(osrmUrl, { signal: AbortSignal.timeout(timeout) });

        if (osrmRes.ok) {
          const osrmData = await osrmRes.json();
          if (osrmData.code === 'Ok' && osrmData.routes && osrmData.routes.length > 0) {
            const route = osrmData.routes[0];
            final_distance = route.distance / 1000;
            geometry = route.geometry; // GeoJSON LineString
            osrm_fallback = false;
            break; // éxito, salir del loop
          } else {
            throw new Error('No routes returned by OSRM');
          }
        } else {
          throw new Error(`OSRM responded with status ${osrmRes.status}`);
        }
      } catch (osrmError) {
        console.error(`OSRM attempt ${attempt} failed:`, osrmError);
        if (attempt === MAX_RETRIES) {
          console.error('OSRM all retries exhausted, using fallback');
          geometry = null;
          osrm_fallback = true;
          final_distance = total_distance_km;
        } else {
          // Esperar antes de reintentar (backoff: 1s, 2s)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Insert route record into database
    await supabase.from('routes').insert([{
      container_ids: ordered_containers.map(c => c.id),
      total_distance: final_distance
    }]);

    return NextResponse.json({ 
      ordered_containers, 
      total_distance_km: final_distance,
      geometry,
      osrm_fallback
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
