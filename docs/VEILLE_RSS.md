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
     pnpm veille:list (en local, service_role) ──→ toi
                    │
     tri + résumé manuel, puis pipeline éditorial (AGENTS.md :
     Research → GEO/SEO → Publish → QA)
                    │
     content/insights/*.md (status draft → review → published)
```

`veille_rss` n'est qu'un tampon : les articles y arrivent bruts après fetch,
et n'entrent dans le vrai contenu du site qu'après être passés par le
pipeline éditorial existant — rien n'est publié automatiquement.

## Déploiement initial

### 1. Table

Dashboard Supabase → **SQL Editor** → coller `supabase/veille_rss.sql` → Run.

### 2. Edge Function

```bash
pnpm dlx supabase login          # une fois, ouvre le navigateur
pnpm dlx supabase link --project-ref eileoaxbxiimmrcakhcy
pnpm dlx supabase functions deploy admin-veille
```

(`SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont déjà injectées
automatiquement par Supabase dans la fonction, rien à poser en secret.)

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
2. En local : `pnpm veille:list` → affiche titre / lien / résumé de tous les
   articles `status = nouveau`.
3. Demander à Claude Code de lire cette liste, résumer et lancer le pipeline
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
```

Sans token → `401`. Un flux invalide/inaccessible → `502` avec un message
d'erreur. Relancer le même fetch deux fois de suite doit donner
`inserted: 0` la deuxième fois (dédup sur `link`).

## Fichiers

- Table : `supabase/veille_rss.sql`
- Fonction : `supabase/functions/admin-veille/index.ts`
- Admin UI : `apps/app/src/Admin.tsx` (vue "Veille RSS", carte dans le menu)
- Script local : `scripts/veille-list.mjs` (`pnpm veille:list`)
