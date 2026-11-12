# Mise en ligne — Tunis Nightlife (version simple)

Deux services gratuits, aucune commande à taper :

```
Navigateur ──► Render « tunis-nightlife » (site) ──relais /api/v1 et /media──► Render « tunis-nightlife-api » ──► Neon (PostgreSQL + PostGIS)
```

## 1. Envoyer le code sur GitHub

```powershell
git add .
git commit -m "Mise en ligne"
git push
```

## 2. Base de données — neon.com

1. Se connecter avec GitHub, **New project** : Postgres **16**, région **Frankfurt**.
2. **Connect** : désactiver **Connection pooling**, puis **copier** la chaîne `postgresql://…?sslmode=require`.

## 3. Site et API — render.com

1. Se connecter avec GitHub, **New → Blueprint**, choisir le dépôt `tunis-nightlife`.
2. Render affiche les 2 services du fichier `render.yaml` et demande 3 valeurs :
   - `DATABASE_URL` : la chaîne copiée sur Neon ;
   - `SEED_ADMIN_EMAIL` : ton email (ton compte administrateur en ligne) ;
   - `SEED_PASSWORD` : ton mot de passe administrateur (12 caractères minimum, à garder pour toi).
3. **Apply**, puis attendre que les deux services soient **Live** (environ 5 à 10 minutes).

À la première construction, Render crée les tables, active PostGIS, ajoute les établissements de
démonstration et ton compte administrateur. Ensuite, chaque construction applique seulement les
nouvelles migrations : les données ne sont jamais réinitialisées. Le démarrage, lui, ne fait que
lancer l'API, pour que le réveil après la mise en veille soit rapide.

## 4. C'est en ligne

- Site public : `https://tunis-nightlife.onrender.com`
- API : `https://tunis-nightlife-api.onrender.com/api/v1/health`

Se connecter sur le site avec `SEED_ADMIN_EMAIL` / `SEED_PASSWORD` : le bouton **Admin** apparaît.

**Si Render a donné une autre adresse à l'API** (nom déjà pris) : service `tunis-nightlife` →
**Environment** → corriger `API_URL` → **Save, rebuild and deploy**.

## Ensuite

- Chaque `git push` met à jour le site et l'API automatiquement.
- Application mobile : dans `apps/mobile/.env`,
  `EXPO_PUBLIC_API_URL=https://tunis-nightlife-api.onrender.com/api/v1`.

## Limites de l'offre gratuite

- Les services se mettent en veille après 15 minutes sans visite ; le réveil prend environ une minute.
  Si la page affiche « API non joignable », patienter puis recharger.
- Le disque de Render est effacé à chaque redémarrage : les photos envoyées depuis le back-office
  sont donc stockées dans la base (table `media_files`). Utiliser des photos de moins de 4 Mo.

## Mot de passe oublié : envoi des emails (Brevo)

L'API envoie les liens de réinitialisation avec Brevo (gratuit, 300 emails par jour), par son API
HTTP : l'offre gratuite de Render bloque les ports SMTP.

1. Créer un compte gratuit sur **brevo.com**.
2. **Expéditeur** : menu **Senders, domains & dedicated IPs** → **Senders** → **Add sender**,
   avec ton adresse email, puis valider le code reçu par email.
3. **Clé** : menu **SMTP & API** → onglet **API keys** → **Generate a new API key**, puis la copier
   (elle commence par `xkeysib-`). Ne la partager avec personne.
4. **Render** → `tunis-nightlife-api` → **Environment** → ajouter :
   - `BREVO_API_KEY` : la clé copiée ;
   - `MAIL_FROM` : l'adresse validée à l'étape 2 ;
   puis **Save, rebuild and deploy**.

`APP_URL` (adresse du site mise dans le lien) est déjà dans `render.yaml`.

En local, sans `BREVO_API_KEY`, le lien de réinitialisation s'affiche dans le terminal de l'API.

**Si l'email n'arrive pas** : regarder les courriers indésirables, puis les **Logs** de l'API.
Une erreur Brevo `401` mentionnant une adresse IP : dans Brevo, menu **Security** →
**Authorised IPs**, désactiver le blocage des adresses IP inconnues (Render change d'adresse IP).
