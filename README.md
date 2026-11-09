# Tunis Nightlife

Plateforme **Web et mobile (iOS / Android)** de découverte des boîtes de nuit, lounges et rooftops du
Grand Tunis : photos, notes en étoiles des membres, carte interactive, recherche « autour de moi »,
horaires, événements, favoris et back-office complet.

**🌐 Démo en ligne : [tunis-nightlife.onrender.com](https://tunis-nightlife.onrender.com)**

> Hébergement gratuit : après 15 minutes sans visite, le site se met en veille. La première
> ouverture peut prendre environ une minute.
>
> Projet portfolio full-stack. Les établissements de démonstration sont **fictifs** et affichés avec
> un badge « Démo ».

---

## Fonctionnalités

| | Web | Mobile |
| --- | :---: | :---: |
| Liste avec photos, recherche et filtres (ville, type, musique, prix, tri) | ✅ | ✅ |
| Fiche : galerie, note, horaires, « ouvert maintenant », événements | ✅ | ✅ |
| Carte interactive (OpenStreetMap / CARTO sur le Web, Apple / Google Maps sur mobile) | ✅ | ✅ |
| Autour de moi : géolocalisation, rayon de 2 à 50 km, distances (PostGIS) | ✅ | ✅ |
| Itinéraire vers l'établissement | ✅ | ✅ |
| Compte : inscription (18 ans et plus), connexion | ✅ | ✅ |
| Mot de passe oublié : lien de réinitialisation envoyé par email | ✅ | — |
| Noter de 1 à 5 étoiles avec commentaire, modifier ou supprimer son avis | ✅ | ✅ |
| Favoris | ✅ | ✅ |
| Signaler un avis | ✅ | ✅ |

### Back-office (`/admin`)

| Section | Modérateur | Administrateur |
| --- | :---: | :---: |
| Tableau de bord : indicateurs, avis par jour, établissements les mieux notés | ✅ | ✅ |
| Avis : publier ou masquer | ✅ | ✅ |
| Signalements : masquer le contenu, traiter, classer sans suite | ✅ | ✅ |
| Établissements : créer, modifier, horaires, emplacement sur la carte, photos, statut | — | ✅ |
| Événements : créer, modifier, supprimer | — | ✅ |
| Utilisateurs : changer le rôle, réinitialiser le mot de passe | — | ✅ |

Les droits sont vérifiés par l'API (`JwtAuthGuard` + `RolesGuard`) : masquer un menu ne suffit jamais.

---

## Stack technique

| Couche | Technologies |
| --- | --- |
| Web | Next.js 16 (App Router), React 19, Tailwind CSS 4, Leaflet |
| Mobile | Expo SDK 58 (React Native), React Navigation, react-native-maps |
| API | NestJS 12, Swagger, Helmet, limitation de débit |
| Validation | Zod, schémas partagés entre l'API, le Web et le mobile (`@tn/contracts`) |
| Base de données | PostgreSQL 16 + PostGIS 3, Prisma 7 |
| Emails | Brevo (API HTTP) |
| Monorepo | pnpm workspaces, TypeScript |
| Hébergement | Render (site + API) et Neon (PostgreSQL + PostGIS) |

---

## Architecture

```
Navigateur ──► Site Next.js ──relais /api/v1 et /media──► API NestJS ──► PostgreSQL + PostGIS
Application mobile ─────────── Bearer token ──────────────►    │
                                                               └──► Brevo (emails)
```

Le navigateur ne parle qu'au domaine du site : le site relaie les appels vers l'API, ce qui permet
d'utiliser un cookie de session HttpOnly sans configuration CORS côté navigateur.

## Structure du projet

```
tunis-nightlife/
├── apps/
│   ├── api/                      # API REST NestJS
│   │   ├── prisma/
│   │   │   ├── schema.prisma     # 13 tables
│   │   │   ├── migrations/       # 0001_init … 0004_password_reset_tokens
│   │   │   └── seed.ts           # données de démonstration
│   │   └── src/
│   │       ├── auth/             # inscription, connexion, sessions, mot de passe oublié
│   │       ├── venues/           # établissements, proximité, avis
│   │       ├── admin/            # back-office (stats, modération, établissements, utilisateurs)
│   │       ├── mail/             # envoi d'emails (Brevo)
│   │       └── main.ts
│   ├── web/                      # Site Next.js
│   │   └── src/app/              # pages : accueil, fiche, carte, favoris, connexion, admin…
│   └── mobile/                   # Application Expo / React Native
├── packages/
│   ├── contracts/                # schémas Zod et types partagés
│   └── config/                   # configuration TypeScript commune
├── docs/
│   ├── architecture.md
│   └── deploiement.md            # mise en ligne pas à pas (Render + Neon + Brevo)
├── render.yaml                   # déploiement Render en un clic (Blueprint)
└── docker-compose.yml            # PostgreSQL + PostGIS en local
```

---

## Démarrage local

Prérequis : **Node.js 22+**, **pnpm 10+** et **PostgreSQL 16 avec PostGIS** (via Docker ou installé
directement, voir plus bas).

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

# 4. Contrats partagés, client Prisma, migrations et données de démonstration
pnpm contracts:build
pnpm --filter @tn/api prisma:generate
pnpm --filter @tn/api prisma:deploy
pnpm db:seed

# 5. API et site (deux terminaux)
pnpm api:dev        # http://localhost:4000/api/v1 — Swagger : http://localhost:4000/api/docs
pnpm web:dev        # http://localhost:3000

# 6. Mobile (Expo Go ou émulateur)
pnpm mobile:dev
```

Comptes de démonstration créés en local : `admin@demo.local` (administrateur) et
`moderateur@demo.local` (modérateur), mot de passe `Demo-Password-2026!`.
En ligne, ce mot de passe public n'est jamais utilisé : le seed exige `SEED_PASSWORD`.

**Mot de passe oublié en local** : sans clé Brevo, le lien de réinitialisation s'affiche dans le
terminal de l'API.

**Téléphone physique** : créer `apps/mobile/.env` avec l'IP locale de l'ordinateur (même Wi-Fi) :
`EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api/v1`. Sous Windows, autoriser le port 4000 dans le
pare-feu.

### PostgreSQL sans Docker (Windows)

1. Installer PostgreSQL 16 (installateur EDB), puis **PostGIS 3.x Bundle** avec Stack Builder.
2. Créer l'utilisateur et la base dans psql :
   ```sql
   CREATE ROLE tunis WITH LOGIN SUPERUSER PASSWORD 'tunis_dev_password'; -- local uniquement
   CREATE DATABASE tunis_nightlife OWNER tunis;
   \c tunis_nightlife
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```
3. Dans `.env` :
   `DATABASE_URL=postgresql://tunis:tunis_dev_password@127.0.0.1:5432/tunis_nightlife?schema=public`

### Variables d'environnement de l'API

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | Connexion PostgreSQL |
| `JWT_SECRET` | Signature des sessions (32 caractères minimum) |
| `APP_URL` | Adresse du site, utilisée dans les liens envoyés par email |
| `BREVO_API_KEY`, `MAIL_FROM` | Envoi des emails (facultatif en local) |
| `SEED_ADMIN_EMAIL`, `SEED_PASSWORD` | Compte administrateur créé au premier démarrage en ligne |

---

## API

Documentation interactive Swagger : `http://localhost:4000/api/docs`

| Méthode | Route | Description |
| --- | --- | --- |
| GET | `/api/v1/health` | État de l'API et de la base |
| GET | `/api/v1/venues` | Liste paginée. Filtres : `q`, `city`, `type`, `priceRange`, `genre`, `minRating`, `sort` |
| GET | `/api/v1/venues/nearby` | Proximité PostGIS : `lat`, `lng`, `radiusKm` (50 max) |
| GET | `/api/v1/venues/:slug` | Fiche détaillée |
| GET | `/api/v1/filters` | Villes et genres musicaux |
| GET | `/api/v1/events` | Événements à venir |
| POST | `/api/v1/auth/register` · `login` · `logout` | Comptes (cookie HttpOnly sur le Web, jeton sur mobile) |
| POST | `/api/v1/auth/forgot-password` | Envoi d'un lien de réinitialisation par email |
| POST | `/api/v1/auth/reset-password` | Nouveau mot de passe à partir du lien reçu |
| GET | `/api/v1/auth/me` | Utilisateur connecté (`null` sinon) |
| GET | `/api/v1/venues/:slug/reviews` | Avis publiés, moyenne et répartition des notes |
| GET · PUT · DELETE | `/api/v1/venues/:slug/reviews/me` | Mon avis |
| GET · PUT · DELETE | `/api/v1/me/favorites[/:slug]` | Mes favoris |
| POST | `/api/v1/reports` | Signaler un contenu |
| GET | `/api/v1/admin/stats` | Indicateurs (modérateur, admin) |
| GET · PATCH | `/api/v1/admin/reviews…` · `/admin/reports…` | Modération (modérateur, admin) |
| GET · POST · PUT · PATCH | `/api/v1/admin/venues…` | Établissements, statut, photos (admin) |
| GET · POST · PUT · DELETE | `/api/v1/admin/events…` | Événements (admin) |
| GET · PATCH · PUT | `/api/v1/admin/users…` | Rôles et réinitialisation du mot de passe (admin) |

```bash
curl "http://localhost:4000/api/v1/venues?city=la-marsa&sort=rating"
curl "http://localhost:4000/api/v1/venues/nearby?lat=36.8782&lng=10.3247&radiusKm=8"
```

---

## Base de données

13 tables : `users`, `cities`, `music_genres`, `venues`, `venue_genres`, `venue_photos`,
`opening_hours`, `reviews`, `events`, `favorites`, `reports`, `media_files`,
`password_reset_tokens`.

Règles garanties par la base elle-même :

- note d'avis entière de 1 à 5, un seul avis par utilisateur et par établissement ;
- coordonnées limitées à la Tunisie ;
- fin d'un événement postérieure à son début ;
- horaires valides (jours 0 à 6, minutes 0 à 1439 ; une fermeture avant l'ouverture signifie
  « le lendemain ») ;
- colonne `location` (PostGIS `geography`) recalculée par trigger, avec index spatial GiST pour la
  recherche « autour de moi ».

La note moyenne n'est jamais stockée : elle est calculée sur les avis publiés.

Photos du back-office : JPEG, PNG ou WebP, 5 Mo maximum, 10 par établissement, réduites dans le
navigateur. Le type réel est vérifié à partir des premiers octets du fichier, et les photos sont
stockées en base pour survivre aux redémarrages de l'hébergeur.

---

## Sécurité

- Mots de passe hachés avec **Argon2id**, jamais stockés ni affichés en clair, y compris pour
  l'administrateur. Vérification à temps constant même si l'email n'existe pas.
- Session Web dans un cookie **HttpOnly, SameSite=Lax** (Secure en production), inaccessible au
  JavaScript de la page. Mobile : jeton dans le stockage sécurisé (expo-secure-store).
- **Mot de passe oublié** : lien à usage unique valable 30 minutes, seule son empreinte SHA-256 est
  stockée ; réponse identique que l'email soit inscrit ou non.
- Après un changement de mot de passe, toutes les sessions ouvertes du compte sont fermées.
- Limitation de débit : 100 requêtes par minute et par IP, 5 pour la connexion et l'inscription,
  3 pour les demandes de mot de passe oublié.
- Rôle relu en base à chaque requête : l'API ne fait jamais confiance au rôle envoyé par le client.
- Toutes les entrées sont validées par des schémas Zod ; en-têtes de sécurité avec Helmet.
- Géolocalisation demandée uniquement au clic, jamais en arrière-plan.

---

## Mise en ligne

Render (site + API, un seul Blueprint `render.yaml`) + Neon (PostgreSQL + PostGIS) + Brevo (emails),
offres gratuites. Guide pas à pas : [docs/deploiement.md](docs/deploiement.md).

Chaque `git push` sur `main` redéploie automatiquement le site et l'API. Au démarrage, l'API applique
les migrations et crée les données de démonstration si la base est vide.

## Photos de démonstration

Visuels originaux générés par `apps/api/scripts/generate_demo_images.py` (Python + Pillow), sans
aucune photo de lieu réel.

## Prochaines étapes

- Interface en arabe (RTL) et en anglais.
- Tests automatisés (Jest, Playwright) et intégration continue avec GitHub Actions.
- Version Android installable (APK) et publication sur les stores.
- Nom de domaine personnalisé.

---

Réalisé par **Asma Moussa**, étudiante ingénieure en informatique à l'ENIT ·
[Portfolio](https://asma2003-spec.github.io) ·
[LinkedIn](https://www.linkedin.com/in/asma-moussa-323155297/)
