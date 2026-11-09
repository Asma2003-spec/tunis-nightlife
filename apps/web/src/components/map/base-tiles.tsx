'use client';

import { TileLayer } from 'react-leaflet';

/**
 * Fond de carte sombre.
 * - Avec NEXT_PUBLIC_CARTO_KEY (clé gratuite sur carto.com/basemaps/apikey) : tuiles CARTO « Dark Matter ».
 *   Depuis septembre 2026, CARTO affiche « API KEY REQUIRED » sans clé.
 * - Sans clé : tuiles OpenStreetMap, assombries en CSS (classe .tiles-dark dans globals.css).
 * La variable est lue au moment du build : après l'avoir ajoutée sur Render, il faut redéployer le site.
 */
const CARTO_KEY = process.env.NEXT_PUBLIC_CARTO_KEY;

export function BaseTiles() {
  if (CARTO_KEY) {
    return (
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url={`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(CARTO_KEY)}`}
      />
    );
  }
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      maxZoom={19}
      className="tiles-dark"
    />
  );
}
