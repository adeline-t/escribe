# Escribe

Application React + Vite avec persistance via Cloudflare Workers + D1 (recommandé).

## Démarrage rapide

1. Installer les dépendances:

```bash
npm install
```

2. Copier et remplir les variables d'environnement (backend):

```bash
cp .env.example .env
```

3. (Optionnel) Configurer le front:

```bash
cp frontend/.env.example frontend/.env
```

4. Démarrer l'app + API:

```bash
npm run dev:all
```

Le front tourne sur `http://localhost:5173` et l'API sur `http://localhost:4000` (Express) ou une URL Worker.

## Scripts utiles

- `npm run dev`: front Vite uniquement
- `npm run dev:client`: front Vite uniquement
- `npm run dev:server`: API Express uniquement
- `npm run dev:worker`: API Cloudflare Worker (D1 dev)
- `npm run dev:all`: front + API en parallèle
- `npm run db:check`: test de connexion DB
- `npm run build`: build front

## Backend Cloudflare (D1)

1. Créer la base D1:

```bash
npx wrangler d1 create escribe
```

2. Renseigner l'id dans `backend/worker/wrangler.toml`.
3. Adapter `CORS_ORIGIN` si besoin.
4. Alimenter le lexique (1 table par type):

```bash
npm run db:seed:dev
```

ou en prod:

```bash
npm run db:seed:prod
```
4. Déployer:

```bash
npm run deploy:worker
```

Puis configurer `VITE_API_BASE` dans `frontend/.env` avec l'URL du Worker.

## Environnements

- Frontend dev: `frontend/.env.development` (API locale)
- Frontend prod: `frontend/.env.production` (API Cloudflare Worker)
- Backend dev: `wrangler --env=dev` (D1 `escribe-dev`)
- Backend prod: env top-level (D1 `escribe`)

## API

- `GET /api/state` renvoie l'état JSON
- `POST /api/state` persiste l'état JSON

## Structure DB

Une table `app_state` est créée automatiquement au démarrage de l'API.
