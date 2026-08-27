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
Toujours `status: draft` en sortie.

**Drafts en attente** : liste les PR ouvertes issues de l'admin (branches
`content/admin-*`). Clic → deux vues :
- **Aperçu** : reproduit le style de la vraie page `/mag/[slug]` (mêmes
  tokens CSS + fonts Manrope/Syne que `apps/web`) — pas la page réelle
  (site statique GitHub Pages, aucune route protégée possible côté site
  public), mais visuellement iso.
- **Modifier** : titre, description, statut, corps Markdown éditables,
  "Enregistrer" pousse un commit sur la branche de la PR (les autres champs
  du frontmatter — tags, sources, rubrique... — restent intacts).

CTA **"Publier en prod"** : force `status: published`, enregistre, merge la
PR (squash) et supprime la branche. Le déploiement GitHub Actions prend le
relais automatiquement. **Ce n'est plus manuel** : décision explicite pour
que l'admin couvre tout le cycle jusqu'à prod, contrairement au principe
initial ("jamais automatique") — le seul garde-fou restant est la
confirmation à deux clics dans l'UI avant le merge.

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

## Décisions (2026-08-26)

Onglet Drafts ajouté (lecture des PR ouvertes, hors scope V1 initial) puis
étendu à l'édition + publication en un clic ("iso à la page où l'article va
atterrir... jusqu'au push prod", demande explicite de l'utilisateur). Le
principe "jamais automatique" du scope V1 est levé pour ce cas précis :
confirmé avec l'utilisateur avant implémentation (question posée : bouton de
merge dans l'admin vs merge resté manuel sur GitHub → réponse : bouton
complet).

Onglet **Articles publiés** ajouté après un incident réel (image non
autorisée publiée par erreur via Drafts, corrigée manuellement en urgence —
`status: published → draft` + suppression du fichier, poussé direct sur
`main`). Reprend la main sur tout le contenu déjà en ligne :
- **Aperçu** / **Modifier** : l'édition passe par une PR (même garde-fou de
  revue que Drafts — une branche est créée à l'ouverture de "Modifier", la
  PR n'est ouverte qu'au premier "Enregistrer" puisque GitHub refuse une PR
  sans diff ; "Fusionner" merge le correctif, confirmation à deux clics).
- **Dépublier** (`status → draft`) / **Supprimer** (fichier + images) :
  actions directes sur `main`, sans PR — volontaire, elles ne font que
  réduire l'exposition, la vitesse prime sur la revue dans ce sens-là.
- Supprimer ne purge pas l'historique git (juste le HEAD de `main`) — une
  purge complète demanderait un force-push, à ne faire qu'à la demande
  explicite.
