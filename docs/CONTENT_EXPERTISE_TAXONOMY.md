# Bibliothèque d'expertise Studio Jannah — Taxonomie & plan

## 1. Pourquoi une pièce séparée du blog

Le `/blog` actuel (pipeline A dans `AGENTS.md`) est un **magazine d'attention** : signaux récents, angle éditorial, max 5 pièces "chaudes", quantité volontairement limitée. Ce qu'on construit ici est l'inverse dans l'intention : une **bibliothèque de référence** exhaustive, organisée en silo (domaine → catégorie → sous-catégorie), pensée pour :

- **SEO longue traîne** : chaque sous-catégorie = une requête précise ("audit datalayer", "plan de marquage GA4"...) qu'aucun article magazine ne cible frontalement.
- **GEO (citation par les moteurs IA)** : contenu factuel, daté, sourcé, structuré en sections courtes citables — s'appuie sur le JSON-LD `BlogPosting` déjà en place (commit `ee17b8f`).
- **Preuve d'expertise Malt/LinkedIn** : un prospect qui cherche "audit GTM" doit tomber sur une page Studio Jannah qui démontre la maîtrise, pas une actu.

Les deux coexistent et se lient entre eux (un insight magazine peut renvoyer vers la page pilier correspondante, et inversement).

## 2. Architecture proposée

### 2.1 Nouvelle collection Astro : `expertises`

Distincte de `insights` (blog) et `useCases`. Fichiers dans `apps/web/content/expertises/<domaine>/<slug>.md`.

```ts
const expertises = defineCollection({
  loader: glob({ pattern: "**/*.md", base: new URL("../content/expertises", import.meta.url) }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    status: z.enum(["draft", "review", "published"]),
    domain: z.enum(["tracking", "data", "marketing", "ia"]),
    category: z.string(),        // slug, ex: "datalayer"
    categoryLabel: z.string(),   // ex: "DataLayer"
    type: z.enum(["guide", "audit", "checklist", "glossaire", "comparatif", "methodologie"]),
    level: z.enum(["fondamentaux", "avance", "expert"]),
    tags: z.array(z.string()).default([]),
    hook: z.string(),
    sources: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    relatedInsights: z.array(z.string()).default([]),   // slugs content/insights
    relatedUseCases: z.array(z.string()).default([]),   // slugs content/use-cases
    relatedExpertises: z.array(z.string()).default([]), // slugs content/expertises (maillage silo)
    featured: z.boolean().default(false),
  }),
});
```

### 2.2 URLs (silo à 3 niveaux, breadcrumb JSON-LD à chaque niveau)

```
/expertises                                  → hub, 4 cartes domaines
/expertises/tracking                         → page pilier domaine (liste des catégories)
/expertises/tracking/datalayer               → page pilier catégorie (liste des articles)
/expertises/tracking/datalayer/audit-datalayer → article
```

Chaque niveau reprend le pattern `withBase()` déjà en place. Les pages pilier (domaine, catégorie) sont générées depuis la taxonomie (section 4), pas rédigées à la main — elles listent leurs enfants + un chapô court.

### 2.3 Maillage & structured data

- `BreadcrumbList` JSON-LD sur chaque article (domaine > catégorie > article), en plus du `BlogPosting` existant.
- Chaque article lie `relatedExpertises` (2-4 sous-catégories voisines de la même catégorie) → maillage silo dense.
- `relatedInsights` / `relatedUseCases` pour connecter à l'écosystème existant sans dupliquer le contenu (ex. l'article "Server-side tagging : architecture client/serveur" renvoie vers l'insight déjà publié `gtm-dispatch-selectif-client-server.md` au lieu de le réécrire).

## 3. Pipeline d'automatisation (Pipeline C, à ajouter dans `AGENTS.md`)

Nouvel agent **Expertise Author** (brief à créer : `.claude/agents/expertise-author.md`) — contrairement à Research/GEO-SEO (angle court), il reçoit un nœud de taxonomie complet (domaine + catégorie + sous-catégorie + type + attendus, section 4) et rédige un draft complet niveau guide de référence.

1. **Director** — pioche le prochain nœud `todo` dans le backlog (section 5), respecte l'ordre de rollout (section 6)
2. **Expertise Author** — rédige le draft (structure guide/audit/checklist selon `type`), pose les `sources`
3. **GEO/SEO** — adapte structure citation-ready (le brief existant est calibré magazine ; à étendre pour les formats longs `guide`/`audit`)
4. **Measurement** — uniquement si le nœud touche tracking/data ; valide qu'aucun schéma d'event inventé ne contredit `docs/TRACKING_DATALAYER.md`
5. **Publish** — nouvelle collection, breadcrumbs, maillage `relatedExpertises`
6. **QA** — cohérence taxonomie (pas de doublon avec un insight existant), sources, distinction méthodologie générique vs exemple chiffré fictif

Règle : **jamais plus d'un batch (3-5 nœuds) sans passage QA** avant le suivant — évite le thin content en masse.

## 4. Taxonomie complète (vue large, 4 domaines)

Légende type : `G`=guide, `A`=audit/checklist, `M`=méthodologie, `C`=comparatif, `Gl`=glossaire

### 4.1 Tracking — mesure & fiabilité de la donnée comportementale

| Catégorie | Sous-catégories (article) | Type |
|---|---|---|
| **DataLayer** | Audit DataLayer | A |
| | Plan de marquage (méthodologie + template) | M |
| | Conventions de nommage (events, paramètres) | G |
| | DataLayer e-commerce (schéma GA4 `items[]`) | G |
| | DataLayer SPA / apps JS (timing, race conditions) | G |
| | Debug DataLayer (DevTools, `dataLayer.push` logs) | G |
| | Documentation vivante du DataLayer (versioning) | M |
| | Migration DataLayer (refonte site, v1→v2) | G |
| **GTM** | Audit GTM (structure conteneur, triggers, variables) | A |
| | Architecture de conteneur (naming, dossiers, environnements) | M |
| | QA de tags (preview mode, ordre de déclenchement) | A |
| | Migration UA→GA4 dans GTM | G |
| | GTM avancé (templates custom, variables JS) | G |
| | Gouvernance GTM (accès, versioning, workspace) | M |
| **Server-side (sGTM)** | Audit sGTM (setup, résilience, coût) | A |
| | Architecture dispatch client/serveur *(lien insight publié)* | G |
| | Identité & cookies (`FPID` vs `_ga`, Client GA4) | G |
| | Monitoring & coûts (Cloud Run, requêtes, alerting) | G |
| | Sécurité & conformité (proxying, PII stripping) | G |
| **Consentement & CMP** | Audit CMP (mapping Consent Mode v2) | A |
| | Consent Mode basique vs avancé | C |
| | Impact consentement sur le volume de donnée (modélisation Google) | G |
| | QA consentement (blocage tags pré-consentement) | A |
| **GA4 & mesure produit** | Audit GA4 (config, exclusions, filtres) | A |
| | Ecommerce GA4 (enhanced ecommerce, `items` schema) | G |
| | Custom dimensions & metrics (scope, limites) | G |
| | BigQuery export GA4 (raw data, schéma de tables) | G |
| **Attribution & identité** | User-ID strategy | G |
| | Cross-domain tracking (linker param) | G |
| | Réconciliation identité *(lien pipeline use-cases)* | G |
| | Attribution multi-touch (data-driven vs last-click) | C |
| **QA & fiabilité** (transverse) | Méthodologie de QA tracking (pré-prod → prod) | M |
| | Détection de régressions (monitoring automatisé) | G |
| | Checklist de recette avant mise en prod | A |
| | Outils d'audit (Tag Assistant, GA Debugger...) | G |
| **Gouvernance & doc** | Plan de marquage comme living doc | M |
| | Onboarding équipe (lire un plan de marquage) | G |
| | RACI tracking (qui valide quoi) | G |
| | Glossaire tracking | Gl |

### 4.2 Data — modélisation, reporting, gouvernance

| Catégorie | Sous-catégories | Type |
|---|---|---|
| **Modélisation & Warehouse** | BigQuery pour marketeurs (concepts clés) | G |
| | Modélisation en étoile (facts/dims) appliquée marketing | G |
| | Data quality (tests, anomalies, monitoring) | M |
| **Reporting & dashboards** | Looker Studio, bonnes pratiques | G |
| | KPIs qui comptent vs vanity metrics | G |
| | Dashboards self-service vs pilotés | C |
| **Intégration & pipelines** | ETL / Reverse ETL pour marketing | G |
| | CDP : quand et pourquoi | G |
| | Réconciliation multi-source (Ads + CRM + web) | M |
| **Gouvernance data** | RGPD & data marketing (base légale, conservation) | G |
| | Data contracts entre équipes | G |
| | Glossaire data | Gl |

### 4.3 Marketing / Ads — acquisition & CRO piloté data

| Catégorie | Sous-catégories | Type |
|---|---|---|
| **Google Ads** | Enhanced Conversions (setup, impact) | G |
| | Offline Conversion Import | G |
| | AI Max & automatisation *(lien insight publié)* | G |
| | Smart Bidding & qualité de donnée | G |
| **Meta Ads** | Conversions API (CAPI), setup | G |
| | Attribution Meta vs GA4 (écarts) | G |
| | Event Match Quality, audit | A |
| **CRO & expérimentation** | Méthodologie de test A/B | M |
| | Statistique appliquée au CRO (significativité) | G |
| | CRO piloté par la donnée (funnel analysis) | G |
| **Attribution & pilotage média** | MTA vs Marketing Mix Modeling | C |
| | Budget allocation piloté data | G |
| | MMM accessible pour PME | G |

### 4.4 IA — appliquée au marketing, à la mesure, à l'édition

| Catégorie | Sous-catégories | Type |
|---|---|---|
| **IA générative appliquée marketing** | Cadre éditorial & transparence IA *(lien commit indexation)* | M |
| | Prompt engineering pour marketeurs | G |
| | Cas d'usage (copywriting, personas, analyse data) | G |
| **Agents & automatisation** | Pipeline éditorial automatisé (Studio Jannah en cas d'usage, méta) | G |
| | Architecture multi-agent (spécialisation par étape) | G |
| | Automatisation du reporting | G |
| **GEO/AEO (indexation IA)** | JSON-LD & structured data *(lien commit indexation)* | G |
| | Écrire "citation-ready" pour ChatGPT/Perplexity | M |
| | IndexNow & découvrabilité | G |
| **Gouvernance IA** | Transparence IA (disclosure, supervision éditoriale) | G |
| | Biais & limites de l'IA en marketing | G |
| | RGPD & IA (données personnelles, traitement) | G |

**Total : 4 domaines, 22 catégories, ~78 articles.**

## 5. Backlog & suivi

Chaque ligne du tableau ci-dessus = un nœud avec statut `todo` par défaut. Le Director consomme ce fichier comme backlog (case à cocher au fil de la génération) plutôt qu'un fichier séparé — une seule source de vérité. Ajouter au fil de l'eau une colonne statut si besoin de tracking fin (`todo`/`draft`/`review`/`published`).

## 6. Plan de rollout recommandé

1. **Batch pilote (3-5 nœuds), domaine Tracking > DataLayer** — catégorie la plus mature (déjà des insights connexes, outil interne `apps/tracking-score`), valide le moule Expertise Author + GEO/SEO + QA de bout en bout.
2. **Ajustement du moule** si le QA remonte des problèmes de structure/longueur/ton.
3. **Reste de Tracking** (GTM, sGTM, Consentement, GA4, Attribution, QA, Gouvernance) par batches de 3-5.
4. **Data, Marketing/Ads, IA** dans cet ordre, même cadence.
5. Jamais de génération "tout d'un coup" — le goulot volontaire est le QA, pas la rédaction.

## 7. État

- [x] 4 domaines validés (Tracking, Data, Marketing/Ads, IA)
- [x] Architecture `/expertises` scaffoldée, séparée du `/blog` :
  - Collection `expertises` : `apps/web/src/content.config.ts`
  - Domaines/catégories (source pour pages pilier) : `packages/shared/src/site.ts` (`expertiseDomains`, `expertiseCategories`)
  - Routes : `apps/web/src/pages/expertises/{index,[domain]/index,[domain]/[category]/index,[domain]/[category]/[slug]}.astro`
  - Carte article : `apps/web/src/components/ExpertiseCard.astro`
  - Nav header + sitemap.xml mis à jour
  - Brief agent : `.claude/agents/expertise-author.md` ; pipeline documenté dans `AGENTS.md` (Pipeline C)
  - Build vérifié (`pnpm --filter @studio-jannah/web build`) — 71 pages, silo domaine/catégorie OK
  - Un placeholder `status: draft` (`content/expertises/tracking/datalayer/audit-datalayer.md`) garde la collection non-vide ; à remplacer par le vrai premier article du batch pilote
- [ ] Go pour lancer le batch pilote (section 6, étape 1) — 3-5 nœuds Tracking > DataLayer via Director → Expertise Author → GEO/SEO → Publish → QA
