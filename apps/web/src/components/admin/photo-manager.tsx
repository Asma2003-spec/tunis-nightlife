'use client';

import { useRef, useState } from 'react';
import type { AdminVenueDetail } from '@tn/contracts';
import { adminApi } from '@/lib/admin-api';
import { media } from '@/lib/api';
import { ErrorNote, btn } from './ui';

type Photo = AdminVenueDetail['photos'][number];

const ACCEPT = 'image/jpeg,image/png,image/webp';

export function PhotoManager({ venueId, initial }: { venueId: string; initial: Photo[] }) {
  const [photos, setPhotos] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const reload = async () => setPhotos((await adminApi.venue(venueId)).photos);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      // Envoi un par un : un fichier refusé n'empêche pas les autres
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} : 5 Mo maximum`);
        await adminApi.uploadPhoto(venueId, file, '');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      await reload();
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  async function makeCover(id: string) {
    const order = [id, ...photos.filter((p) => p.id !== id).map((p) => p.id)];
    setBusy(true);
    await adminApi.reorderPhotos(venueId, order).catch((e: Error) => setError(e.message));
    await reload();
    setBusy(false);
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cette photo ?')) return;
    setBusy(true);
    await adminApi.deletePhoto(venueId, id).catch((e: Error) => setError(e.message));
    await reload();
    setBusy(false);
  }

  return (
    <section className="rounded-2xl border border-surface-2 bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Photos ({photos.length}/10)</h2>
          <p className="text-sm text-muted">
            JPEG, PNG ou WebP, 5 Mo maximum. La première est la couverture.
          </p>
        </div>
        <label
          className={`${btn.primary} cursor-pointer ${busy || photos.length >= 10 ? 'pointer-events-none opacity-50' : ''}`}
        >
          {busy ? 'Envoi…' : '+ Ajouter des photos'}
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            onChange={(e) => upload(e.target.files)}
          />
        </label>
      </div>
      <ErrorNote error={error} />
      {photos.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-2 p-8 text-center text-sm text-muted">
          Aucune photo. Un établissement sans photo s’affiche avec un fond neutre.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p, i) => (
            <figure key={p.id} className="group relative overflow-hidden rounded-xl bg-night">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media(p.storageKey)!}
                alt={p.altText}
                className="aspect-[3/2] w-full object-cover"
              />
              {i === 0 && (
                <span className="absolute top-2 left-2 rounded-full bg-violet px-2 py-0.5 text-xs font-semibold text-white">
                  Couverture
                </span>
              )}
              <figcaption className="flex justify-between gap-2 p-2">
                {i > 0 ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => makeCover(p.id)}
                    className="text-xs text-violet-glow"
                  >
                    Mettre en couverture
                  </button>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(p.id)}
                  className="text-xs text-pink-300"
                >
                  Supprimer
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
