'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, useMap, useMapEvents } from 'react-leaflet';
import { BaseTiles } from '../map/base-tiles';

const pin = L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#8B5CF6;border:3px solid #F5F3FF;
    box-shadow:0 0 16px 4px rgba(139,92,246,.7);cursor:grab"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

type Props = { lat: number; lng: number; onChange: (lat: number, lng: number) => void };

const round = (n: number) => Math.round(n * 1e6) / 1e6;

function ClickToPlace({ onChange }: Pick<Props, 'onChange'>) {
  useMapEvents({ click: (e) => onChange(round(e.latlng.lat), round(e.latlng.lng)) });
  return null;
}

function Follow({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map.getBounds().contains([lat, lng])) map.panTo([lat, lng]);
  }, [lat, lng, map]);
  return null;
}

/** Cliquer sur la carte ou déplacer le marqueur pour choisir l'emplacement exact. */
export default function LocationPickerInner({ lat, lng, onChange }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      scrollWheelZoom
      style={{ height: 300, width: '100%', borderRadius: 12, cursor: 'crosshair' }}
    >
      <BaseTiles />
      <ClickToPlace onChange={onChange} />
      <Follow lat={lat} lng={lng} />
      <Marker
        position={[lat, lng]}
        icon={pin}
        draggable
        eventHandlers={{
          dragend: (e) => {
            const p = (e.target as L.Marker).getLatLng();
            onChange(round(p.lat), round(p.lng));
          },
        }}
      />
    </MapContainer>
  );
}
