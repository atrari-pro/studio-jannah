# Scan marché — "Agent Analytics" / "Agent CRO" (08/09/2026)

Contexte : avant tout envoi M3 (contact chaud), challenge des deux idées produit issues d'une projection de session et recherche marché réelle (WebSearch/WebFetch, sources citées). Aucune action externe prise ici — recherche et décision seulement.

## 1. Reformulation challengée

Les deux idées telles que posées :

1. **"Agent Analytics"** — lire les logs serveur/CDN que le prospect possède déjà pour révéler le trafic crawler IA (GPTBot, ClaudeBot, PerplexityBot...) invisible à GA4.
2. **"Agent CRO"** — transformer `agent-readiness-check.mjs` en scoring priorisé façon audit CRO ("corrigez X en premier, impact estimé Y").

**Verdict : ce ne sont pas deux produits, c'est une seule offre à deux sources de données.** Un diagnostic "readiness agent IA" complet a naturellement deux entrées :
- **externe** (ce qu'un fetch HTTP simple observe sans accès particulier — c'est déjà `agent-readiness-check.mjs`) ;
- **interne** (ce que les logs serveur confirment — volume réel, fréquence, pages touchées — que le diagnostic externe ne peut qu'inférer).

Les combiner dans **un seul rapport priorisé** (le squelette CRO de l'idée 2, nourri par les deux sources) est plus fort que les vendre séparément. C'est d'ailleurs très exactement le modèle qu'un concurrent direct (Crawlers.fr, voir §3) vend déjà.

**Angle non vu initialement, trouvé pendant la recherche** : la vraie question n'est pas "quel produit construire" mais "à quel niveau de la chaîne se positionner". Deux couches se sont gratuitement commoditisées entre juillet et septembre 2026 (voir §3) : Cloudflare donne le diagnostic "logs" gratuitement à tout site derrière son CDN, et Google donne le diagnostic "externe" gratuitement dans Chrome DevTools. Un outil solo ne peut plus vendre ces deux couches brutes comme produit — il ne reste de valeur que dans l'**interprétation humaine personnalisée et la correction effective**, pas dans la mesure elle-même.

## 2. Méthode

Recherche web (WebSearch + WebFetch direct sur les pages produit/pricing quand possible) le 08/09/2026. Chaque ligne du tableau §3 est sourcée ; les chiffres non vérifiés par lecture directe d'une source primaire sont marqués **estimé/secondaire**. Aucun chiffre de marché global n'est fiable (voir note en bas) — non utilisé pour la décision.

## 3. Comparatif — acteurs trouvés

| Acteur | Catégorie | Couverture | Taille / financement | Prix public |
|---|---|---|---|---|
| **Profound** | GEO enterprise (leader) | Externe uniquement — prompt tracking, visibilité marque dans ChatGPT/Perplexity/AI Overviews. Pas de logs serveur. | $154,5M levés au total, valorisation ~$1Md (Série C $96M, fév. 2026, Lightspeed), ~165 employés, 700+ clients dont Target, Walmart. [Source primaire disponible via presse spécialisée, chiffres de financement recoupés sur 3 sources indépendantes.] | Starter $99/mo (ChatGPT seul), Growth $399/mo (+ Perplexity, AI Overviews, 100 prompts) — [g2.com/products/profound/pricing] |
| **Scrunch AI** | GEO monitoring | Externe uniquement | ~$19-26M levés (seed + Série A $15M, Decibel/Mayfield), **racheté par Sitecore en juin 2026** — plus un acteur indépendant. | Dès $250-300/mo — [scrunch.com/pricing] |
| **Otterly.ai** | AI search monitoring | Externe. Feature nommée "Agent Analytics" sur les plans hauts (nom identique à l'idée challengée ici — déjà pris sur le marché). | Signaux de financement non trouvés (probable bootstrap/petite structure). | $29 à $489/mo — [otterly.ai/pricing] |
| **Ahrefs Brand Radar** | Add-on GEO d'une suite SEO établie | Externe — prompt tracking, extension TikTok/YouTube. | Ahrefs = société établie, rentable, pas de levée récente connue pour ce module. | Ajouté à un plan de base $129/mo : +$199/mo par index IA ou $699/mo bundle 6 plateformes — [ahrefs.com] |
| **Semrush AI Visibility Toolkit** | Add-on GEO d'une suite SEO cotée (NYSE: SEMR) | Externe + "AI Search Site Audit" qui signale les blocages crawler (bascule vers le CRO). | Société cotée, chiffres publics par ailleurs, non recherchés ici. | $99/mo/domaine, 25 prompts — [trakkr.ai, recoupé] |
| **HubSpot AI Search Grader** | Diagnostic gratuit ponctuel | Externe, niveau marque (pas technique/JSON-LD) | HubSpot = société cotée, outil = aimant à leads CRM. | Gratuit — [hubspot.com/ai-search-grader] |
| **Goodie AI** | GEO monitoring + optimisation | Externe | **Non financé** selon Tracxn — petite structure, NYC, fondée 2022. | Non publié clairement. |
| **Peec AI / Rankscale / AthenaHQ** | GEO monitoring (essaim de challengers) | Externe | Financement non recherché en détail — présence marché confirmée par revues croisées multiples. | Rankscale $20/mo, Peec $89-499/mo, AthenaHQ $295-499/mo — [sources croisées, non primaires pour tous] |
| **Qwairy** (Bordeaux, FR) | GEO monitoring, hébergement UE | Externe + suivi crawlers IA | Startup française, "2000+ marques dont TotalEnergies" — **affirmation du site, non vérifiée par une source tierce indépendante, à traiter comme revendication marketing.** | Starter 79€/mo — [source secondaire] |
| **Crawlers.fr** (FR) | **Full-stack SEO+GEO — combine exactement les deux idées challengées** | Externe (200+ critères) **+ logs serveur** (Google et bots IA : GPTBot, ClaudeBot, PerplexityBot) **+ scoring priorisé avec code correctif et prédiction ROI à T+30/60/90** | Structure non identifiée précisément (pas de levée trouvée), se présente comme "1ère plateforme française SEO+GEO full-stack". | Audit gratuit 40 pages sans CB, puis 29€/mo (5 000 pages) à 79€/mo+ (50 000 pages) — [crawlers.fr, lu directement] |
| **Cloudflare AI Crawl Control** (ex-AI Audit) | Infra CDN native | **Logs CDN natifs** — dashboard crawler IA, règles allow/block, pay-per-crawl (beta) | Cloudflare = infrastructure mondiale, gratuit sur tous les tiers y compris gratuit. | **Gratuit** sur tous les plans — [developers.cloudflare.com/ai-crawl-control, lu directement] |
| **Google Chrome Lighthouse — "Agentic Browsing"** (mai 2026) | Diagnostic externe natif navigateur | Accessibility tree, support WebMCP, llms.txt, stabilité de layout — pass/fail, intégré à chaque install Chrome DevTools | Google — distribution = tous les développeurs du monde. | **Gratuit, intégré**, aucune inscription — [developer.chrome.com/docs/lighthouse/agentic-browsing/scoring, lu directement] |
| **Vercel BotID** | Sécurité/blocage bot (catégorie adjacente, pas identique) | Détection/blocage, pas analytics de visibilité | Vercel, powered by Kasada. | Gratuit (Basic) / payant (Deep Analysis, plans Pro+). Mentionné pour mémoire — objectif différent (bloquer, pas mesurer/scorer). |
| **TollBit** | Log analytics IA + monétisation éditeurs (pay-per-use) | Logs serveur, distinction humain/bot/agent, intégré à Akamai/Fastly/Imperva/DataDome | Partenariats infra confirmés par sources primaires (blogs Akamai/Fastly/Imperva/DataDome), montant de financement non recherché. | Sur devis selon volume — cible éditeurs de contenu, pas e-commerce. |
| **Botify (+ JetOctopus)** | Log-file SEO enterprise, étendu aux bots IA 2024-2025 | Externe + logs serveur, 40+ types de bots reconnus, anti-spoofing par IP | Acteurs historiques établis (OnCrawl absorbé par Botify en 2022). | Enterprise, prix non public — barrière d'entrée haute, hors du segment SMB. |
| **ClayHog** | SaaS logs crawlers IA, petite structure | Logs (via log drain Vercel/Netlify/Cloudflare) + tracking prompts | Produit live confirmé (app.clayhog.com, changelog actif mai 2026) mais taille d'équipe non trouvée. | Classic 29€/mo, Pro 129€/mo, Business 299€/mo — [clayhog.com/pricing, lu directement] |
| **CiteFlow.io** | GEO + logs, distinction crawler "training" vs "agent" temps réel | Logs + externe, outils de scan gratuits (GEO/AEO/LLMs Scan) | Non identifié. | Non publié sur la page consultée. |
| **AI Commerce Audit** (aicommerceaudit.com) | **Diagnostic externe + scoring CRO priorisé — correspond très précisément à l'idée 2** | Externe uniquement (fetch live HTML/JSON-LD, pas de logs) — 82 checks, 5 surfaces IA, liste de correctifs classée par sévérité avec lien direct vers l'admin Shopify/WP/BigCommerce | Éditeur non identifié sur la page. | **Gratuit** pour l'audit et le score de base ; payant pour monitoring continu + marque blanche — [aicommerceaudit.com, lu directement] |

**Note sur les chiffres de marché global** ("GEO market size 2026") : recherchés, trouvés très incohérents entre cabinets (de $698M à $2,70Md pour la même année 2026 selon la source). Aucune source primaire fiable identifiée — **ces chiffres ne sont pas utilisés pour la décision ci-dessous**, cités seulement pour signaler qu'ils existent et qu'ils ne se recoupent pas.

## 4. Bilan par sous-créneau

- **AI visibility / prompt tracking / part de voix dans les réponses IA** — dominé par Profound (valorisation ~$1Md), avec un essaim de challengers financés ($15-26M chacun pour Scrunch, etc.) et l'appui de suites SEO établies (Ahrefs, Semrush). **Saturé, capital-intensif, hors de portée d'un opérateur solo comme produit à vendre.**
- **Logs serveur pour bots IA** — servi à l'échelle enterprise par Botify/JetOctopus (héritage SEO log-analysis), et surtout **rendu gratuit nativement par Cloudflare** pour toute la portion du web derrière son CDN (part très large). Le segment SMB/SaaS payant existe (ClayHog 29-299€/mo, CiteFlow, TollBit côté éditeurs) mais la proposition de valeur "on lit vos logs pour vous montrer le trafic IA" perd sa force dès que le prospect est sur Cloudflare — il a déjà le dashboard.
- **Scoring priorisé façon CRO / fix-list agent-readiness** — **rendu gratuit nativement par Google** (Lighthouse "Agentic Browsing", intégré à Chrome DevTools depuis mai 2026) et déjà offert gratuitement en self-serve par aicommerceaudit.com (82 checks, liste de correctifs classée, lien direct vers l'admin). C'est le sous-créneau le plus exposé à la commoditisation gratuite.
- **Combo externe + logs + scoring priorisé, marché francophone** — occupé précisément par **Crawlers.fr** (29-79€/mo, essai gratuit) : diagnostic technique 200+ critères, logs Google + bots IA, plan d'action hiérarchisé avec prédiction de ROI. C'est l'offre la plus proche de ce que "Agent Analytics" + "Agent CRO" combinés proposeraient — déjà vivante, déjà en français, à un prix qu'un opérateur solo ne peut pas rentablement sous-coter en mode SaaS auto-service.
- **Espace resté vide (sous réserve — pas de garantie)** : aucun des acteurs listés ne vend un **diagnostic + correction livrés par une personne, en forfait fixe, à un prospect déjà en confiance** (canal Malt/LinkedIn existant). Tous vendent un outil/dashboard en libre-service que le client doit lui-même interpréter et exploiter. C'est exactement le format déjà écrit aux paliers M3-M4 du roadmap actif — pas un nouveau produit à construire.

## 5. Recommandation finale

**Pivot, pas arrêt total.** Abandon de toute ambition de construire/positionner "Agent Analytics" ou "Agent CRO" comme **produit ou outil SaaS autonome** : le marché est déjà occupé par des acteurs eux-mêmes très financés (jusqu'à ~$1Md de valorisation pour Profound), et les deux couches de mesure brute (logs → Cloudflare, diagnostic externe → Google Chrome Lighthouse) viennent d'être rendues **gratuites nativement** par des plateformes que la cible utilise déjà — construire un produit dessus reviendrait à réinventer, en solo, ce que deux entreprises à l'échelle planétaire distribuent gratuitement, et à sous-coter un concurrent français déjà installé (Crawlers.fr) sur son propre modèle. C'est exactement le type de dépendance à un quota/accès gratuit qui peut sauter, et de modèle qui suppose une échelle déjà acquise, que ce rôle doit refuser.

Ce qui reste solide et **n'a pas besoin d'être remis en question** : le plan déjà écrit aux paliers M3-M5 du `docs/GROWTH_ROADMAP.md` — utiliser `scripts/agent-readiness-check.mjs` (déjà construit, déjà testé) comme accélérateur interne pour produire un diagnostic personnalisé, complété au cas par cas par une lecture manuelle de logs si un prospect chaud les partage, et vendu comme **service humain en forfait fixe** via le canal Malt/LinkedIn déjà actif — pas comme un outil en libre-service. Aucun concurrent listé ne vend ce format-là à ce niveau de segment.

**Décision consignée dans le roadmap** : continuer M3-M5 tels qu'écrits, sans changement de contenu. Nouveau palier ajouté : "Idées produit SaaS 'Agent Analytics'/'Agent CRO' évaluées et écartées" (fil clos, avec preuve = ce document).
