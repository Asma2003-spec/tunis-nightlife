'use client';

import { ApiError } from './api';

/**
 * Réveil de l'API sur l'hébergement gratuit : après 15 minutes sans visite, l'API s'endort et
 * met environ une minute à redémarrer. Ce module attend qu'elle réponde (en interrogeant
 * /health), informe la bannière « Le serveur démarre… » et relance les requêtes échouées.
 */

export type ApiStatus = 'ok' | 'waking' | 'down';

const HEALTH_URL = '/api/v1/health';
const SHOW_BANNER_AFTER_MS = 2_500;
// Réveil complet de l'offre gratuite : souvent 1 minute, parfois 2 ou 3
const GIVE_UP_AFTER_MS = 300_000;
export const SERVER_DOWN_MESSAGE =
  'Le serveur ne répond pas pour le moment : réessaie dans quelques secondes';

let status: ApiStatus = 'ok';
let pending: Promise<boolean> | null = null;
const listeners = new Set<(s: ApiStatus) => void>();

function setStatus(next: ApiStatus) {
  if (next === status) return;
  status = next;
  listeners.forEach((fn) => fn(next));
}

export const getApiStatus = () => status;

export function subscribeApiStatus(fn: (s: ApiStatus) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function ping(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Attend que l'API réponde (5 minutes au plus). Un seul réveil à la fois pour toute la page. */
export function waitForApi(): Promise<boolean> {
  pending ??= (async () => {
    const started = Date.now();
    const banner = setTimeout(() => setStatus('waking'), SHOW_BANNER_AFTER_MS);
    let ok = await ping();
    while (!ok && Date.now() - started < GIVE_UP_AFTER_MS) {
      setStatus('waking');
      await sleep(3_000);
      ok = await ping();
    }
    clearTimeout(banner);
    setStatus(ok ? 'ok' : 'down');
    return ok;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

/** Réponse produite par le relais du site quand l'API ne répond pas (et non par l'API elle-même). */
function looksAsleep(res: Response | null): boolean {
  if (!res) return true; // erreur réseau
  if (![500, 502, 503, 504].includes(res.status)) return false;
  return !(res.headers.get('content-type') ?? '').includes('application/json');
}

/**
 * fetch qui gère le réveil de l'API : si elle dort, on attend qu'elle réponde puis on relance
 * la requête une fois. Les erreurs renvoyées par l'API elle-même (JSON) ne sont pas concernées.
 */
export async function fetchWithWake(url: string, init: RequestInit): Promise<Response> {
  let res = await fetch(url, init).catch(() => null);
  if (looksAsleep(res) && (await waitForApi())) {
    res = await fetch(url, init).catch(() => null);
  }
  if (!res) throw new ApiError(0, SERVER_DOWN_MESSAGE);
  return res;
}
