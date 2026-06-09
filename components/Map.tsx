import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, GeoJSON, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Container } from '@/types';
import { hoverPopupBtn, animateMarkerPop } from '@/lib/animations';

interface MapProps {
  containers: Container[];
  route: {
    ordered_containers: Container[];
    geometry: GeoJSON.LineString | null;
    osrm_fallback: boolean;
  } | null;
  onStatusChange: (id: string, status: 'full' | 'empty', fill_level: number) => void;
}

const getIconColor = (status: string) => {
  if (status === 'full') return '#e07506'; // waste-orange
  if (status === 'collecting') return '#eb963d'; // waste-lightOrange
  return '#6444c0'; // waste-deepPurple
};

const createCustomIcon = (status: string, fill_level: number) => {
  const color = getIconColor(status);
  
  return L.divIcon({
    className: 'custom-icon',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 2px solid white;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 12px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${fill_level}%
      </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15],
  });
};

const createNumberIcon = (num: number) => {
  return new L.DivIcon({
    html: `<div style="background: black; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; margin-left: 18px; margin-top: -36px;">${num}</div>`,
    className: 'custom-number-icon',
    iconSize: [0, 0],
  });
};

function FallbackBanner() {
  const map = useMap();
  useEffect(() => {
    const CustomControl = L.Control.extend({
      options: { position: 'bottomleft' },
      onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        div.innerHTML = '<div style="background-color: #e07b00; color: white; padding: 5px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; border: none; margin-bottom: 20px; margin-left: 10px;">Ruta aproximada — OSRM no disponible</div>';
        return div;
      }
    });
    const control = new CustomControl();
    map.addControl(control);
    return () => { map.removeControl(control); };
  }, [map]);
  return null;
}

export default function Map({ containers, route, onStatusChange }: MapProps) {
  const center: [number, number] = [6.2442, -75.5812];

  const routeOrderMap: Record<string, number> = {};
  if (route && route.ordered_containers) {
    route.ordered_containers.forEach((c, i) => {
      routeOrderMap[c.id] = i + 1;
    });
  }

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', minHeight: '500px', zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {containers.map((container) => {
        const orderNum = routeOrderMap[container.id];
        return (
          <div key={container.id}>
            <Marker 
              position={[container.lat, container.lng]} 
              icon={createCustomIcon(container.status, container.fill_level)}
              eventHandlers={{
                add: (e) => {
                  if (container.status === 'full' || container.status === 'empty') {
                    // Small pop when added if newly marked
                    animateMarkerPop(e.target.getElement());
                  }
                }
              }}
            >
              <Popup>
                <div className="font-semibold text-sm mb-1">{container.name}</div>
                <div className={`status-badge text-[10px] uppercase px-2 py-1 rounded inline-block font-bold mb-2 text-white ${
                  container.status === 'full' ? 'bg-[#e07506]' : 
                  container.status === 'empty' ? 'bg-[#6444c0]' : 'bg-[#eb963d]'
                }`}>
                  {container.status}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                  <div 
                    className="h-2.5 rounded-full" 
                    style={{ width: `${container.fill_level}%`, backgroundColor: getIconColor(container.status) }}
                  ></div>
                </div>
                <p className="text-xs text-center">{container.fill_level}% lleno</p>
                <div className="flex gap-2 mt-2">
                  <button 
                    onClick={() => onStatusChange(container.id, 'full', 100)}
                    onMouseEnter={(e) => hoverPopupBtn(e.currentTarget, true, '#e07506', '#eb963d')}
                    onMouseLeave={(e) => hoverPopupBtn(e.currentTarget, false, '#e07506', '#eb963d')}
                    className="flex-1 bg-[#e07506] text-white text-xs py-1 px-2 rounded"
                  >
                    Marcar lleno
                  </button>
                  <button 
                    onClick={() => onStatusChange(container.id, 'empty', 0)}
                    onMouseEnter={(e) => hoverPopupBtn(e.currentTarget, true, '#6444c0', '#8e7cc3')}
                    onMouseLeave={(e) => hoverPopupBtn(e.currentTarget, false, '#6444c0', '#8e7cc3')}
                    className="flex-1 bg-[#6444c0] text-white text-xs py-1 px-2 rounded"
                  >
                    Marcar vacío
                  </button>
                </div>
              </Popup>
            </Marker>
            {orderNum && (
              <Marker 
                position={[container.lat, container.lng]}
                icon={createNumberIcon(orderNum)}
                interactive={false}
              />
            )}
          </div>
        );
      })}

      {route && !route.osrm_fallback && route.geometry && (
        <GeoJSON 
          data={route.geometry} 
          style={{ color: '#8e7cc3', weight: 5, opacity: 0.8 }} 
        />
      )}

      {route && route.osrm_fallback && (
        <>
          <Polyline 
            positions={route.ordered_containers.map(c => [c.lat, c.lng] as [number, number])} 
            pathOptions={{ color: '#e07b00', weight: 4, dashArray: '8 6' }} 
          />
          <FallbackBanner />
        </>
      )}
    </MapContainer>
  );
}
