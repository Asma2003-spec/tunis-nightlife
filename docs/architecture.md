# Architecture

```
 Next.js (Web)      Expo (Android / iOS)
        \                 /
         \   HTTPS/JSON  /
          v             v
        API REST NestJS  /api/v1
   validation Zod · rôles · rate limit
                 |
            Prisma 7 (pg)
                 |
     PostgreSQL 16 + PostGIS 3
```

## Choix principaux

- **Une seule API versionnée** (`/api/v1`) consommée par le Web et le mobile.
- **Contrats partagés** (`packages/contracts`) : les mêmes schémas Zod valident les requêtes côté API
  et les formulaires côté clients. Aucun secret ni logique serveur dans ce paquet.
- **PostGIS** : la colonne `location geography(Point, 4326)` est calculée par trigger et indexée en GiST.
  La recherche de proximité utilise `ST_DWithin` (index) puis `ST_Distance` pour le tri.
- **Intégrité en base** : contraintes CHECK et unicités en plus de la validation applicative, pour
  qu'aucun client ne puisse contourner les règles.
- **Notes honnêtes** : moyenne calculée sur les avis publiés, toujours accompagnée du nombre d'avis.
- **Dates** : stockées en UTC (`timestamptz`), affichées dans le fuseau `Africa/Tunis`.

## Sécurité déjà en place

- Helmet (en-têtes HTTP), CORS limité aux origines configurées, limitation à 100 requêtes/minute/IP.
- Paramètres validés et bornés (pagination ≤ 50, rayon ≤ 50 km, tri parmi une liste fermée).
- Requêtes SQL brutes paramétrées via `Prisma.sql` (pas de concaténation de chaînes).
- Seuls les établissements `PUBLISHED` sont exposés publiquement.
- Le seed de démonstration refuse de s'exécuter si `NODE_ENV=production`.
