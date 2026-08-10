# Studio Jannah — Orchestre agents

Coordination obligatoire : **Director** valide le brief → agents spécialisés en séquence → **QA** avant merge/publish.

## Pipelines

### A — **Jannah Mag** (magazine type Semrush)
Ton mag d’articles attention (trafic demain, métiers digitaux, produits) — **toujours** chute mesure/tracking/CRO/data-IA.
1. **Research** — signaux Semrush-like filtrés au scope
2. **GEO/SEO** — structure magazine + sources + angle mesure
3. **Publish** — `content/insights/` → routes `/mag/*`
4. **QA** — ton éditorial mag, pas fiche blog maigre

URL publique : **`/mag`** (pas “insights” en façade).

### B — Use cases (cas complexes tracking)
1. **UseCase Author** — récit problème (ex. paiement hors domaine) → trou de mesure → leviers (iframe, S2S, réconciliation)
2. **Measurement** — plan events / virtual pages sur la page cas ; pas de fausse infra hors domaine en v1
3. **Publish** — collection `use-cases`, schéma, CTA
4. **QA** — clarté démo vs réel, RGPD si tracking illustré

## Règles communes
- Max **5 insights** publiés “chauds” ; qualité > volume
- Use cases : **narratif + schéma** d’abord ; simul iframe hors domaine = Innovation P3
- Chaque pièce : `status: draft | review | published`
- Sources obligatoires sur Insights ; marques fictives OK si marquées placeholder

## Fichiers
| Rôle | Brief |
|------|--------|
| Director | `docs/agents/director.md` |
| Research | `docs/agents/research.md` |
| GEO/SEO | `docs/agents/geo-seo.md` |
| UseCase Author | `docs/agents/usecase-author.md` |
| Publish | `docs/agents/publish.md` |
| Measurement | `docs/agents/measurement.md` |
| QA | `docs/agents/qa.md` |

Contenu : `apps/web/content/insights/` (Le Mag → `/mag`), `apps/web/content/use-cases/`  
Règle Cursor : `.cursor/rules/content-orchestra.mdc`
