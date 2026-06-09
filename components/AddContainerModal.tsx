'use client';

import { useState, useRef, useEffect } from 'react';
import { animateModalEnter, animateModalExit, hoverPrimaryBtn, pressPrimaryBtn } from '@/lib/animations';

interface AddContainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContainerAdded: () => void;
}

export default function AddContainerModal({ isOpen, onClose, onContainerAdded }: AddContainerModalProps) {
  const [name, setName] = useState('');
  const [lat, setLat] = useState<number | ''>('');
  const [lng, setLng] = useState<number | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRendered, setIsRendered] = useState(isOpen);
  
  const overlayRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
    } else if (isRendered) {
      if (overlayRef.current && modalRef.current) {
        animateModalExit(overlayRef.current, modalRef.current).then(() => {
          setIsRendered(false);
        });
      } else {
        setIsRendered(false);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && isRendered && overlayRef.current && modalRef.current) {
      animateModalEnter(overlayRef.current, modalRef.current);
    }
  }, [isOpen, isRendered]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no soportada por tu navegador');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setError('');
      },
      () => {
        setError('Error al obtener tu ubicación. Asegúrate de dar permisos.');
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/containers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, lat: Number(lat), lng: Number(lng) })
      });

      if (!res.ok) {
        throw new Error('Error al guardar el contenedor');
      }

      onContainerAdded();
      onClose();
      setName('');
      setLat('');
      setLng('');
    } catch (err) {
      if (err instanceof Error) setError(err.message);
      else setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  if (!isRendered) return null;

  return (
    <div ref={overlayRef} className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Añadir Contenedor</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        <p className="text-sm text-waste-deepPurple mb-4 bg-waste-light p-3 rounded border border-waste-purple">
          Puedes obtener coordenadas haciendo clic derecho en Google Maps → Copiar coordenadas.
        </p>

        {error && <div className="mb-4 text-red-500 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del contenedor</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Ej: Parque Berrío"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Latitud</label>
              <input
                type="number"
                step="any"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border rounded p-2"
                placeholder="6.2442"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Longitud</label>
              <input
                type="number"
                step="any"
                required
                value={lng}
                onChange={(e) => setLng(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full border rounded p-2"
                placeholder="-75.5812"
              />
            </div>
          </div>

          <button 
            type="button" 
            onClick={handleUseMyLocation}
            className="text-sm text-waste-deepPurple hover:text-waste-purple self-start font-medium"
          >
            Usar mi ubicación actual
          </button>

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border rounded p-2 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={loading}
              onMouseEnter={(e) => hoverPrimaryBtn(e.currentTarget, true)}
              onMouseLeave={(e) => hoverPrimaryBtn(e.currentTarget, false)}
              onMouseDown={(e) => pressPrimaryBtn(e.currentTarget, true)}
              onMouseUp={(e) => pressPrimaryBtn(e.currentTarget, false)}
              className="flex-1 bg-waste-orange text-white rounded p-2 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
