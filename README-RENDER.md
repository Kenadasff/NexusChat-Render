# NexusChat — version corrigée pour Render

Cette version est autonome et prête pour un **Render Static Site**.

## Réglages Render

- **Runtime:** Static Site
- **Build Command:** `npm run build`
- **Publish Directory:** `dist`
- **Root Directory:** laisser vide

Aucune variable `PORT` ou `BASE_PATH` n'est nécessaire.

## Corrections effectuées

- Suppression des dépendances Replit en `catalog:` qui faisaient échouer `npm install`.
- Suppression des dépendances `@workspace/*` et des références à `tsconfig.base.json` absentes du ZIP.
- Suppression des plugins Replit du `vite.config.ts`.
- Suppression de la dépendance à `PORT` et `BASE_PATH` qui n'est pas nécessaire pour un site statique Render.
- Correction de la sortie Vite vers `dist`.
- Correction du chemin `index.html` -> `src/main.tsx`.
- Remplacement de l'écran « Replit Agent is building... » par une interface NexusChat fonctionnelle.
- Nettoyage du CSS : les anciennes variables `red` utilisées comme valeurs HSL étaient invalides.
- Conservation des composants UI et des dépendances nécessaires.
