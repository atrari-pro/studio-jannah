---
title: "QA de tags GTM : preview mode et ordre de déclenchement"
description: "Checklist pass/fail pour recetter le comportement des tags GTM en Preview mode : déclenchement, ordre, priorité, exceptions, variables au moment T."
publishedAt: 2026-09-06
status: published
categoryLabel: "GTM"
type: "audit"
level: "avance"
tags: ["GTM", "QA", "preview mode", "triggers", "recette"]
hook: "Une checklist de recette centrée sur ce qui casse silencieusement en Preview mode — l'ordre de déclenchement des tags, leur priorité, leurs exceptions — à rejouer avant chaque publication de conteneur qui touche triggers ou tags."
sources:
  - label: "Google — Tag Assistant"
    url: "https://tagassistant.google.com/"
  - label: "Google — Data Layer (Tag Manager Developer Guide)"
    url: "https://developers.google.com/tag-platform/tag-manager/datalayer"
  - label: "Google — Centre d'aide Tag Manager"
    url: "https://support.google.com/tagmanager/"
  - label: "Simo Ahava — A Simple Guide to the Google Tag Manager Data Layer"
    url: "https://www.simoahava.com/analytics/data-layer/"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/gtm/audit-gtm"
  - "tracking/gtm/architecture-conteneur"
  - "tracking/datalayer/audit-datalayer"
  - "tracking/datalayer/debug-datalayer"
---

## Comment utiliser cette checklist

Cette checklist ne recette ni le contenu du dataLayer (voir [Audit DataLayer](/expertises/tracking/datalayer/audit-datalayer)) ni la configuration statique du conteneur (voir [Audit GTM](/expertises/tracking/gtm/audit-gtm)) — elle recette le **comportement observé en Preview mode au moment T** : quels tags se déclenchent, dans quel ordre, avec quelles valeurs de variables. Chaque critère se vérifie dans [Tag Assistant](https://tagassistant.google.com/), l'outil qui a remplacé l'ancien Preview mode GTM. Un critère non coché **fail** bloque la publication tant qu'il n'est pas corrigé ou accepté comme risque connu.

## 1. Accès et environnement de test

- [ ] **Le [Preview mode](https://support.google.com/tagmanager/) est connecté sur la bonne version/environnement du conteneur** — pas "Latest" par erreur pendant qu'un collègue publie un changement en parallèle sur le même workspace.
- [ ] **Le parcours est testé sans cookie de consentement préalable** (navigation privée) pour observer le comportement par défaut (`denied`), puis **testé séparément avec consentement déjà accordé** (revisite) — les deux états produisent des déclenchements différents et doivent être recettés indépendamment.
- [ ] **Un outil d'audit externe (Tag Assistant) confirme la même lecture que le Preview mode ouvert depuis l'interface GTM** — croiser les deux évite qu'un biais de configuration locale (extension, cache navigateur) fausse la recette.

## 2. Déclenchement des tags

- [ ] **Chaque tag attendu sur l'action recettée apparaît dans "Tags Fired"**, aucun tag qui aurait dû se déclencher ne reste dans "Tags Not Fired" sans explication.
- [ ] **Le tag de configuration GA4 ne déclenche pas de `page_view` automatique en plus du `page_view` poussé par le dataLayer** — vérifier que "Send a page view event when this configuration loads" est désactivé sur ce tag, sinon double comptage (point documenté dans `docs/TRACKING_DATALAYER.md`, révision 1.1.0).
- [ ] **Aucun tag ne se déclenche deux fois pour un même event unique** — vérifier l'historique complet des events dans le panneau gauche du Preview mode, pas seulement le dernier event affiché, qui masque une répétition antérieure.

## 3. Ordre & priorité de déclenchement

- [ ] **Le Google Tag (ou le tag de configuration GA4) se déclenche avant tout tag Event GA4 qui en dépend** — observable dans l'ordre d'apparition du panneau Preview ; un tag Event qui se déclenche avant sa configuration ne trouve pas le contexte attendu côté GA4.
- [ ] **La Tag Firing Priority n'est utilisée que sur les tags où un ordre réel est requis**, pas comme réglage systématique sur tous les tags — une priorité posée par défaut partout masque un vrai problème de dépendance ailleurs plutôt que de le résoudre.
- [ ] **Les tags qui dépendent d'un autre tag encore en cours d'exécution utilisent un mécanisme de séquencement explicite** (Setup Tag / Cleanup Tag si applicable), pas une simple priorité numérique qui ne garantit qu'un ordre relatif, pas une attente de fin d'exécution.

## 4. Exceptions & blocages

- [ ] **Chaque exception de trigger (blocking trigger) observée en Preview correspond à une exception documentée** dans la configuration du conteneur — un tag qui ne se déclenche jamais sur une page donnée doit être un choix vérifié, pas une anomalie découverte pendant la recette.
- [ ] **Aucun tag de mesure ne se déclenche avant l'obtention du consentement analytics** — recontrôlé ici au niveau comportemental (Preview), en complément du contrôle structurel déjà fait au niveau du contrat dataLayer et de la configuration Consent Mode dans le conteneur.

## 5. Variables au moment du déclenchement

- [ ] **Chaque valeur de variable affichée dans le Preview mode au moment du déclenchement correspond à la valeur attendue** à ce point précis du parcours, conformément au mécanisme de lecture décrit par la [Tag Manager Developer Guide de Google](https://developers.google.com/tag-platform/tag-manager/datalayer) — pas de `undefined` sur une variable censée être renseignée à ce stade.
- [ ] **Un `undefined` constaté est diagnostiqué comme un problème de timing (variable pas encore disponible au moment du push) ou comme un problème de nommage (clé DL différente de la variable GTM)** avant toute correction — les deux causes, documentées dans le [guide de Simo Ahava sur le dataLayer GTM](https://www.simoahava.com/analytics/data-layer/), se corrigent différemment et confondre l'une avec l'autre fait perdre du temps de debug.

## 6. Publication

- [ ] **La recette complète est rejouée sur la version prête à publier**, pas uniquement sur le workspace local — une divergence entre le workspace testé et la version finale (résolution de conflit, merge d'un autre workspace) doit être exclue avant le clic "Submit".
- [ ] **Un rollback vers la version précédente est identifié et possible en un clic** avant de publier — si une régression apparaît après mise en prod, le temps de réaction dépend de cette vérification faite en amont, pas découverte dans l'urgence.

## Ce que Studio Jannah recommande

Cette checklist se rejoue à chaque publication de conteneur qui touche des triggers ou des tags — pas seulement lors des grosses refontes, où le réflexe de recette est déjà présent. C'est sur les changements "mineurs" (ajout d'un tag isolé, correction d'un trigger) que la recette est le plus souvent sautée, et c'est précisément là qu'un ordre de déclenchement cassé ou un double comptage passe inaperçu jusqu'au reporting mensuel. Combinée à l'[Audit GTM](/expertises/tracking/gtm/audit-gtm) (structure) et à l'[Audit DataLayer](/expertises/tracking/datalayer/audit-datalayer) (contenu), elle couvre les trois couches d'une recette tracking complète.
