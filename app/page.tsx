'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import AddContainerModal from '@/components/AddContainerModal';
import { Container } from '@/types';
import { gsap } from 'gsap';
import { 
  animateHeader, animateMetricCards, animateContainerList, animateMap, 
  animateRouteResults, hoverMetricCard, hoverListItem, hoverPrimaryBtn, 
  pressPrimaryBtn, animateSpinner, stopSpinner, animateItemFlash
} from '@/lib/animations';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

const CONTAINER_DEPTH_CM = 50; // Profundidad del contenedor en cm (igual que en el ESP32)

export default function Dashboard() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [collectionsToday, setCollectionsToday] = useState(0);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);

  // Optimal route state
  const [startLat, setStartLat] = useState<number | ''>('');
  const [startLng, setStartLng] = useState<number | ''>('');
  const [route, setRoute] = useState<{ ordered_containers: Container[]; geometry: GeoJSON.LineString | null; osrm_fallback: boolean; total_distance_km: number } | null>(null);

  // Sensor simulation state
  const [activeSensorSim, setActiveSensorSim] = useState<string | null>(null);
  const [sensorDist, setSensorDist] = useState<number | ''>('');

  // ESP32-marked containers (persisted in localStorage)
  const [esp32Ids, setEsp32Ids] = useState<Set<string>>(new Set());

  // Refs for animations
  const headerRef = useRef<HTMLElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const mapWrapperRef = useRef<HTMLElement>(null);
  const routeResultsRef = useRef<HTMLDivElement>(null);
  
  const spinnerRef = useRef<HTMLSpanElement>(null);
  const btnTextRef = useRef<HTMLSpanElement>(null);
  const spinnerTweenRef = useRef<gsap.core.Tween | null>(null);

  // Load ESP32 IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('esp32_container_ids');
      if (saved) setEsp32Ids(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, []);

  const toggleEsp32 = (id: string) => {
    setEsp32Ids(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      localStorage.setItem('esp32_container_ids', JSON.stringify([...next]));
      return next;
    });
  };

  useEffect(() => {
    const ctx = gsap.context(() => {
      animateHeader(headerRef);
      animateMetricCards(metricsRef);
      animateContainerList(listRef);
      animateMap(mapWrapperRef);
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (route) {
      const ctx = gsap.context(() => {
        animateRouteResults(routeResultsRef);
      });
      return () => ctx.revert();
    }
  }, [route]);

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({message, type});
    setTimeout(() => setToast(null), 3000);
  };

  const fetchContainers = useCallback(async () => {
    try {
      const res = await fetch('/api/containers');
      if (res.ok) {
        const data = await res.json();
        setContainers(data);
        setLastUpdated(new Date());
      }
    } catch {
      // Evitar spam de toast de error en polling
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch('/api/metrics');
      if (res.ok) {
        const data = await res.json();
        setCollectionsToday(data.collectionsToday);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    fetchContainers();
    fetchMetrics();
    const interval = setInterval(() => {
      fetchContainers();
      fetchMetrics();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchContainers, fetchMetrics]);

  const handleUpdateStatus = async (id: string, status: 'full' | 'empty', fill_level: number) => {
    try {
      const res = await fetch(`/api/containers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, fill_level })
      });
      if (res.ok) {
        showToast('Estado actualizado');
        
        // Find DOM element to flash
        const itemEl = document.getElementById(`container-item-${id}`);
        if (itemEl) animateItemFlash(itemEl, '#e6e2ef');

        fetchContainers();
      } else throw new Error();
    } catch {
      showToast('Error al actualizar', 'error');
    }
  };

  const handleSimulateSensor = async (id: string) => {
    if (sensorDist === '') return;
    try {
      const res = await fetch(`/api/containers/${id}/sensor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distance_cm: Number(sensorDist) })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(`Sensor: ${data.fill_level}% → ${data.status}`);
        setActiveSensorSim(null);
        setSensorDist('');
        fetchContainers();
      } else throw new Error();
    } catch {
      showToast('Error en simulación', 'error');
    }
  };

  const handleDeleteContainer = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este contenedor?')) return;
    try {
      const res = await fetch(`/api/containers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Contenedor eliminado');
        fetchContainers();
      } else throw new Error();
    } catch {
      showToast('Error al eliminar', 'error');
    }
  };

  const calculateRoute = async () => {
    if (startLat === '' || startLng === '') {
      showToast('Ingresa punto de partida', 'error');
      return;
    }
    
    if (spinnerRef.current && btnTextRef.current) {
       gsap.set(spinnerRef.current, { opacity: 1, scale: 1 });
       spinnerTweenRef.current = animateSpinner(spinnerRef.current);
       gsap.to(btnTextRef.current, { opacity: 0, scale: 0.5, duration: 0.2 });
    }

    try {
      const res = await fetch('/api/route-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: { lat: Number(startLat), lng: Number(startLng) } })
      });
      
      if (spinnerRef.current && btnTextRef.current && spinnerTweenRef.current) {
         stopSpinner(spinnerRef.current, btnTextRef.current, spinnerTweenRef.current);
      }

      if (res.ok) {
        const data = await res.json();
        setRoute({
          ordered_containers: data.ordered_containers,
          geometry: data.geometry,
          osrm_fallback: data.osrm_fallback,
          total_distance_km: data.total_distance_km
        });
        if (data.osrm_fallback) {
          showToast('OSRM falló: Mostrando ruta recta (fallback)', 'error');
        } else {
          showToast('Ruta calculada por OSRM');
        }
        fetchMetrics();
      } else throw new Error();
    } catch {
      if (spinnerRef.current && btnTextRef.current && spinnerTweenRef.current) {
         stopSpinner(spinnerRef.current, btnTextRef.current, spinnerTweenRef.current);
      }
      showToast('Error calculando ruta', 'error');
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      showToast('Geolocalización no soportada', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStartLat(pos.coords.latitude);
        setStartLng(pos.coords.longitude);
      },
      () => showToast('Error ubicando', 'error')
    );
  };

  // Calculate preview fill percentage for sensor simulation
  const previewFillPct = sensorDist !== '' 
    ? Math.max(0, Math.min(100, Math.round(((CONTAINER_DEPTH_CM - Number(sensorDist)) / CONTAINER_DEPTH_CM) * 100)))
    : null;

  const totalCount = containers.length;
  const fullCount = containers.filter(c => c.status === 'full').length;
  const emptyCount = containers.filter(c => c.status === 'empty').length;
  const esp32Count = containers.filter(c => esp32Ids.has(c.id)).length;

  return (
    <div className="flex flex-col h-screen bg-waste-light font-sans text-gray-800">
      {/* HEADER */}
      <header ref={headerRef} className="bg-waste-deepPurple text-white p-4 flex justify-between items-center shadow-md z-10">
        <div className="flex items-center gap-3">
          <Image src="/trashTrackerHeader.png" alt="TrashTracker Medellín" width={220} height={50} priority className="h-10 w-auto" />
        </div>
        <div className="flex items-center gap-6 hidden sm:flex">
          <span className="text-sm text-waste-light" suppressHydrationWarning>
            Última actualización: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
          </span>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            onMouseEnter={(e) => hoverPrimaryBtn(e.currentTarget, true)}
            onMouseLeave={(e) => hoverPrimaryBtn(e.currentTarget, false)}
            onMouseDown={(e) => pressPrimaryBtn(e.currentTarget, true)}
            onMouseUp={(e) => pressPrimaryBtn(e.currentTarget, false)}
            className="bg-waste-orange text-white px-4 py-2 rounded shadow-sm text-sm font-medium"
          >
            + Agregar contenedor
          </button>
        </div>
        <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-waste-orange hover:bg-waste-lightOrange text-white px-3 py-1.5 rounded shadow-sm text-sm font-medium transition-colors sm:hidden"
          >
            +
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex flex-1 overflow-hidden flex-col md:flex-row">
        
        {/* MAP COLUMN */}
        <section ref={mapWrapperRef} className="w-full md:w-[65%] h-[50vh] md:h-full relative z-0">
          <Map 
            containers={containers} 
            route={route}
            onStatusChange={handleUpdateStatus} 
          />
        </section>

        {/* SIDEBAR COLUMN */}
        <section className="w-full md:w-[35%] h-full bg-gray-50 border-l border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 flex flex-col gap-6">
            
            {/* METRICS */}
            <div ref={metricsRef} className="grid grid-cols-2 gap-3">
              <div 
                className="bg-white p-3 rounded shadow-sm border border-gray-200"
                onMouseEnter={(e) => hoverMetricCard(e.currentTarget, true)}
                onMouseLeave={(e) => hoverMetricCard(e.currentTarget, false)}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total contenedores</p>
                <p className="text-2xl font-bold text-waste-deepPurple">{totalCount}</p>
              </div>
              <div 
                className={`bg-white p-3 rounded shadow-sm border ${fullCount > 0 ? 'border-waste-orange bg-orange-50' : 'border-gray-200'}`}
                onMouseEnter={(e) => hoverMetricCard(e.currentTarget, true)}
                onMouseLeave={(e) => hoverMetricCard(e.currentTarget, false)}
              >
                <p className={`text-xs uppercase tracking-wide ${fullCount > 0 ? 'text-waste-orange' : 'text-gray-500'}`}>Llenos</p>
                <p className={`text-2xl font-bold ${fullCount > 0 ? 'text-waste-orange' : 'text-waste-deepPurple'}`}>{fullCount}</p>
              </div>
              <div 
                className="bg-white p-3 rounded shadow-sm border border-gray-200"
                onMouseEnter={(e) => hoverMetricCard(e.currentTarget, true)}
                onMouseLeave={(e) => hoverMetricCard(e.currentTarget, false)}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide">Vacíos</p>
                <p className="text-2xl font-bold text-waste-deepPurple">{emptyCount}</p>
              </div>
              <div 
                className="bg-white p-3 rounded shadow-sm border border-gray-200"
                onMouseEnter={(e) => hoverMetricCard(e.currentTarget, true)}
                onMouseLeave={(e) => hoverMetricCard(e.currentTarget, false)}
              >
                <p className="text-xs text-gray-500 uppercase tracking-wide">Sensores ESP32</p>
                <p className="text-2xl font-bold text-teal-600">{esp32Count}</p>
              </div>
            </div>

            {/* OPTIMAL ROUTE */}
            <div className="bg-white p-4 rounded shadow-sm border border-gray-200">
              <h2 className="text-sm font-bold text-waste-deepPurple uppercase tracking-wide mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-waste-purple"></span>
                Ruta Óptima
              </h2>
              <div className="flex gap-2 mb-2">
                <input 
                  type="number" 
                  value={startLat} onChange={e => setStartLat(e.target.value === '' ? '' : Number(e.target.value))} 
                  placeholder="Lat (ej. 6.2442)" 
                  className="w-full text-sm p-2 border rounded bg-gray-50"
                />
                <input 
                  type="number" 
                  value={startLng} onChange={e => setStartLng(e.target.value === '' ? '' : Number(e.target.value))} 
                  placeholder="Lng (ej. -75.5812)" 
                  className="w-full text-sm p-2 border rounded bg-gray-50"
                />
              </div>
              <button 
                onClick={useMyLocation}
                className="text-xs text-waste-purple hover:text-waste-deepPurple mb-3 block font-medium"
              >
                Usar mi ubicación
              </button>
              <div className="flex gap-2">
                <button 
                  onClick={calculateRoute}
                  onMouseEnter={(e) => hoverPrimaryBtn(e.currentTarget, true)}
                  onMouseLeave={(e) => hoverPrimaryBtn(e.currentTarget, false)}
                  onMouseDown={(e) => pressPrimaryBtn(e.currentTarget, true)}
                  onMouseUp={(e) => pressPrimaryBtn(e.currentTarget, false)}
                  className="flex-1 bg-waste-deepPurple text-white py-2 rounded text-sm font-medium relative overflow-hidden"
                >
                  <span ref={spinnerRef} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 text-lg">⚙</span>
                  <span ref={btnTextRef} className="inline-block">Calcular ruta</span>
                </button>
                {route && (
                  <button 
                    onClick={() => setRoute(null)}
                    className="bg-waste-light hover:bg-gray-200 text-waste-deepPurple border border-waste-purple py-2 px-3 rounded text-sm font-medium"
                  >
                    Ocultar
                  </button>
                )}
              </div>
              
              {route && (
                <div ref={routeResultsRef} className="mt-4 p-3 bg-waste-light border border-waste-purple rounded text-sm">
                  <p className="font-semibold text-waste-deepPurple mb-2">Distancia total: {route.total_distance_km.toFixed(2)} km</p>
                  <ol className="list-decimal pl-4 text-gray-700 space-y-1 text-xs">
                    {route.ordered_containers.map(c => (
                      <li key={`route-${c.id}`}>{c.name} ({c.fill_level}%)</li>
                    ))}
                  </ol>
                  {route.ordered_containers.length === 0 && <p className="text-xs mt-2 text-gray-500">No hay contenedores llenos que recolectar.</p>}
                </div>
              )}
            </div>

            {/* CONTAINER LIST */}
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-bold text-waste-deepPurple uppercase tracking-wide">
                Lista de Contenedores ({containers.length})
              </h2>
              <div ref={listRef} className="flex flex-col gap-2">
                {containers.map(container => {
                  const isEsp32 = esp32Ids.has(container.id);
                  return (
                    <div 
                      key={container.id} 
                      id={`container-item-${container.id}`}
                      className={`bg-white p-3 rounded shadow-sm border flex flex-col gap-2 ${isEsp32 ? 'border-teal-400 ring-1 ring-teal-200' : 'border-gray-200'}`}
                      onMouseEnter={(e) => hoverListItem(e.currentTarget, true)}
                      onMouseLeave={(e) => hoverListItem(e.currentTarget, false)}
                    >
                      {/* Row 1: Name + badges */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{container.name}</span>
                          {isEsp32 && (
                            <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold bg-teal-100 text-teal-700 border border-teal-300">
                              ESP32
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {(container.fill_level === 0 || container.fill_level >= 100) && (
                            <span className={`status-badge text-[10px] uppercase px-2 py-1 rounded font-bold ${
                              container.status === 'full' ? 'bg-[#e07506] text-white' : 
                              container.status === 'empty' ? 'bg-[#6444c0] text-white' : 'bg-[#eb963d] text-white'
                            }`}>
                              {container.status}
                            </span>
                          )}
                          <button 
                            onClick={() => handleDeleteContainer(container.id)}
                            className="text-red-500 hover:text-red-700 font-bold px-1 text-xs"
                            title="Eliminar contenedor"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Row 2: Fill level bar + percentage */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${container.status === 'full' ? 'bg-waste-orange' : 'bg-waste-deepPurple'}`} 
                            style={{ width: `${container.fill_level}%` }}
                          ></div>
                        </div>
                        <span className={`text-xs font-bold min-w-[36px] text-right ${
                          container.fill_level >= 80 ? 'text-[#e07506]' : 
                          container.fill_level >= 50 ? 'text-[#eb963d]' : 'text-[#6444c0]'
                        }`}>
                          {container.fill_level}%
                        </span>
                      </div>

                      {/* Row 3: Actions */}
                      <div className="flex items-center gap-2 mt-1">
                        <button 
                          onClick={() => toggleEsp32(container.id)}
                          className={`text-[10px] px-2 py-0.5 rounded border font-medium transition-colors ${
                            isEsp32 
                              ? 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100' 
                              : 'bg-gray-50 text-gray-500 border-gray-300 hover:bg-gray-100'
                          }`}
                          title={isEsp32 ? 'Quitar marca ESP32' : 'Marcar como ESP32'}
                        >
                          {isEsp32 ? '📡 ESP32 ✓' : '📡 Marcar ESP32'}
                        </button>
                        <span className="text-gray-300">|</span>
                        {activeSensorSim === container.id ? (
                          <div className="flex gap-1.5 items-center flex-1">
                            <input 
                              type="number" 
                              placeholder="0-50 cm" 
                              value={sensorDist}
                              onChange={e => setSensorDist(e.target.value === '' ? '' : Number(e.target.value))}
                              className="w-16 text-xs border p-1 rounded"
                              min="0"
                              max={CONTAINER_DEPTH_CM}
                              step="1"
                            />
                            <span className="text-[9px] text-gray-400">cm</span>
                            {previewFillPct !== null && (
                              <span className={`text-[10px] font-bold ${
                                previewFillPct >= 80 ? 'text-[#e07506]' : 
                                previewFillPct >= 50 ? 'text-[#eb963d]' : 'text-[#6444c0]'
                              }`}>
                                → {previewFillPct}%
                              </span>
                            )}
                            <button onClick={() => handleSimulateSensor(container.id)} className="bg-waste-deepPurple hover:bg-waste-purple text-white text-xs px-2 py-1 rounded">Enviar</button>
                            <button onClick={() => { setActiveSensorSim(null); setSensorDist(''); }} className="text-gray-500 text-xs hover:text-gray-800">✕</button>
                          </div>
                        ) : (
                          <button 
                            onClick={() => { setActiveSensorSim(container.id); setSensorDist(''); }}
                            className="text-[11px] text-gray-500 hover:text-gray-800 underline"
                          >
                            Simular sensor
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {containers.length === 0 && <p className="text-sm text-gray-500 mt-2">No hay contenedores registrados.</p>}
              </div>
            </div>

          </div>
        </section>
      </main>

      {/* TOASTS */}
      {toast && (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded shadow-lg text-white font-medium text-sm transition-opacity z-50 ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-waste-deepPurple'
        }`}>
          {toast.message}
        </div>
      )}

      {/* MODAL */}
      <AddContainerModal 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
        onContainerAdded={fetchContainers} 
      />
    </div>
  );
}

