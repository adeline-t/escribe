# Déploiement & Environnements

Ce document décrit les étapes **local**, **dev** et **prod** ainsi que les fichiers associés.

## Tableau récapitulatif des commandes

| Environnement | Objectif | Commandes clés |
| --- | --- | --- |
| Local | Front + API Express | `npm run dev:all` |
| Local | Front + Worker local | `npm run deploy:local` |
| Local | Migrations D1 local | `npm run db:migrate:local` |
| Local | Seed D1 local | `npm run db:seed:local` |
| Dev | Migrations D1 dev | `npm run db:migrate:dev` |
| Dev | Seed D1 dev | `npm run db:seed:dev` |
| Dev | Déployer Worker dev | `npm run deploy:worker:dev` |
| Prod | Migrations D1 prod | `npm run db:migrate:prod` |
| Prod | Seed D1 prod | `npm run db:seed:prod` |
| Prod | Déployer Worker | `npm run deploy:worker` |
| Prod | Build front | `npm run build` |
| Prod | Déployer Pages | `npm run pages:deploy` |
| Tous | Sync lexique | `npm run db:seed:from-json` |

## Local (dev machine)

### Objectif
- Travailler en local avec Vite + API (Express ou Worker).

### Étapes (Express local)
1. Installer les dépendances
   ```bash
   npm install
   ```
2. Configurer les variables
   - `./.env` (backend Express)
   - `frontend/.env` ou `frontend/.env.development` (optionnel si besoin d'une base API différente via `VITE_API_BASE`)
3. Démarrer front + API Express
   ```bash
   npm run dev:all
   ```

### Étapes (Worker local)
1. Synchroniser le lexique (si modifié)
   ```bash
   npm run db:seed:from-json
   ```
2. Appliquer les migrations locales D1
   ```bash
   npm run db:migrate:local
   ```
3. Seed la base locale D1
   ```bash
   npm run db:seed:local
   ```
4. Lancer le Worker local + front
   ```bash
   npm run deploy:local
   ```

### Fichiers liés
- `frontend/.env` (front local)
- `frontend/.env.development` (si utilisé)
- `.env` (Express local)
- `backend/worker/wrangler.toml` (config Worker)
- `db/lexicon.sql` (seed D1)
- `frontend/src/data/lexicon.json` (source lexique)
- `backend/worker/src/lexicon.seed.json` (seed Worker)

---

## Dev (Cloudflare D1 + Worker dev)

### Objectif
- Tester l'API sur l'environnement `dev` (D1 `escribe-dev`).

### Étapes
1. Synchroniser le lexique (si modifié)
   ```bash
   npm run db:seed:from-json
   ```
2. Appliquer les migrations (dev)
   ```bash
   npm run db:migrate:dev
   ```
3. Seed la base dev
   ```bash
   npm run db:seed:dev
   ```
4. Déployer le Worker dev
   ```bash
   npm run deploy:worker:dev
   ```
5. (Optionnel) Pointer le front vers l'API dev
   - Définir `VITE_API_BASE` dans `frontend/.env.development` ou `frontend/.env`

### Fichiers liés
- `backend/worker/wrangler.toml` (env `dev`)
- `db/lexicon.sql` (seed D1 dev)
- `frontend/src/data/lexicon.json` (source lexique)
- `backend/worker/src/lexicon.seed.json` (seed Worker)

---

## Prod (Cloudflare D1 + Worker + Pages)

### Objectif
- Mettre en production l'API et le front.

### Étapes
1. Synchroniser le lexique (si modifié)
   ```bash
   npm run db:seed:from-json
   ```
2. Appliquer les migrations (prod)
   ```bash
   npm run db:migrate:prod
   ```
3. Seed la base prod
   ```bash
   npm run db:seed:prod
   ```
4. Déployer le Worker
   ```bash
   npm run deploy:worker
   ```
5. Build du front
   ```bash
   npm run build
   ```
6. Déployer le front (Pages)
   ```bash
   npm run pages:deploy
   ```
   Ce script déploie explicitement sur la branche `main` pour forcer l'environnement Production.

### Variante: déploiement complet
```bash
npm run deploy:prod
```

### Fichiers liés
- `backend/worker/wrangler.toml` (env prod)
- `frontend/.env.production` (base API prod)
- `db/lexicon.sql` (seed D1 prod)
- `frontend/src/data/lexicon.json` (source lexique)
- `backend/worker/src/lexicon.seed.json` (seed Worker)

---

## Notes utiles

- Le lexique est **centralisé** dans `frontend/src/data/lexicon.json`.
- `npm run db:seed:from-json` régénère automatiquement :
  - `backend/worker/src/lexicon.seed.json`
  - `db/lexicon.sql`
- Le Worker ne seed le lexique que si les tables sont vides.
