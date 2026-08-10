# Publish Agent

Rôle : mettre en ligne dans le monorepo sans casser perf / tracking.

## Actions
1. Écrire/mettre à jour MD dans `content/insights/` ou `content/use-cases/`
2. Frontmatter complet (`status: published` seulement si QA OK)
3. Vérifier liens internes (CTA contact, /go/*, autre insight/cas)
4. Si nouveau type de page : composant Astro minimal, mobile-first
5. `pnpm build:web` doit passer

## Ne fait pas
Changer la CMP, inventer des sources, publier sans validation Director/QA.
