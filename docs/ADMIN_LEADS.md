# Admin — leads + contenu

## Principe

```
apps/app, servi sous /app-demo/admin (même déploiement GitHub Pages)
                    │
        Login Supabase Auth (compte unique, créé par toi)
                    │
        ┌───────────┴───────────┐
        │                       │
   Onglet Leads            Onglet Contenu
        │                       │
  Edge Function            Edge Function
  admin-leads              admin-generate-content
  (service_role,           (Gemini pour générer,
   bypass RLS après         GitHub API pour ouvrir
   vérif JWT)                une PR — status: draft)
```

Style repris du haut de la home (`RefsStage` : dark, dynamique) mais gardé
simple : un shell sombre unique (`.shell` / `.panel`, déjà utilisé par le
wizard démo public `App.tsx`) et un **parcours en wizard** — une question à
la fois, pas de dashboard dense.

Aucun secret ne transite par le front : la clé Gemini et le token GitHub
vivent uniquement dans les secrets de la fonction Supabase
`admin-generate-content`, jamais dans `apps/app`.

## Ce que tu dois faire (comptes / secrets)

### 1. Compte admin (Supabase Auth)

Dashboard Supabase → **Authentication → Users → Add user** → créer ton
compte (email + mot de passe). C'est le seul compte qui pourra se
connecter — pas d'inscription publique.

### 2. Token GitHub (pour ouvrir les PR de contenu)

1. [github.com/settings/tokens](https://github.com/settings/tokens) → 
   **Fine-grained tokens → Generate new token**.
2. Repository access : uniquement `atrari-pro/studio-jannah`.
3. Permissions : **Contents: Read and write**, **Pull requests: Read and
   write**.
4. Copier le token (`github_pat_...`).

### 3. Clé Gemini (gratuite)

Comme précédemment : [aistudio.google.com/apikey](https://aistudio.google.com/apikey),
compte Google, "Create API key".

### 4. Déployer les fonctions et poser les secrets

```bash
pnpm dlx supabase functions deploy admin-leads
pnpm dlx supabase functions deploy admin-generate-content

pnpm dlx supabase secrets set \
  GEMINI_API_KEY=... \
  GITHUB_TOKEN=github_pat_...
```

(`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont déjà injectées
automatiquement par Supabase dans chaque fonction, rien à poser.)

Si le déploiement via CLI échoue, passer par le Dashboard → Edge Functions →
Via Editor, comme documenté pour `notify-lead` dans `docs/LEAD_NOTIFICATIONS.md`
(les fonctions sont volontairement en JS pur pour cette raison).

### 5. Schéma leads

Exécuter `supabase/leads.sql` (idempotent — ajoute juste les colonnes
`status`/`notes`/`updated_at` si la table existe déjà).

### 6. Variables front

`apps/app/.env` (voir `.env.example`) : mêmes `PUBLIC_SUPABASE_URL` /
`PUBLIC_SUPABASE_ANON_KEY` que `apps/web/.env`. En CI, les mêmes secrets
GitHub Actions déjà utilisés pour le déploiement de `apps/web` sont réutilisés.

## Accès une fois déployé

`https://atrari-pro.github.io/studio-jannah/app-demo/admin/` — page de
login, rien de visible sans le compte créé à l'étape 1.

## Ce que fait chaque onglet

**Leads** : liste (nom, statut), clic → détail (message complet, statut
parmi nouveau/contacté/qualifié/perdu/gagné, notes libres), enregistrer.

**Contenu** : wizard type (insight/use case) → rubrique ou secteur → format
(texte/vidéo pour un insight) → texte brut → sources → récapitulatif →
génération (Gemini, aperçu affiché) → validation → ouverture de la PR.
Toujours `status: draft` en sortie — la mise en ligne réelle reste le merge
de la PR par toi, jamais automatique.

## Hors scope V1

- Pas de multi-utilisateur / rôles.
- Pas de réponse email intégrée depuis l'admin (reply_to déjà géré par
  `notify-lead`).
- Pas d'upload de fichier vidéo depuis l'admin — coller une URL déjà
  hébergée (voir le champ dédié dans le wizard contenu).
- Pas d'events tracking sur les actions admin.

## Décisions (2026-08-25)

Scope initial (leads seuls) élargi en cours de route pour inclure la
publication de contenu via LLM dans le même espace, à la demande de
l'utilisateur ("plus cohérent qu'un flux séparé"). Le flux GitHub
Issue/Action envisagé un temps a été abandonné au profit de cette page
admin unique.
