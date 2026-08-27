# Changelog — Studio Jannah Tracking Score

## [0.3.0] - 2026-08-27

### 🎯 MAJEUR : Audit professionnel complet

**Grille de scoring transparente (120 points)**
- Documentation méthodologie complète (`docs/SCORING-METHODOLOGY.md`)
- Références métier officielles 2026 (RGPD, CNIL, Google, IAB TCF v2.3)
- Formule de calcul transparente avec KPIs mesurables
- 5 niveaux de qualité (Excellence → Critique)

### ✨ Ajouts

#### Backend
- **Module de scoring professionnel** (`electron/scoring.ts`)
  - `scoreCMP()` : 30 pts (conformité RGPD, blocage pré-consent, Consent Mode v2)
  - `scoreTMS()` : 20 pts (gouvernance tags, container ID)
  - `scoreAnalytics()` : 25 pts (qualité données GA4, events recommandés)
  - `scoreDataLayer()` : 25 pts (nomenclature snake_case, structure e-commerce)
  - Bonus Consent Mode v2 : 10 pts

- **Intégration PageSpeed Insights API** (`electron/pagespeed.ts`)
  - Appel API gratuite (25k requêtes/jour)
  - Scores Lighthouse : Performance, Accessibility, SEO, Best Practices
  - Core Web Vitals (LCP, CLS, TBT, etc.)
  - `scorePerformance()` : 20 pts

- **Tests comportementaux**
  - Capture requêtes tracking avant consentement (<3s window)
  - Détection violations RGPD avec domaines
  - Détection Consent Mode v2 (4 paramètres)

- **Rapport d'audit complet** (`CompleteScanReport`)
  - Scores détaillés par module avec critères
  - Tests comportementaux (pass/fail)
  - Recommandations priorisées (P0/P1/P2/P3)
  - Export JSON

#### Frontend
- **Composant AuditReport** (`src/components/AuditReport.tsx`)
  - Score global circulaire avec niveau
  - Scores détaillés par module (progress bars, critères expandables)
  - Tests comportementaux avec domaines violants
  - Recommandations priorisées par criticité
  - PageSpeed scores (4 métriques Lighthouse)
  - Bouton export JSON

- **UI améliorée** (`src/App.tsx`)
  - Page d'accueil avec grille scoring affichée
  - Loader pendant génération rapport (spinner + texte)
  - Dashboard temps réel conservé
  - Navigation fluide scan → rapport → nouvelle analyse

- **Styles professionnels** (`src/App.css`)
  - Rapport d'audit (modules, tests, recommandations)
  - Score circulaire avec couleurs niveau
  - Cards tests comportementaux colorées (vert/rouge/gris)
  - Sections recommandations par priorité
  - Performance scores grid
  - Spinner animation

#### Détection améliorée
- **Extraction IDs automatique**
  - Container ID GTM (GTM-XXXXXX)
  - Measurement ID GA4 (G-XXXXXXXX)
  - Liens documentation officielle pour chaque outil

- **Nomenclature dataLayer**
  - Validation regex snake_case
  - Détection events génériques (click, event1, etc.)
  - Catégorisation automatique (6 catégories)
  - Validation structure e-commerce GA4

#### Documentation
- `docs/SCORING-METHODOLOGY.md` : Grille complète (500+ lignes)
- `README.md` mis à jour (architecture v0.3, grille scoring, workflow)
- `TEST.md` mis à jour (4 scenarios de test détaillés)
- `CHANGELOG.md` : Ce fichier

### 🔧 Améliorations

- **Capture requêtes réseau** : timestamp relatif au début du scan
- **Types TypeScript complets** : `ModuleScore`, `ScoreDetail`, `CompleteScanReport`
- **Gestion erreurs PageSpeed** : Graceful degradation si API timeout
- **Compilation optimisée** : Build Vite 163KB

### 📊 Métriques

- **9 fichiers modifiés/créés**
- **+2773 lignes** de code/documentation
- **Modules** : 5 modules scoring + 1 bonus
- **Critères** : 25+ critères auto + 10+ critères manuels
- **Recommandations** : 4 niveaux de priorité (P0/P1/P2/P3)
- **Tests comportementaux** : 3 tests (1 auto, 2 manuels)

### ⚠️ Breaking Changes

- `finishScan()` retourne maintenant `CompleteScanReport` au lieu de `ScanReport`
- Nouveaux types frontend : `CompleteScanReport`, `ModuleScore`, `ScoreDetail`
- Rapport UI complètement refait (ancien rapport basique supprimé)

### 🐛 Bugs connus

- Navigateur Chromium ne se ferme pas automatiquement après analyse
- Pas de validation URL (crash si URL invalide)
- PageSpeed Insights peut timeout si API surchargée

---

## [0.2.0] - 2026-08-27

### ✨ Ajouts

#### Architecture
- Composants React modulaires (`DataLayerTable`, `NetworkTable`, `ToolCard`)
- Refonte `App.tsx` avec sections expandables

#### Détection étendue
- **Attribution** (4 outils) : Adjust, AppsFlyer, Branch, Kochava
- **A/B Testing** (5 outils) : Optimizely, VWO, Google Optimize, AB Tasty, Kameleoon
- Catégorisation automatique events dataLayer (6 catégories)
- Catégorisation requêtes réseau (tracking, analytics, media, resource, other)

#### UI
- Dashboard professionnel avec sections collapsibles
- Tableaux détaillés (dataLayer, requêtes réseau)
- Parsing params URL automatique
- Boutons consentement interactifs

#### Design
- CSS niveau production (grilles responsive, animations, hover states)
- Palette brand Studio Jannah (violet/bleu)
- Mobile-first (breakpoints 768px, 1024px)

#### Documentation
- `docs/DETECTION-METHODS.md` : Techniques détection officielles 2026
- `README.md` v0.2
- `TEST.md` : Guide de test détaillé

---

## [0.1.0] - 2026-08-27

### 🎉 Initial Release

#### Architecture
- **Electron 34** + **Playwright** (headed mode)
- **React 18** + **Vite 6**
- **Mode duo** : humain navigue, outil observe

#### Détection de base
- **CMP** (5 acteurs) : Didomi, Axeptio, Cookiebot, Tarteaucitron, OneTrust
- **TMS** (2 acteurs) : Google Tag Manager, Adobe Launch
- **Analytics** (2 acteurs) : Google Analytics 4, Adobe Analytics

#### Fonctionnalités
- Capture dataLayer (50 premiers events)
- Capture requêtes réseau
- Dashboard temps réel
- Scoring basique (50 pts)

#### Documentation
- `docs/tracking-score/CAHIER-DES-CHARGES.md`
- `docs/tracking-score/PROMPT-CURSOR.md`
- `README.md` initial
- `TEST.md` initial

---

**Notation versions** :
- **0.x.0** : Versions MVP en développement actif
- **1.0.0** : Production-ready (après validation métier complète)
