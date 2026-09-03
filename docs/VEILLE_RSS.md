# Veille RSS

## Principe

```
apps/app, servi sous /app-demo/admin (même déploiement GitHub Pages)
                    │
        Login Supabase Auth (compte unique, même que Leads/Contenu)
                    │
              Onglet "Veille RSS"
                    │
              Edge Function admin-veille
        (service_role, bypass RLS après vérif JWT — même pattern
         que admin-leads, voir docs/ADMIN_LEADS.md)
                    │
     fetch flux RSS/Atom + parse (npm:fast-xml-parser)
                    │
     upsert dédupliqué sur `link` → table veille_rss
     (cache temporaire — pas le pipeline éditorial)
                    │
              Onglet "Veille RSS" → bouton "Filtrer (IA)"
                    │
              Edge Function admin-veille-filter
     (même auth JWT → service_role, articles status=nouveau
      + relevance non jugée)
                    │
     relit .claude/agents/veille-filter.md EN BRUT sur GitHub
     à CHAQUE appel (pas figé dans le code) + 1 appel Gemini
     pour tout le lot (GEMINI_API_KEY, déjà un secret du projet)
                    │
     écrit relevance (pertinent|hors_scope) + relevance_reason
     — axe séparé de `status`, ne publie rien
                    │
     pnpm veille:list (en local, service_role) ──→ toi
                    │
     tri + résumé manuel, puis pipeline éditorial (AGENTS.md :
     Research → GEO/SEO → Publish → QA)
                    │
     content/insights/*.md (status draft → review → published)
```

`veille_rss` n'est qu'un tampon : les articles y arrivent bruts après fetch,
et n'entrent dans le vrai contenu du site qu'après être passés par le
pipeline éditorial existant — rien n'est publié automatiquement, y compris
après le filtrage IA (qui ne fait que juger, jamais publier).

## Déploiement initial

### 1. Table

Dashboard Supabase → **SQL Editor** → coller `supabase/veille_rss.sql` → Run.

### 2. Edge Functions

```bash
pnpm dlx supabase login          # une fois, ouvre le navigateur
pnpm dlx supabase link --project-ref eileoaxbxiimmrcakhcy
pnpm dlx supabase functions deploy admin-veille
pnpm dlx supabase functions deploy admin-veille-filter
```

(`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont déjà injectées
automatiquement par Supabase dans chaque fonction, rien à poser en secret.
`admin-veille-filter` a besoin en plus de `GEMINI_API_KEY` — déjà posée en
secret projet pour `admin-generate-content`, voir `docs/ADMIN_LEADS.md` ;
les secrets Supabase sont partagés par toutes les fonctions du projet, rien
à reconfigurer.)

### 3. Script local

Créer un `.env` à la racine du repo (voir `.env.example`) :

```
SUPABASE_URL=https://eileoaxbxiimmrcakhcy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
```

La clé `service_role` (Project Settings → **API Keys** → `service_role` /
`secret`) donne un accès total à la base, en bypass RLS — jamais côté
client, jamais commitée (`.env` est dans `.gitignore`).

## Utilisation courante

1. `/admin` → **Veille RSS** → régler le nombre d'articles et l'URL du flux
   (défaut : `https://www.searchenginejournal.com/feed/`) → **Récupérer**.
2. **Filtrer (IA)** → juge chaque article en attente, affiche le résultat
   trié (pertinent → non jugé → hors scope) avec la raison sous chaque
   article. Optionnel : sans clic, tout reste visible et triable à la main.
3. En local : `pnpm veille:list` → affiche titre / lien / résumé de tous les
   articles `status = nouveau` (le filtrage IA n'exclut rien de cette
   liste, c'est juste une info affichée en plus dans l'admin — décider quoi
   en faire reste manuel).
4. Demander à Claude Code de lire cette liste, résumer et lancer le pipeline
   éditorial (`AGENTS.md`) sur les articles pertinents.

## Ajouter un nouveau flux RSS

Rien à coder : changer l'URL dans le champ "URL du flux RSS" de l'admin (ou
passer un `source` différent dans le body de la requête `POST`). La fonction
accepte n'importe quel flux RSS 2.0 ou Atom standard ; le `source` (label
court en base, ex. `searchenginejournal`) est dérivé automatiquement du nom
de domaine.

⚠️ **Un flux peut bloquer l'IP des Edge Functions Supabase** (protection
anti-bot type Cloudflare), indépendamment du header envoyé — rencontré avec
`searchengineland.com/feed` (403 systématique), d'où le choix de
`searchenginejournal.com` comme flux par défaut. Si un nouveau flux échoue
toujours en 403/timeout alors qu'il répond bien depuis un navigateur normal,
c'est très probablement ce cas — pas un bug de la fonction. Pas de solution
générique trouvée (proxys publics testés sans succès) ; pour ces sources,
il faut soit un autre flux couvrant le même sujet, soit une récupération
ponctuelle par un autre moyen (hors admin).

## Filtrage IA

Un pré-tri, pas une publication : `admin-veille-filter` juge chaque article
`status = nouveau` pas encore jugé (`relevance is null`) et écrit
`relevance` (`pertinent` | `hors_scope`) + `relevance_reason` (une phrase,
justifiant le verdict) — deux colonnes séparées de `status`, qui reste
l'état de workflow (ton action, pas celle de l'IA). Aucun article n'est
supprimé, republié ou exclu de `pnpm veille:list` par ce filtrage — c'est
une information en plus, pas une décision automatique.

### Modifier les critères de pertinence

Les critères vivent dans **`.claude/agents/veille-filter.md`**, pas dans le
code de la fonction. Elle relit ce fichier **en brut sur GitHub**
(`raw.githubusercontent.com/.../main/...`) à chaque appel :

1. Éditer `.claude/agents/veille-filter.md`
2. `git commit` + push sur `main` (une PR normale, ou direct si tu es seul
   à committer ce fichier)
3. Le **prochain clic** sur "Filtrer (IA)" utilise la nouvelle version —
   **aucun redeploy de fonction nécessaire**

Contrepartie assumée : un changement de critère doit être poussé sur
`main` pour prendre effet (pas de test sur une version non commitée), et
chaque exécution ajoute un appel réseau vers GitHub (repo public, aucune
authentification requise). L'historique git de ce fichier documente
l'évolution des critères dans le temps.

### Limites connues

- Le jugement se fait sur **titre + résumé RSS uniquement**, jamais le
  contenu complet de la page — plus rapide, moins de risque de blocage
  réseau (voir la section flux RSS ci-dessus), mais un résumé RSS pauvre
  peut donner un verdict `hors_scope` par défaut ("résumé insuffisant")
  même sur un article potentiellement pertinent. À vérifier manuellement en
  cas de doute plutôt que de faire confiance aveuglément.
- Un mot ambigu dans les critères peut produire un faux positif/négatif —
  rencontré en pratique : "consentement" seul faisait remonter des articles
  de sécurité logicielle (accès admin sans consentement utilisateur) comme
  "pertinent" avant d'être précisé en "consentement marketing (CMP, Consent
  Mode, cookies RGPD)". Revoir la formulation d'un critère est la première
  chose à faire si les verdicts semblent systématiquement à côté sur un
  type d'article donné.

## Retester une brique isolément

Avec un token de session admin (DevTools → Network → une requête
`admin-leads` ou `admin-veille` → Headers → `authorization: Bearer …`) :

```bash
# Lister les articles en attente
curl -s "https://eileoaxbxiimmrcakhcy.supabase.co/functions/v1/admin-veille?status=nouveau" \
  -H "authorization: Bearer <TOKEN>"

# Déclencher un fetch
curl -s -X POST "https://eileoaxbxiimmrcakhcy.supabase.co/functions/v1/admin-veille" \
  -H "authorization: Bearer <TOKEN>" -H "content-type: application/json" \
  -d '{"count":5,"source":"https://www.searchenginejournal.com/feed/"}'

# Lancer le filtrage IA sur les articles en attente
curl -s -X POST "https://eileoaxbxiimmrcakhcy.supabase.co/functions/v1/admin-veille-filter" \
  -H "authorization: Bearer <TOKEN>" -H "content-type: application/json"
```

Sans token → `401`. Un flux invalide/inaccessible → `502` avec un message
d'erreur. Relancer le même fetch deux fois de suite doit donner
`inserted: 0` la deuxième fois (dédup sur `link`). Relancer le filtrage
deux fois de suite doit donner `judged: 0` (rien à rejuger tant qu'aucun
nouvel article `relevance is null` n'est arrivé).

## Chat veille (recherche IA conversationnelle)

Un deuxième outil, séparé du flux RSS : un onglet admin "Chat veille (IA)"
où on discute avec un assistant Gemini (recherche web activée) — "trouve-
moi 3 flux RSS sur le tracking", puis on rebondit sur la réponse. Complète
`pnpm veille:search` (digest ponctuel, terminal, mémoire persistée) plutôt
que le remplace : ici la conversation vit uniquement dans le navigateur,
perdue au changement d'écran ou au reload (choix volontaire du premier
jet — pas de persistance serveur).

**Stateless côté serveur** : `admin-veille-chat` ne touche à aucune table
Supabase — le front renvoie l'historique complet des messages à chaque
tour, la fonction fait un aller-retour Gemini et répond. Pas de `.sql` à
déployer pour cette brique.

Mêmes critères éditoriaux que le filtre RSS (`.claude/agents/
veille-filter.md`, relus en brut sur GitHub à chaque appel, aucun redeploy
si on les modifie). Mêmes garanties sur les sources que
`pnpm veille:search` : jamais une URL écrite librement par le modèle
(peut en inventer une même avec la recherche activée) — uniquement les
sources réellement trouvées par le grounding, résolues vers leur URL
finale.

**Déploiement** : `GEMINI_API_KEY` est déjà un secret du projet (partagé
par toutes les fonctions, rien à reposer) —

```bash
pnpm dlx supabase functions deploy admin-veille-chat
```

## Fichiers

- Table : `supabase/veille_rss.sql`
- Fonction fetch RSS : `supabase/functions/admin-veille/index.ts`
- Fonction filtrage IA : `supabase/functions/admin-veille-filter/index.ts`
- Fonction chat IA (stateless, pas de table) :
  `supabase/functions/admin-veille-chat/index.ts`
- Critères éditoriaux (édités en direct, relus sans redeploy) :
  `.claude/agents/veille-filter.md`
- Admin UI : `apps/app/src/Admin.tsx` (vues "Veille RSS" et "Chat veille
  (IA)", cartes dans le menu)
- Script local : `scripts/veille-list.mjs` (`pnpm veille:list`),
  `scripts/veille-search.mjs` (`pnpm veille:search`)
