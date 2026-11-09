'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, useMap } from 'react-leaflet';
import { BaseTiles } from './base-tiles';
import { directionsUrl } from '@/lib/geo';
import type { MapPoint, VenueMapProps } from './venue-map';

// Marqueurs en HTML/CSS : pas d'images d'icônes à charger, couleurs du design system
const venueIcon = (highlight: boolean) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${highlight ? 22 : 18}px;height:${highlight ? 22 : 18}px;border-radius:50%;
      background:#8B5CF6;border:3px solid #F5F3FF;box-shadow:0 0 16px 4px rgba(139,92,246,.7)"></div>`,
    iconSize: [highlight ? 22 : 18, highlight ? 22 : 18],
    iconAnchor: [highlight ? 11 : 9, highlight ? 11 : 9],
  });

const userIcon = L.divIcon({
  className: '',
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#38BDF8;
    border:3px solid #fff;box-shadow:0 0 0 8px rgba(56,189,248,.25)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Recadre la carte pour montrer tous les points (et la position de l'utilisateur). */
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const key = points.map((p) => p.join(',')).join('|');
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) map.setView(points[0]!, 14);
    else map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function VenueMapInner({
  points,
  user,
  radiusKm,
  height = 420,
  highlightSlug,
}: VenueMapProps) {
  const all: [number, number][] = points.map((p) => [p.latitude, p.longitude]);
  if (user) all.push([user.latitude, user.longitude]);

  return (
    <MapContainer
      center={all[0] ?? [36.85, 10.25]}
      zoom={11}
      scrollWheelZoom
      style={{ height, width: '100%', borderRadius: 16 }}
    >
      <BaseTiles />
      <FitBounds points={all} />

      {user && (
        <>
          <Marker position={[user.latitude, user.longitude]} icon={userIcon}>
            <Popup>Vous êtes ici</Popup>
          </Marker>
          {radiusKm && (
            <Circle
              center={[user.latitude, user.longitude]}
              radius={radiusKm * 1000}
              pathOptions={{ color: '#38BDF8', weight: 1, fillOpacity: 0.06 }}
            />
          )}
        </>
      )}

      {points.map((p: MapPoint) => (
        <Marker
          key={p.slug}
          position={[p.latitude, p.longitude]}
          icon={venueIcon(p.slug === highlightSlug)}
        >
          <Popup>
            <strong>{p.name}</strong>
            {p.subtitle && (
              <>
                <br />
                {p.subtitle}
              </>
            )}
            <br />
            <a href={`/venues/${p.slug}`}>Voir la fiche</a> ·{' '}
            <a href={directionsUrl(p)} target="_blank" rel="noopener noreferrer">
              Itinéraire
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
