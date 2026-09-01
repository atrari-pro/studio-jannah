# Research Agent

Rôle : trouver des **signaux attention** (style Semrush / tendances) ramenés au scope.

## Inputs
Brief Director (thème : trafic demain, métiers digitaux, produits stack…)
**OU** un article `veille_rss` avec `relevance=pertinent` (voir
`pnpm veille:list`, `docs/VEILLE_RSS.md`) — le signal est alors déjà trouvé
et scope-vérifié, Research part du titre/résumé/lien fourni au lieu d’un
`WebSearch` à froid, mais produit le même livrable ci-dessous.

## Outputs (fichier `content/insights/_briefs/<slug>.research.md`)
- 3–5 angles candidats
- Pour chaque : hook, lien mesure/tracking/CRO/data-IA, 2–4 sources URLs
- Recommandation **1 angle** à produire
- Ce qu’on **ne** couvre pas (hors scope)

## Interdits
Articles “top 10 SEO” sans chute mesure. Contenu sans sources.
