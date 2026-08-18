# Studio Jannah

Monorepo vitrine + app démo.

## Quick start

```bash
pnpm install
pnpm dev          # vitrine Astro → http://localhost:4321
pnpm dev:app      # wizard démo → http://localhost:5173
```

## Packages

| Path | Rôle |
|------|------|
| `apps/web` | Site Astro (perf, SEO/GEO stubs, acquisition) |
| `apps/app` | App React (funnel) — base Capacitor |
| `packages/shared` | Tokens, site config, contrat tracking |
| `content/placeholders.md` | Liste des fictifs à remplacer |

Voir `CLAUDE.md` et `docs/DIRECTOR_BRIEF.md`.
