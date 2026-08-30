# Cahier des charges — Tracking Score

Trace des décisions de conception module par module. Ce document complète
`docs/SCORING-METHODOLOGY.md` (grille de points) en expliquant le *pourquoi*
et les arbitrages techniques — utile quand on revient sur une décision six
mois plus tard.

---

## Module A — CMP

**Statut** : v2 (27 août 2026) — refonte complète du périmètre de mesure.
**v1** (grille initiale, voir `docs/SCORING-METHODOLOGY.md` avant cette date) :
5 pts CMP détectée + 10 pts blocage réseau pré-consentement + 5 pts choix
granulaire (manuel) + 5 pts audit trail (manuel) + 5 pts Consent Mode v2.

### Périmètre validé v2

1. **Présence/absence CMP** — détection étendue au-delà des 5 CMP natifs
   (`window.Didomi`, `Axeptio`, `Cookiebot`, `Tarteaucitron`, `OneTrust`) via
   les règles open-source **Consent-O-Matic**.
2. **CTA conformes CNIL** — parité visuelle Accepter/Refuser mesurée
   techniquement (bounding box, position DOM, contraste), pas estimée.
3. **Contenu catégoriel** — catégories de consentement proposées par la CMP,
   listées.
4. **Typologie de CMP** — marché reconnu / custom maison / absente.
5. **Blocage navigation** — modal bloquant l'interaction avant décision, ou
   bannière non-bloquante.

**Hors périmètre, volontairement** : les signaux Consent Mode (`gcs`, `gcd`,
`G1xy`) ne sont **pas** traités ici. Ce sont des paramètres portés par les
requêtes réseau générées par le TMS/sGTM — ils appartiennent à `scoreTMS` et
au module bonus `consentModeV2`, pas à l'audit de la CMP elle-même.

### Règle transversale : `non_determine`

Un critère techniquement indéterminable pour ce scan (CMP non reconnue par
les règles Consent-O-Matic, structure DOM non standard, bannière présente
mais pas encore affichée) renvoie le statut `non_determine`.

- **Jamais** un score forcé à 0 ni aux points pleins par défaut.
- Exclu à la fois du numérateur **et** du dénominateur du module
  (`buildModuleScore` dans `electron/scoring.ts`) — un `non_determine` ne
  pénalise ni ne favorise le pourcentage du module. Concrètement, le `max`
  d'un module n'est plus une constante : il varie selon ce qui a pu être
  mesuré sur ce scan précis.
- Agrégé séparément dans `CompleteScanReport.manualReview` (tous modules
  confondus) pour revue humaine, affiché dans une section dédiée du rapport.
- `calculateTotalScore` recalcule le `max` global en sommant les `max` de
  chaque module (au lieu d'une constante 120/125) — sinon le pourcentage
  total serait faussé par les critères exclus.

### Architecture de détection

```
detectTools()
  └─ détection native window.* (5 CMP, inchangée)
       └─ auditCmp() [electron/cmp-detection.ts]
            1. Present via règles Consent-O-Matic (182 vendors, voir plus bas)
               → sinon fallback natif → sinon heuristique générique (mots-clés
               cookie/consent/vie privée + boutons, sur les enfants directs de
               <body>)
            2. Vérifie que la CMP est réellement AFFICHÉE (showingMatcher),
               pas seulement présente dans le DOM — sinon toute mesure de CTA/
               blocage est non_determine plutôt que fausse (cf. limite connue
               tarteaucitron ci-dessous)
            3. Mesure CTA (bounding box + contraste WCAG des boutons
               Accepter/Refuser reconnus par mots-clés multilingues)
            4. Mesure blocage (overflow verrouillé + overlay plein écran)
            5. Ouvre le panneau d'options (clic réel sur le sélecteur
               OPEN_OPTIONS de la règle) et scrape les libellés de catégories
               (checkbox/switch visibles)
scoreCMP() [electron/scoring.ts] → traduit le CmpAuditResult en 5 critères
  notés (5/10/5/5/5 = 30 pts), chacun pouvant être non_determine
```

### Pourquoi Consent-O-Matic mais pas tout Consent-O-Matic

[Consent-O-Matic](https://github.com/cavi-au/Consent-O-Matic) (CAVI, Aarhus
University, **licence MIT**) couvre ~200 CMP via un DSL procédural complet
(clic à travers tout le tunnel de consentement : ouvrir, naviguer les
onglets, cocher/décocher, sauvegarder). Reprendre ce moteur entier aurait
été un projet à part entière (un auto-clicker de consentement), pas un outil
de mesure.

On ne reprend que deux choses de leurs règles, normalisées dans
`electron/data/consent-o-matic-rules.json` (généré par
`scripts/build-cmp-rules.mjs`, 182 règles exploitables sur 204 fichiers
sources — 22 écartées car sans sélecteur CSS direct) :

- `presentMatcher` / `showingMatcher` → détection de présence et de visibilité
- le sélecteur `OPEN_OPTIONS` quand il est un clic direct simple (99/182
  règles) → pour scraper les catégories

Les arbres d'actions procéduraux (`DO_CONSENT`, `SAVE_CONSENT`, listes
imbriquées `ifcss`/`foreach`/`waitcss`) sont ignorés. Attribution complète et
texte de licence dans `electron/data/CONSENT-O-MATIC-ATTRIBUTION.md`.

Pour les CMP non couvertes (ex. Axeptio n'a pas de règle Consent-O-Matic
exploitable au moment de la génération), on retombe sur la détection native
`window.*` existante, puis sur une heuristique générique (mots-clés +
présence de boutons) pour repérer une CMP "custom maison".

### Mesure de parité CTA (critère 2)

- **Candidats** : boutons/liens dans la racine CMP dont le texte matche des
  listes de mots-clés FR/EN (`ACCEPT_KEYWORDS`, `REFUSE_KEYWORDS` dans
  `cmp-detection.ts`), limités aux éléments **visibles** (bounding box non
  nulle) pour éviter de mesurer des doublons masqués.
- **Ratio de taille** : `min(aire accepter, aire refuser) / max(...)`.
- **Alignement** : "même ligne" si l'écart vertical est inférieur à 1.5× la
  hauteur du plus grand bouton.
- **Contraste** : ratio WCAG (luminance relative) entre le texte et le fond
  effectif de chaque bouton (on remonte les ancêtres jusqu'à trouver un fond
  non transparent).
- **Seuils de verdict** — ratio ≥ 0.5, même ligne, écart de contraste ≤ 3 :
  ce sont **nos** seuils opérationnels, pas des valeurs publiées par la
  CNIL (qui n'en fixe pas). Documentés ici pour pouvoir les ajuster en
  connaissance de cause si le taux de faux positifs/négatifs le justifie.
- Absence totale de bouton "Refuser" au même niveau que "Accepter" → `fail`
  explicite ("potentiel dark pattern CNIL"), pas `non_determine`, dès lors
  que la CMP est reconnue (règle Consent-O-Matic) et affichée.

### Typologie CMP (critère 4)

- `marche_reconnu` : matché par une règle Consent-O-Matic OU par la
  détection native `window.*` — 5 pts.
- `custom_maison` : trouvé uniquement par l'heuristique générique (mots-clés
  + boutons) — 2 pts, `partial`, revue manuelle recommandée (l'heuristique a
  un vrai risque de faux négatif sur une structure inhabituelle).
- `absente` : rien trouvé — 0 pt.

### Blocage navigation (critère 5)

Heuristique : `overflow: hidden` sur `<body>`/`<html>` OU présence d'un
enfant direct de `<body>` en `position: fixed/absolute`, `pointer-events`
actif, couvrant plus de 70% du viewport, distinct de la racine CMP.

**Position assumée** : la CNIL n'exige ni bannière bloquante ni bannière
non-bloquante — les deux sont valides si aucun tracking ne fire avant
décision (test comportemental séparé, module réseau). On valorise ici la
garantie technique la plus forte (bloquant = 5 pts, non-bloquant = 3 pts)
sans prétendre que le non-bloquant est non conforme.

### Limites connues (documentées, pas cachées)

- **CMP présente mais fermée** (ex. tarteaucitron avec sa petite icône avant
  ouverture) : `showingMatcher` permet de détecter ce cas et de renvoyer
  `non_determine` plutôt qu'une fausse mesure — mais on ne tente pas de
  cliquer pour révéler la bannière avant de mesurer. Amélioration possible
  v3 si le taux de `non_determine` sur ce critère s'avère trop élevé en
  usage réel.
- **Sélecteurs Consent-O-Matic potentiellement obsolètes** vis-à-vis d'une
  configuration personnalisée (ex. `didomi.io` détecté mais son
  `OPEN_OPTIONS` peut ne pas matcher si le client a customisé son thème) →
  se traduit par un `non_determine` sur les catégories, jamais un crash.
- **Heuristique de blocage** ne scanne que les enfants directs de `<body>` (
  pattern d'implémentation le plus courant pour un overlay/backdrop) — un
  overlay imbriqué profondément dans l'arbre DOM ne sera pas détecté.
- **Scan de la fenêtre de scroll lock** ne distingue pas un `overflow:hidden`
  posé par la CMP d'un `overflow:hidden` déjà présent sur le site pour une
  autre raison (rare, mais possible faux positif "blocking").

### Validation manuelle (27 août 2026)

Deux scans réels en conditions de production, avant intégration :

| Site | CMP | Résultat |
|------|-----|----------|
| cnil.fr | tarteaucitron (icône fermée au chargement) | `non_determine` correctement déclenché sur CTA/catégories/blocage — pas de fausse mesure sur bounding box à zéro. Max module réduit de 25 à 10, 10/10 obtenus. |
| numerama.com | Didomi (bannière ouverte au chargement) | Bouton "Refuser" absent au même niveau que "J'accepte tous les cookies" → `fail` correctement remonté comme potentiel dark pattern CNIL. Blocage détecté (`blocking`, overlay plein écran). Catégories `non_determine` (sélecteur `OPEN_OPTIONS` du thème Didomi custom non matché). |

### Fichiers concernés

- `electron/cmp-detection.ts` — moteur de détection/mesure (nouveau)
- `electron/data/consent-o-matic-rules.json` — règles normalisées (généré)
- `electron/data/CONSENT-O-MATIC-ATTRIBUTION.md` — licence MIT + attribution (généré)
- `scripts/build-cmp-rules.mjs` — script de régénération des règles
- `electron/scoring.ts` — `scoreCMP()` réécrit, `buildModuleScore()` et
  `collectManualReview()` ajoutés, `calculateTotalScore()` corrigé (max
  dynamique)
- `electron/playwright-controller.ts` — appel à `auditCmp()`, reset de
  `cmpAudit` entre deux scans, assemblage de `manualReview`
- `electron/types.ts`, `src/types/scan.ts` — types `CmpAuditResult` et
  dérivés (dupliqués électron/frontend, cf. limitation existante du projet —
  pas de package partagé entre le process Electron et le renderer Vite)
- `src/components/AuditReport.tsx` — icône `non_determine`, section "Revue
  manuelle requise"
