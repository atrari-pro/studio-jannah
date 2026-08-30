# Guide de test — Tracking Score v0.3

**Objectif** : Valider le scoring professionnel complet + PageSpeed Insights + rapport d'audit

---

## 🚀 Lancement rapide

```bash
cd apps/tracking-score
pnpm dev
```

Une fenêtre Electron s'ouvre avec la grille de scoring affichée.

---

## ✅ Checklist de test v0.3

### Test 1 : Leboncoin.fr (setup classique FR — score attendu: 80-95)

**URL** : `https://www.leboncoin.fr`

**Étapes** :
1. Colle l'URL et clique "🚀 Lancer l'analyse"
2. Dans le navigateur Chromium : **Accepte tous les cookies**
3. Dans le dashboard : clique "✅ J'ai accepté les cookies"
4. Attends 5-10s (navigation passive)
5. Clique "🎯 Terminer l'analyse et générer le rapport"
6. ⏳ **Attends 30-60s** (appel PageSpeed Insights API)

**Ce que tu devrais voir dans le rapport** :

| Module | Score attendu | Raison |
|--------|---------------|--------|
| CMP | 25-30/30 | Didomi détecté, bon blocage pré-consent |
| TMS | 15-20/20 | GTM détecté avec containerId |
| Analytics | 20-25/25 | GA4 détecté avec propertyId |
| DataLayer | 20-25/25 | Events structurés, nomenclature OK |
| Performance | Variable | Dépend du site (leboncoin généralement 60-80) |
| Consent Mode v2 | 3-5/10 | Paramètres v2 détectés (tests manuels restants) |

**Score total attendu** : 80-95/120

**Tests comportementaux** :
- ✅ Blocage pré-consentement : PASS (0 requête tracking avant consent)
- ⏳ Respect refus : Non testé (manuel)
- ⏳ Consent Mode v2 : Non testé (manuel)

**Recommandations attendues** :
- P2/P3 (quelques optimisations mineures)
- Pas de critique (site bien configuré)

**PageSpeed Insights** :
- Performance : 60-80
- Accessibility : 80-90
- SEO : 85-95
- Best Practices : 80-90

---

### Test 2 : Fnac.com (e-commerce — score attendu: 75-90)

**URL** : `https://www.fnac.com`

**Focus** : DataLayer e-commerce

**Étapes** :
1. Lance l'analyse
2. Accepte les cookies
3. **Navigue dans le site** :
   - Clique sur un produit
   - Ajoute au panier (si tu veux)
   - Observe le compteur d'events dataLayer augmenter
4. Termine l'analyse

**Ce que tu devrais voir** :
- **DataLayer riche** (15-30+ events)
- Events e-commerce : `view_item`, `add_to_cart`, etc.
- Catégorisation automatique : "ecommerce", "engagement", "navigation"
- Score DataLayer élevé (20-25/25)

**Vérifie dans le rapport** :
- Section "📊 DataLayer" : clique sur "Voir données" → JSON complet affiché
- Section "🌐 Requêtes réseau" : filtrage tracking/analytics/media
- Module DataLayer : critère "Structure e-commerce GA4" = ✅ PASS

---

### Test 3 : Site avec violation RGPD (test refus)

**URL** : Choisis un site moins bien configuré (ex: petit site e-commerce FR)

**Focus** : Test blocage pré-consentement

**Étapes** :
1. Lance l'analyse
2. **NE TOUCHE PAS** au banner de cookies (ne clique rien)
3. Attends 5s
4. Termine l'analyse

**Ce que tu devrais voir** :
- **Test comportemental "Blocage pré-consentement" : FAIL**
- Domaines en violation affichés (ex: google-analytics.com, facebook.com)
- **Score CMP pénalisé** (-10 pts)
- **Recommandation P0 (Critique)** :
  > "VIOLATION RGPD: X requêtes tracking/analytics/ads avant consentement. Domaines: [...]. Action: Configurer le blocage pré-consentement dans votre CMP."

---

### Test 4 : Ton propre site (localhost:4321)

**Prérequis** :
```bash
cd apps/web
pnpm dev
```

**URL** : `http://localhost:4321`

**Focus** : Vérifier ton tracking custom Studio Jannah

**Étapes** :
1. Lance l'analyse sur localhost
2. Navigue sur plusieurs pages
3. Accepte Tarteaucitron
4. Termine l'analyse

**Ce que tu devrais voir** :
- **CMP détecté** : Tarteaucitron
- **DataLayer** : tes events custom `sj_*`
- **Requêtes réseau** : `/sj/datalayer.js` visible
- **Nomenclature** : snake_case validé si tu as bien nommé tes events

**Valide que** :
- Ton tracking respecte les best practices (nomenclature, structure)
- Pas de violation RGPD si Tarteaucitron bien configuré

---

## 🎨 Points UI à vérifier

### Page d'accueil
- [ ] Grille de scoring affichée (6 modules + 120 pts total)
- [ ] URL input + bouton "Lancer l'analyse"
- [ ] Hint "mode duo" visible

### Dashboard temps réel
- [ ] Stats header (X outils, Y events, Z requêtes)
- [ ] Sections expandables (clic header → collapse/expand)
- [ ] Tool cards avec icônes + badges "✅ Auto" ou "🔧 Manuel"
- [ ] Liens "📚 Documentation" sur chaque outil
- [ ] Boutons consentement changent d'état (✅ actif)
- [ ] Badges états consentement (Initial/Accepté/Refusé)

### Pendant génération rapport
- [ ] Spinner animé
- [ ] Texte "Génération du rapport professionnel..."
- [ ] Mention "Appel PageSpeed Insights API (30-60s)"
- [ ] Dashboard reste visible (pas de freeze UI)

### Rapport d'audit
- [ ] **Score global circulaire** avec couleur niveau
  - Excellence = vert
  - Production = bleu
  - Moyen = orange
  - Faible/Critique = rouge
- [ ] **Scores par module** :
  - Progress bars colorées
  - Critères expandables (clic "Voir détails")
  - Chaque critère affiche : icône status + nom + points + raison
- [ ] **Tests comportementaux** :
  - Cards colorées (vert=pass, rouge=fail, gris=not_tested)
  - Domaines violants affichés si fail
- [ ] **Recommandations priorisées** :
  - Sections P0/P1/P2/P3 avec couleurs distinctes
  - Texte actionnable (problème + impact + action)
- [ ] **PageSpeed Insights** :
  - 4 scores affichés (Performance, A11y, SEO, BP)
  - Couleurs : vert (>90), orange (50-90), rouge (<50)
- [ ] **Boutons footer** :
  - "🔄 Nouvelle analyse" fonctionne
  - "💾 Exporter JSON" télécharge le rapport

---

## 🐛 Bugs connus à ignorer

1. **Navigateur Chromium ne se ferme pas auto** → Ferme-le manuellement
2. **URL invalide = crash** → Mets toujours une URL valide http(s)://
3. **PageSpeed timeout possible** → Réessaye, l'API peut être surchargée
4. **Zscaler sur Mac EY** → Installe Chromium avec `NODE_TLS_REJECT_UNAUTHORIZED=0`

---

## 🚨 Bugs à signaler (hors bugs connus)

Si tu trouves un bug **autre que ceux listés**, note :
1. URL testée
2. Action effectuée
3. Résultat attendu vs obtenu
4. Screenshot si possible
5. Erreur console (Cmd+Opt+I dans Electron)

---

## ✨ Fonctionnalités à valider

### Scoring professionnel
- [ ] CMP : détection + blocage pré-consent testé
- [ ] TMS : containerId extrait (GTM-XXXXXX)
- [ ] Analytics : propertyId extrait (G-XXXXXXXX)
- [ ] DataLayer : nomenclature snake_case validée
- [ ] DataLayer : events génériques détectés (pénalité -3 pts)
- [ ] DataLayer : structure e-commerce validée (ecommerce.items[])
- [ ] Performance : 4 scores Lighthouse affichés
- [ ] Consent Mode v2 : détection 4 paramètres

### Tests comportementaux
- [ ] Blocage pré-consent : capture requêtes <3s
- [ ] Blocage pré-consent : status FAIL si requêtes détectées
- [ ] Domaines violants affichés dans le rapport
- [ ] Tests manuels affichés comme "Non testé"

### Recommandations
- [ ] P0 (Critique) : violations RGPD affichées en rouge
- [ ] P1 (Haute) : duplicate pageview, params manquants
- [ ] P2 (Moyenne) : nomenclature, Consent Mode v2
- [ ] P3 (Basse) : préfixes custom events
- [ ] Chaque recommandation = problème + action

### Export JSON
- [ ] Bouton "Exporter JSON" télécharge un fichier
- [ ] Nom fichier = `audit-YYYY-MM-DD.json`
- [ ] JSON valide et complet (tous les champs du rapport)

---

## 📊 Métriques de succès

**Un test est réussi si** :
1. L'app démarre sans erreur
2. Le navigateur s'ouvre sur l'URL
3. Les détections s'affichent en temps réel
4. Le bouton "Terminer l'analyse" génère un rapport
5. Le rapport affiche tous les modules avec scores
6. Les recommandations sont pertinentes et actionnables
7. PageSpeed Insights retourne des scores (ou erreur graceful)
8. L'UI est fluide et professionnelle
9. Aucune erreur console critique

**Temps de test estimé** : 10-15 min par site

---

## 🎯 Validation finale v0.3

Après avoir testé les 4 sites, tu devrais avoir :
- [x] Vu 3+ CMPs différentes (Didomi, Axeptio, Tarteaucitron)
- [x] Vu GTM avec containerId extrait
- [x] Vu GA4 avec propertyId extrait
- [x] Vu un site avec violation RGPD (requêtes avant consent)
- [x] Vu un dataLayer e-commerce avec structure valide
- [x] Vu les 4 scores PageSpeed Insights
- [x] Vu des recommandations P0/P1/P2/P3
- [x] Exporté un rapport JSON
- [x] Vérifié que ton propre site respecte les best practices

Si tout est ✅, **v0.3 est validée** et prête pour phase suivante (tests CMP automatiques + media pixels).

---

## 🔧 En cas de problème

### App ne démarre pas
```bash
lsof -ti:5174 | xargs kill -9
pnpm install --force
npm run compile
pnpm dev
```

### PageSpeed Insights échoue
- Vérifie ta connexion internet
- Réessaye (l'API peut être temporairement surchargée)
- Si échec persistant, le module Performance affichera 0 pts (le reste continue)

### Scores semblent incorrects
- Consulte `docs/SCORING-METHODOLOGY.md` pour comprendre chaque critère
- Vérifie les détails du module (clic "Voir détails")
- Chaque point est justifié avec une raison

### Détections manquantes
- Consulte `docs/DETECTION-METHODS.md`
- Ouvre la console du navigateur Chromium (Cmd+Opt+I)
- Teste manuellement : `window.didomi`, `window.google_tag_manager`, etc.
- Certains outils chargent après consentement (teste après avoir accepté cookies)

---

**Version** : v0.3 — Audit professionnel complet  
**Dernière mise à jour** : 27 août 2026
