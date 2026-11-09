import { fetchVenues } from '@/lib/api';
import { ApiWaking } from '@/components/api-wake';
import { NearbyExplorer } from './nearby-explorer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Carte et autour de moi — Tunis Nightlife' };

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const { focus } = await searchParams;
  const all = await fetchVenues({ pageSize: '50', sort: 'rating' }).catch(() => null);
  const explorer = <NearbyExplorer venues={all?.items ?? []} focus={focus} />;
  // API endormie : la carte s'affiche vide puis se remplit à son réveil
  return all ? explorer : <ApiWaking>{explorer}</ApiWaking>;
}
