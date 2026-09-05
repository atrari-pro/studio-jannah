# Deploy — GitHub Pages + Supabase contact

## Objectif

- Site : `https://atrari-pro.github.io/studio-jannah/`
- Contact : insert dans table Supabase `leads` (clé anon + RLS)

## 1. Supabase (une fois)

1. Compte + projet EU sur [supabase.com](https://supabase.com)
2. SQL Editor → coller / Run : `supabase/leads.sql`
3. Settings → API → copier :
   - Project URL → `PUBLIC_SUPABASE_URL` (= `https://<ref>.supabase.co`)
   - anon / publishable key → `PUBLIC_SUPABASE_ANON_KEY`
4. Local : mêmes valeurs dans `apps/web/.env` (déjà gitignoré)

Vérif Table Editor : après un envoi test, une ligne `leads` apparaît.

## 2. Repo GitHub

Repo public : `atrari-pro/studio-jannah`

Settings → Pages → Source = **GitHub Actions**

Secrets (Settings → Secrets and variables → Actions) :

| Secret | Valeur |
|--------|--------|
| `PUBLIC_SUPABASE_URL` | URL API projet |
| `PUBLIC_SUPABASE_ANON_KEY` | clé anon |
| `PUBLIC_GTM_ID` | `GTM-KB54PFTP` (ou vide) |

## 3. Flux local → live

```bash
# modifs locales
pnpm dev

git add -A
git commit -m "feat: …"
git push origin main
```

L’Action `Deploy GitHub Pages` build et publie. Attendre ~2–3 min.

## 4. Indexation

1. Ouvrir l’URL Pages
2. [Google Search Console](https://search.google.com/search-console) → propriété URL prefix (déjà vérifiée, fichier `apps/web/public/google96f6e11ae26196ae.html`)
3. Sitemap : `https://atrari-pro.github.io/studio-jannah/sitemap.xml`
4. Pour un article précis à indexer vite : Search Console → Inspection de l'URL → coller l'URL → "Demander une indexation"
5. [Bing Webmaster Tools](https://www.bing.com/webmasters) — alimente aussi ChatGPT Search/Copilot via l'index Bing, peu de sites le font
6. **IndexNow automatique** : le workflow `deploy-pages.yml` pousse tout le sitemap à IndexNow (Bing/Yandex) après chaque déploiement — clé dans `apps/web/public/<clé>.txt`, aucune action manuelle requise
7. **Structured data (JSON-LD)** : chaque article de blog embarque un schéma `BlogPosting` (titre, dates, auteur, sources) — aide Google ET les moteurs IA à citer avec la bonne attribution

## Notes

- Pages = statique : pas d’API Node sur `.github.io` ; le “back” = Supabase
- `base` Astro = `/studio-jannah` en CI (liens via `withBase`)
- Ne jamais committer `service_role` ni `.env`
