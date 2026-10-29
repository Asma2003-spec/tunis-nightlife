/** Lien d'itinéraire Google Maps vers un point (ouvre l'application Maps sur mobile). */
export const directionsUrl = (p: { latitude: number; longitude: number }) =>
  `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`;
