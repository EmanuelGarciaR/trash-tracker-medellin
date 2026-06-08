'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Container } from '@/types';

interface MapProps {
  containers: Container[];
  routeContainers?: Container[];
  onUpdateStatus: (id: string, status: 'full' | 'empty', fill_level: number) => void;
}

const getIconColor = (status: string) => {
  if (status === 'full') return '#ef4444'; // red-500
  if (status === 'collecting') return '#eab308'; // yellow-500
  return '#22c55e'; // green-500
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

export default function Map({ containers, routeContainers, onUpdateStatus }: MapProps) {
  const center: [number, number] = [6.2442, -75.5812];

  const polylinePositions = routeContainers?.map(c => [c.lat, c.lng] as [number, number]) || [];

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', minHeight: '500px', zIndex: 0 }}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {containers.map((container) => (
        <Marker
          key={container.id}
          position={[container.lat, container.lng]}
          icon={createCustomIcon(container.status, container.fill_level)}
        >
          <Popup>
            <div className="flex flex-col gap-2 min-w-[200px]">
              <h3 className="font-bold text-lg">{container.name}</h3>
              <div className="flex justify-between text-sm">
                <span>Estado:</span>
                <span className="font-semibold uppercase">{container.status}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${container.fill_level}%` }}
                ></div>
              </div>
              <p className="text-xs text-center">{container.fill_level}% lleno</p>
              
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => onUpdateStatus(container.id, 'full', 100)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1 px-2 rounded"
                >
                  Marcar lleno
                </button>
                <button 
                  onClick={() => onUpdateStatus(container.id, 'empty', 0)}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded"
                >
                  Marcar vacío
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {polylinePositions.length > 0 && (
        <Polyline 
          positions={polylinePositions} 
          pathOptions={{ color: '#3b82f6', weight: 4, dashArray: '10, 10' }} 
        />
      )}
    </MapContainer>
  );
}
