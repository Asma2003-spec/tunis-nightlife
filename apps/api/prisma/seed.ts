/**
 * Données de démonstration — Tunis Nightlife
 *
 * IMPORTANT : tous les établissements, événements, utilisateurs et avis créés ici
 * sont FICTIFS. Ils sont marqués `isDemo = true` et doivent être présentés comme
 * tels dans le portfolio. Les coordonnées situent seulement les lieux dans les
 * bons quartiers pour tester la carte et la recherche de proximité.
 *
 * Usage : pnpm db:seed (exécute `prisma db seed` → `tsx prisma/seed.ts`)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from '@node-rs/argon2';
import { PrismaClient, type PriceRange, type VenueType } from '../src/generated/prisma/client';

/**
 * --if-empty : utilisé au démarrage du serveur en ligne. Les données de démonstration et le
 * compte administrateur ne sont créés que si la base est vide (premier déploiement) ;
 * ensuite le seed ne touche plus jamais aux données.
 */
const IF_EMPTY = process.argv.includes('--if-empty');

if (process.env.NODE_ENV === 'production' && !IF_EMPTY) {
  throw new Error('En production, le seed ne peut être lancé qu’avec --if-empty.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

/**
 * Mot de passe des comptes de démonstration. Pour une base EN LIGNE, définir obligatoirement
 * SEED_PASSWORD (et SEED_ADMIN_EMAIL) : le mot de passe par défaut est public sur GitHub.
 */
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Demo-Password-2026!';
const ADMIN_EMAIL = (process.env.SEED_ADMIN_EMAIL || 'admin@demo.local').toLowerCase();
const isPublicPassword = !process.env.SEED_PASSWORD;

if (isPublicPassword && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL ?? '')) {
  throw new Error(
    'Base distante détectée : définis SEED_PASSWORD (et SEED_ADMIN_EMAIL) avant de lancer le seed.',
  );
}
if (DEMO_PASSWORD.length < 12)
  throw new Error('SEED_PASSWORD doit contenir au moins 12 caractères.');

const CITIES = [
  { slug: 'tunis', name: 'Tunis', nameAr: 'تونس' },
  { slug: 'la-marsa', name: 'La Marsa', nameAr: 'المرسى' },
  { slug: 'gammarth', name: 'Gammarth', nameAr: 'قمرت' },
  { slug: 'hammamet', name: 'Hammamet', nameAr: 'الحمامات' },
];

const GENRES = [
  { slug: 'house', name: 'House' },
  { slug: 'techno', name: 'Techno' },
  { slug: 'afro', name: 'Afro' },
  { slug: 'rnb-hiphop', name: 'R&B / Hip-hop' },
  { slug: 'oriental', name: 'Oriental' },
  { slug: 'commercial', name: 'Commercial' },
];

type DemoVenue = {
  slug: string;
  name: string;
  type: VenueType;
  city: string;
  address: string;
  latitude: number;
  longitude: number;
  priceRange: PriceRange;
  genres: string[];
  /** Horaires : jours (0 = dimanche) et plage en minutes depuis minuit */
  days: number[];
  opensAt: number;
  closesAt: number;
};

const NIGHT = { opensAt: 23 * 60, closesAt: 5 * 60 }; // 23:00 → 05:00 (lendemain)
const LOUNGE = { opensAt: 18 * 60, closesAt: 2 * 60 }; // 18:00 → 02:00 (lendemain)
const THU_SAT = [4, 5, 6];
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];

const VENUES: DemoVenue[] = [
  {
    slug: 'nebuleuse-club',
    name: 'Nébuleuse Club',
    type: 'NIGHTCLUB',
    city: 'gammarth',
    address: 'Zone touristique, Gammarth (adresse fictive)',
    latitude: 36.918,
    longitude: 10.288,
    priceRange: 'LUXURY',
    genres: ['house', 'techno'],
    days: THU_SAT,
    ...NIGHT,
  },
  {
    slug: 'orbite-rooftop',
    name: 'Orbite Rooftop',
    type: 'ROOFTOP',
    city: 'la-marsa',
    address: 'Corniche, La Marsa (adresse fictive)',
    latitude: 36.8782,
    longitude: 10.3247,
    priceRange: 'EXPENSIVE',
    genres: ['commercial', 'rnb-hiphop'],
    days: EVERY_DAY,
    ...LOUNGE,
  },
  {
    slug: 'lune-violette-lounge',
    name: 'Lune Violette Lounge',
    type: 'LOUNGE',
    city: 'tunis',
    address: 'Les Berges du Lac 2, Tunis (adresse fictive)',
    latitude: 36.845,
    longitude: 10.272,
    priceRange: 'MODERATE',
    genres: ['oriental', 'commercial'],
    days: EVERY_DAY,
    ...LOUNGE,
  },
  {
    slug: 'circuit-underground',
    name: 'Circuit Underground',
    type: 'NIGHTCLUB',
    city: 'tunis',
    address: 'Centre-ville, Tunis (adresse fictive)',
    latitude: 36.8065,
    longitude: 10.1815,
    priceRange: 'BUDGET',
    genres: ['techno'],
    days: [5, 6],
    ...NIGHT,
  },
  {
    slug: 'sable-noir-beach',
    name: 'Sable Noir Beach Club',
    type: 'BEACH_CLUB',
    city: 'hammamet',
    address: 'Yasmine Hammamet (adresse fictive)',
    latitude: 36.37,
    longitude: 10.54,
    priceRange: 'EXPENSIVE',
    genres: ['afro', 'house'],
    days: EVERY_DAY,
    opensAt: 12 * 60,
    closesAt: 2 * 60,
  },
  {
    slug: 'atelier-48',
    name: 'Atelier 48',
    type: 'BAR',
    city: 'la-marsa',
    address: 'Marsa Plage (adresse fictive)',
    latitude: 36.8835,
    longitude: 10.33,
    priceRange: 'MODERATE',
    genres: ['rnb-hiphop', 'afro'],
    days: [2, 3, 4, 5, 6],
    opensAt: 19 * 60,
    closesAt: 1 * 60,
  },
  {
    slug: 'prisme-club',
    name: 'Prisme Club',
    type: 'NIGHTCLUB',
    city: 'hammamet',
    address: 'Hammamet Nord (adresse fictive)',
    latitude: 36.41,
    longitude: 10.6,
    priceRange: 'MODERATE',
    genres: ['commercial', 'oriental'],
    days: THU_SAT,
    ...NIGHT,
  },
  {
    slug: 'horizon-gammarth',
    name: 'Horizon Gammarth',
    type: 'LOUNGE',
    city: 'gammarth',
    address: 'Côte de Gammarth (adresse fictive)',
    latitude: 36.925,
    longitude: 10.295,
    priceRange: 'LUXURY',
    genres: ['house', 'oriental'],
    days: EVERY_DAY,
    ...LOUNGE,
  },
];

/** Générateur pseudo-aléatoire déterministe : le seed produit toujours les mêmes données. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const COMMENTS = [
  'Très bonne ambiance, son de qualité et équipe accueillante.',
  'Cadre agréable mais un peu d’attente à l’entrée.',
  'Musique au top, prix un peu élevés pour les boissons.',
  'Soirée correcte, rien d’exceptionnel cette fois-ci.',
  'Vue magnifique et service rapide, je recommande.',
  'Trop de monde ce soir-là, difficile de circuler.',
];

/** Prochaine occurrence d'un jour de semaine à une heure locale Tunis (UTC+1, sans heure d'été). */
function nextLocal(weekday: number, hour: number, weeksAhead = 0): Date {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour - 1));
  const delta = (weekday - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + delta + weeksAhead * 7);
  return d;
}

async function main() {
  if (IF_EMPTY && (await prisma.user.count()) > 0) {
    console.log('✓ Base déjà initialisée : seed ignoré.');
    return;
  }
  console.log('→ Nettoyage des données existantes');
  await prisma.$transaction([
    prisma.report.deleteMany(),
    prisma.mediaFile.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.review.deleteMany(),
    prisma.event.deleteMany(),
    prisma.venuePhoto.deleteMany(),
    prisma.openingHours.deleteMany(),
    prisma.venueGenre.deleteMany(),
    prisma.venue.deleteMany(),
    prisma.musicGenre.deleteMany(),
    prisma.city.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  console.log('→ Utilisateurs de démonstration');
  const passwordHash = await hash(DEMO_PASSWORD); // Argon2id par défaut
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Démo',
      email: ADMIN_EMAIL,
      passwordHash,
      role: 'ADMIN',
      ageConfirmedAt: new Date(),
    },
  });
  const moderator = await prisma.user.create({
    data: {
      name: 'Modérateur Démo',
      email: 'moderateur@demo.local',
      passwordHash,
      role: 'MODERATOR',
      ageConfirmedAt: new Date(),
    },
  });
  const users = await Promise.all(
    ['Yasmine', 'Karim', 'Sarra', 'Mehdi', 'Ines', 'Omar'].map((name) =>
      prisma.user.create({
        data: {
          name: `${name} (démo)`,
          email: `${name.toLowerCase()}@demo.local`,
          passwordHash,
          ageConfirmedAt: new Date(),
        },
      }),
    ),
  );

  console.log('→ Villes et genres');
  const cities = new Map<string, string>();
  for (const c of CITIES) cities.set(c.slug, (await prisma.city.create({ data: c })).id);
  const genres = new Map<string, string>();
  for (const g of GENRES) genres.set(g.slug, (await prisma.musicGenre.create({ data: g })).id);

  console.log('→ Établissements fictifs');
  const random = rng(2026);
  for (const [index, v] of VENUES.entries()) {
    const venue = await prisma.venue.create({
      data: {
        slug: v.slug,
        name: v.name,
        description: `${v.name} est un établissement FICTIF créé pour la démonstration de la plateforme. Les informations affichées ne correspondent à aucun lieu réel.`,
        type: v.type,
        cityId: cities.get(v.city)!,
        address: v.address,
        latitude: v.latitude,
        longitude: v.longitude,
        priceRange: v.priceRange,
        instagram: null,
        status: 'PUBLISHED',
        isDemo: true,
        createdById: admin.id,
        genres: { create: v.genres.map((slug) => ({ genreId: genres.get(slug)! })) },
        openingHours: {
          create: v.days.map((weekday) => ({ weekday, opensAt: v.opensAt, closesAt: v.closesAt })),
        },
        photos: {
          create: [0, 1, 2].map((position) => ({
            storageKey: `demo/venues/${v.slug}/${position}.jpg`,
            altText: `${v.name} — photo de démonstration ${position + 1}`,
            position,
          })),
        },
      },
    });

    // Avis : 3 à 6 auteurs différents, quelques-uns en attente de modération
    const authors = users.slice(0, 3 + Math.floor(random() * 4));
    for (const [i, author] of authors.entries()) {
      const rating = Math.min(5, Math.max(1, Math.round(2.5 + random() * 2.8)));
      const isPending = i === authors.length - 1 && index % 3 === 0;
      await prisma.review.create({
        data: {
          userId: author.id,
          venueId: venue.id,
          rating,
          comment: COMMENTS[Math.floor(random() * COMMENTS.length)]!,
          status: isPending ? 'PENDING' : 'PUBLISHED',
          moderatedById: isPending ? null : moderator.id,
          moderatedAt: isPending ? null : new Date(),
        },
      });
    }

    // Événements à venir pour les boîtes de nuit et beach clubs
    if (v.type === 'NIGHTCLUB' || v.type === 'BEACH_CLUB') {
      for (const week of [0, 1]) {
        const startsAt = nextLocal(6, 23, week); // samedi 23:00 heure de Tunis
        const endsAt = new Date(startsAt.getTime() + 6 * 3600 * 1000);
        await prisma.event.create({
          data: {
            venueId: venue.id,
            slug: `${v.slug}-soiree-${startsAt.toISOString().slice(0, 10)}`,
            title: `Soirée ${v.genres[0]!.toUpperCase()} (démo)`,
            description: 'Événement fictif de démonstration.',
            startsAt,
            endsAt,
            status: 'PUBLISHED',
          },
        });
      }
    }
  }

  // Deux signalements de démonstration pour l'espace de modération
  const someReviews = await prisma.review.findMany({ take: 2, orderBy: { createdAt: 'asc' } });
  for (const [i, review] of someReviews.entries()) {
    await prisma.report.create({
      data: {
        reporterId: users[5 - i]!.id,
        targetType: 'REVIEW',
        targetId: review.id,
        reason: i === 0 ? 'Faux avis' : 'Contenu offensant',
        details: 'Signalement de démonstration.',
      },
    });
  }

  // Quelques favoris
  const allVenues = await prisma.venue.findMany({ select: { id: true } });
  await prisma.favorite.createMany({
    data: [
      { userId: users[0]!.id, venueId: allVenues[0]!.id },
      { userId: users[0]!.id, venueId: allVenues[2]!.id },
      { userId: users[1]!.id, venueId: allVenues[1]!.id },
    ],
  });

  const counts = {
    utilisateurs: await prisma.user.count(),
    etablissements: await prisma.venue.count(),
    avis: await prisma.review.count(),
    evenements: await prisma.event.count(),
  };
  console.log('✓ Seed terminé', counts);
  console.log(
    isPublicPassword
      ? `  Comptes de démo : ${ADMIN_EMAIL} / moderateur@demo.local — mot de passe : ${DEMO_PASSWORD}`
      : `  Administrateur : ${ADMIN_EMAIL} — mot de passe : celui défini dans SEED_PASSWORD`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
