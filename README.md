# Escribe

Escribe est une application pour créer, organiser et relire des phrases d'armes. Elle permet de décrire un combat étape par étape, tout en conservant une lecture globale structurée. Le front est en React + Vite, et la persistance est gérée côté API (Express local ou Cloudflare Workers + D1).

## Fonctionnel

### Parcours principal

1. Se connecter (ou créer un compte).
2. Créer un combat avec un nom et une description.
3. Définir les combattants (nombre et noms).
4. Créer des phrases, puis ajouter des étapes à chaque phrase.
5. Lire la phrase en mode cartes (lecture par colonne et par rôle).
6. Gérer le lexique partagé et ses favoris.

### Pages et usages

#### Accueil

- Résumé de l'état courant: nombre de combattants, nombre d'étapes en cours, dernier combat.
- Accès rapides vers: création d'un combat, gestion des combats, lexique, compte.

#### Créer un combat / Liste des combats

- Création d'un combat (nom + description).
- Liste des combats existants, filtrable et triable.
- Ouverture d'un combat pour poursuivre l'édition.
- Archivage et désarchivage des combats.

#### Édition d'un combat (création de phrase)

- Informations du combat (nom, description).
- Gestion des combattants:
  - choix du nombre (2 a 4),
  - personnalisation des noms.
- Liste des phrases:
  - création, sélection,
  - renommage,
  - réorganisation (drag & drop + flèches).
- Étapes d'une phrase:
  - ajout d'une étape (attaque, défense, ou sans rôle),
  - édition d'une étape existante,
  - suppression d'une étape.
- Lecture par cartes:
  - lecture en colonnes (un combattant par colonne),
  - visualisation des actions et réactions,
  - flèches de lecture entre attaque et défense.
- Résumé de la phrase:
  - synthèse textuelle par combattant,
  - utile pour vérifier la cohérence globale avant l'ajout.

#### Liste des phrases créées

- Lecture de la phrase active avec le détail de toutes les étapes.
- Résumé par combattant (cards), même logique de rôles.
- Bloc de nettoyage pour supprimer des étapes rapidement.

#### Lexique

- Gestion d'un vocabulaire structuré par catégories:
  - Offensive
  - Action d'arme
  - Attribut attaque
  - Cible
  - Déplacement attaque
  - Défensive
  - Numéro de parade
  - Attribut parade
  - Déplacement défense
- Vue Global et Personnel.
- Ajout et suppression d'entrées (selon les droits).
- Favoris par catégorie.
- Filtrage et tri (A-Z, Z-A, récent, ancien).

#### Mon compte

- Affichage des informations utilisateur (rôle, email).
- Mise à jour du profil (prénom, nom).
- Changement de mot de passe.
- Déconnexion.

#### Administration (admin / superadmin)

- Liste des utilisateurs avec leurs rôles.
- Mise à jour du rôle d'un utilisateur.
- Journal d'audit des actions.

### Rôles et permissions

- Utilisateur: accès aux combats, phrases, lexique personnel, profil.
- Admin / Superadmin: accès au lexique global, à la gestion des utilisateurs et à l'audit.

### Données et persistance

- L'état de travail (combat, combattants, phrases, étapes, formulaire) est persisté automatiquement.
- Sauvegarde automatique déclenchée après les modifications (debounce de 400 ms).
- Possibilité de reprendre le dernier combat via l'accueil.

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
4. Appliquer les migrations:

```bash
npm run db:migrate:dev
```

Vérifier le statut:

```bash
npm run db:migrate:status:dev
```

5. Alimenter le lexique (1 table par type):

```bash
npm run db:seed:dev
```

ou en prod:

```bash
npm run db:seed:prod
```

6. Déployer:

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

## Licence

Ce projet est distribué sous licence GNU GPL v3.0. Voir le fichier `LICENSE`.
