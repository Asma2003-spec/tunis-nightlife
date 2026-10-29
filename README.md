# Tunis Nightlife

Plateforme Web + Android/iOS de découverte des boîtes de nuit, lounges et rooftops du Grand Tunis :
photos, notes en étoiles des membres, carte, recherche « autour de moi », horaires, événements et favoris.

## Fonctionnalités

| | Web | Mobile |
| --- | --- | --- |
| Liste avec photos, recherche et filtres (ville, type, musique, tri) | ✅ | ✅ |
| Fiche : galerie, note, horaires, « ouvert maintenant », événements | ✅ | ✅ |
| Carte (OpenStreetMap / CARTO sur le Web, Apple/Google Maps sur mobile) | ✅ | ✅ |
| Autour de moi : géolocalisation, rayon 2–50 km, distances (PostGIS) | ✅ | ✅ |
| Itinéraire vers l'établissement | ✅ | ✅ |
| Compte : inscription (18 ans et plus), connexion | ✅ | ✅ |
| Noter de 1 à 5 étoiles + commentaire, modifier ou supprimer son avis | ✅ | ✅ |
| Favoris | ✅ | ✅ |
| Signaler un avis | ✅ | — |

### Back-office (`/admin`, Web)

| Section | Modérateur | Administrateur |
| --- | --- | --- |
| Tableau de bord (indicateurs, avis par jour, mieux notés) | ✅ | ✅ |
| Avis : publier ou masquer | ✅ | ✅ |
| Signalements : masquer l'avis, traiter, classer sans suite | ✅ | ✅ |
| Établissements : créer, modifier, horaires, emplacement sur carte, photos, statut | — | ✅ |
| Événements : créer, modifier, supprimer | — | ✅ |
| Utilisateurs : rôles | — | ✅ |

Comptes de démo : `admin@demo.local` (administrateur) et `moderateur@demo.local` (modérateur).
Les droits sont vérifiés par l'API (`JwtAuthGuard` + `RolesGuard`) : masquer un menu ne suffit jamais.

Envoi de photos : JPEG, PNG ou WebP, 5 Mo maximum, 10 par établissement. Le type réel du fichier est
vérifié à partir de ses premiers octets et le nom est généré par le serveur
(`apps/api/media/uploads/…`, exclu de Git).

> Projet portfolio full-stack. Les établissements fournis par le seed sont **fictifs** (`isDemo = true`)
> et affichés avec un badge « Démo ».

## Stack

| Couche | Technologie |
| --- | --- |
| Web | Next.js 16, React 19, Tailwind CSS 4 |
| Mobile | Expo SDK 58 (React Native) |
| API | NestJS 12, validation Zod partagée, Swagger, Helmet, rate limiting |
| Base de données | PostgreSQL 16 + PostGIS 3, Prisma 7 (adaptateur `pg`) |
| Contrats partagés | `@tn/contracts` — types et schémas Zod utilisés par l'API, le Web et le mobile |
| Monorepo | pnpm workspaces |

## Structure

```
tunis-nightlife/
├── apps/
│   ├── api/                 # NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/0001_init/migration.sql
│   │   │   └── seed.ts      # données fictives
│   │   ├── prisma.config.ts
│   │   └── src/             # modules health, venues, prisma
│   ├── web/                 # Next.js (App Router)
│   └── mobile/              # Expo / React Native
├── packages/
│   ├── contracts/           # schémas Zod + types partagés
│   └── config/              # tsconfig de base
├── docs/architecture.md
└── docker-compose.yml       # PostgreSQL + PostGIS
```

## Démarrage local

Prérequis : Node.js 22+, pnpm 10+ et PostgreSQL 16 avec PostGIS, soit via Docker, soit installé
directement (voir « PostgreSQL sans Docker » plus bas).

```bash
# 1. Dépendances
pnpm install

# 2. Variables d'environnement
cp .env.example .env
cp .env.example apps/api/.env
#    Dans apps/api/.env, remplir JWT_SECRET avec une valeur aléatoire :
#    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 3. Base de données (PostGIS dans Docker)
pnpm db:up

# 4. Contrats partagés, client Prisma, migration et données de démo
pnpm contracts:build
pnpm --filter @tn/api prisma:generate
pnpm --filter @tn/api prisma:deploy
pnpm db:seed

# 5. Lancer l'API puis le Web (deux terminaux)
pnpm api:dev        # http://localhost:4000/api/v1 — Swagger : http://localhost:4000/api/docs
pnpm web:dev        # http://localhost:3000

# 6. Mobile (Expo Go ou émulateur)
pnpm mobile:dev
```

Sur un téléphone physique, crée `apps/mobile/.env` avec l'IP locale de l'ordinateur
(même Wi-Fi) : `EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api/v1`. Sous Windows, autorise le
port 4000 dans le pare-feu.

### PostgreSQL sans Docker (Windows)

1. Installer PostgreSQL 16 (installateur EDB), puis **PostGIS 3.x Bundle** via Stack Builder.
2. Créer l'utilisateur et la base (psql) :
   ```sql
   CREATE ROLE tunis WITH LOGIN SUPERUSER PASSWORD 'tunis_dev_password'; -- local uniquement
   CREATE DATABASE tunis_nightlife OWNER tunis;
   \c tunis_nightlife
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. `DATABASE_URL=postgresql://tunis:tunis_dev_password@127.0.0.1:5432/tunis_nightlife?schema=public`

Comptes de démonstration créés par le seed (local uniquement) :
`admin@demo.local` et `moderateur@demo.local`, mot de passe `Demo-Password-2026!`.

## Endpoints disponibles

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/v1/health` | État de l'API et de la base |
| GET | `/api/v1/venues` | Liste paginée. Filtres : `q`, `city`, `type`, `priceRange`, `genre`, `minRating`, `sort`, `page`, `pageSize` |
| GET | `/api/v1/venues/nearby` | Proximité PostGIS : `lat`, `lng`, `radiusKm` (max 50), `limit` |
| GET | `/api/v1/venues/:slug` | Fiche détaillée (établissement publié uniquement) |
| GET | `/api/v1/filters` | Villes et genres musicaux |
| GET | `/api/v1/events` | Événements à venir (`venue`, `city`, `limit`) |
| POST | `/api/v1/auth/register` · `/auth/login` · `/auth/logout` | Comptes (cookie HttpOnly pour le Web, jeton pour le mobile) |
| GET | `/api/v1/auth/me` | Utilisateur connecté (`null` sinon) |
| GET | `/api/v1/venues/:slug/reviews` | Avis publiés, moyenne et répartition des notes |
| GET · PUT · DELETE | `/api/v1/venues/:slug/reviews/me` | Mon avis (connexion requise) |
| GET · PUT · DELETE | `/api/v1/me/favorites[/:slug]` | Mes favoris (connexion requise) |
| GET | `/media/...` | Photos des établissements |
| POST | `/api/v1/reports` | Signaler un contenu (connexion requise) |
| GET | `/api/v1/admin/stats` | Indicateurs (modérateur, admin) |
| GET · PATCH | `/api/v1/admin/reviews[/:id]` | Modération des avis (modérateur, admin) |
| GET · PATCH | `/api/v1/admin/reports[/:id]` | Traitement des signalements (modérateur, admin) |
| GET · POST · PUT · PATCH | `/api/v1/admin/venues…` | Établissements, statut, photos (admin) |
| GET · POST · PUT · DELETE | `/api/v1/admin/events…` | Événements (admin) |
| GET · PATCH | `/api/v1/admin/users…` | Utilisateurs et rôles (admin) |

Exemples :

```bash
curl "http://localhost:4000/api/v1/venues?city=la-marsa&sort=rating"
curl "http://localhost:4000/api/v1/venues/nearby?lat=36.8782&lng=10.3247&radiusKm=8"
```

## Base de données

Le schéma (`apps/api/prisma/schema.prisma`) couvre le MVP : `users`, `cities`, `music_genres`,
`venues`, `venue_genres`, `venue_photos`, `opening_hours`, `reviews`, `events`, `favorites`, `reports`.

Règles garanties par la base elle-même (fin de `migration.sql`) :

- note d'avis entière entre 1 et 5, un seul avis par utilisateur et par établissement ;
- coordonnées limitées à la Tunisie ;
- `ends_at > starts_at` pour les événements ;
- jours 0–6 et horaires en minutes 0–1439 (une fermeture ≤ ouverture signifie « le lendemain ») ;
- colonne `location` (PostGIS `geography`) toujours recalculée par trigger depuis latitude/longitude,
  avec index GiST pour la recherche de proximité.

La note moyenne n'est jamais stockée : elle est calculée sur les avis `PUBLISHED` et toujours renvoyée
avec le nombre d'avis.

### Modifier le schéma

```bash
# après avoir modifié schema.prisma
pnpm db:migrate     # prisma migrate dev : crée une nouvelle migration et l'applique
```

## Sécurité des comptes

- Mots de passe hachés avec **Argon2id** ; vérification à temps constant même si l'email n'existe pas.
- Session Web dans un cookie **HttpOnly, SameSite=Lax** (Secure en production) : le jeton n'est pas
  accessible au JavaScript de la page. Mobile : jeton dans le trousseau sécurisé (expo-secure-store).
- Connexion et inscription limitées à 5 tentatives par minute et par IP.
- Rôle relu en base à chaque requête : on ne fait jamais confiance au rôle envoyé par le client.
- Avis : un seul par personne et par établissement, publiés immédiatement, modération a posteriori.
- Géolocalisation demandée seulement au clic, jamais en arrière-plan.

## Photos de démonstration

Les photos sont des visuels originaux générés par `apps/api/scripts/generate_demo_images.py`
(Python + Pillow), sans aucune photo de lieu réel. Pour les régénérer :
`python apps/api/scripts/generate_demo_images.py`.

## Prochaines étapes

1. Mise en ligne (API, base PostgreSQL + PostGIS, site Web) avec un vrai nom de domaine.
2. Stockage des photos compatible S3 pour la production.
3. Interface en arabe (RTL) et en anglais.
4. Tests automatisés (Jest, Playwright) et CI GitHub Actions.
