# Studio Jannah — Orchestre agents

Coordination obligatoire : **Director** valide le brief → agents spécialisés en séquence → **QA** avant merge/publish.

## Pipelines

### A — **Blog** (magazine type Semrush)
Ton blog d’articles attention (trafic demain, métiers digitaux, produits) — **toujours** chute mesure/tracking/CRO/data-IA.
1. **Research** — signaux Semrush-like filtrés au scope
2. **GEO/SEO** — structure magazine + sources + angle mesure
3. **Publish** — `content/insights/` → routes `/blog/*`
4. **QA** — ton éditorial riche façon magazine, pas fiche succincte

URL publique : **`/blog`** (pas “insights” en façade).

### B — Use cases (cas complexes tracking)
1. **UseCase Author** — récit problème (ex. paiement hors domaine) → trou de mesure → leviers (iframe, S2S, réconciliation)
2. **Measurement** — plan events / virtual pages sur la page cas ; pas de fausse infra hors domaine en v1
3. **Publish** — collection `use-cases`, schéma, CTA
4. **QA** — clarté démo vs réel, RGPD si tracking illustré

### C — Expertises (bibliothèque pilier/cluster)
Bibliothèque de référence exhaustive, distincte du Blog magazine (objectif SEO longue traîne + preuve d'expertise, pas actu). Taxonomie complète (4 domaines : Tracking, Data, Marketing/Ads, IA — ~78 nœuds) : `docs/CONTENT_EXPERTISE_TAXONOMY.md`.
1. **Director** — pioche le(s) prochain(s) nœud(s) `todo` dans la taxonomie, jamais plus d'un **batch de 3-5** sans passage QA
2. **Expertise Author** — reçoit un nœud complet (domaine/catégorie/sous-catégorie/type) → rédige un guide de référence fini (pas un angle court)
3. **GEO/SEO** — adapte structure citation-ready au format long (guide/audit/méthodologie)
4. **Measurement** — uniquement si le nœud touche tracking/data ; valide la cohérence avec `docs/TRACKING_DATALAYER.md`
5. **Publish** — collection `expertises`, breadcrumbs JSON-LD, maillage `relatedExpertises`/`relatedInsights`/`relatedUseCases`
6. **QA** — pas de doublon avec un insight existant, sources, distinction méthodologie générique vs exemple fictif

URL publique : **`/expertises/<domaine>/<catégorie>/<slug>`** (silo 3 niveaux, pages pilier domaine/catégorie générées depuis la taxonomie).

## Règles communes
- Max **5 insights** publiés “chauds” ; qualité > volume
- Use cases : **narratif + schéma** d’abord ; simul iframe hors domaine = Innovation P3
- Expertises : jamais de génération en masse — batch 3-5 nœuds, QA avant le batch suivant
- Chaque pièce : `status: draft | review | published`
- Sources obligatoires sur Insights et Expertises ; marques fictives OK si marquées placeholder

## Fichiers
| Rôle | Brief (source unique) |
|------|--------|
| Director | `.claude/agents/director.md` |
| Research | `.claude/agents/research.md` |
| GEO/SEO | `.claude/agents/geo-seo.md` |
| UseCase Author | `.claude/agents/usecase-author.md` |
| Expertise Author | `.claude/agents/expertise-author.md` |
| Publish | `.claude/agents/publish.md` |
| Measurement | `.claude/agents/measurement.md` |
| QA | `.claude/agents/qa.md` |

Ex-`docs/agents/*.md` supprimé (doublon désynchronisé du fichier ci-dessus — voir git history).

Contenu : `apps/web/content/insights/` (Blog → `/blog`), `apps/web/content/use-cases/`, `apps/web/content/expertises/` (Expertises → `/expertises`, taxonomie : `docs/CONTENT_EXPERTISE_TAXONOMY.md`)
Règle Cursor : `.cursor/rules/content-orchestra.mdc`
