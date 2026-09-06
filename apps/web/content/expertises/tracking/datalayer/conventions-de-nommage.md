---
title: "Conventions de nommage DataLayer : events et paramètres"
description: "Pourquoi un event mal nommé casse un reporting sans erreur visible, comment nommer events et paramètres, pièges de casse GTM/GA4."
publishedAt: 2026-09-06
status: published
categoryLabel: "DataLayer"
type: "guide"
level: "fondamentaux"
tags: ["dataLayer", "naming", "GTM", "GA4", "conventions"]
hook: "Une convention de nommage stable pour vos events et paramètres dataLayer, appliquée dès la spécification — pour ne plus jamais chasser un `undefined` silencieux causé par une casse différente entre le DL et une variable GTM."
sources:
  - label: "Google — Recommended events (Google Analytics 4)"
    url: "https://support.google.com/analytics/answer/9267735"
  - label: "Google — Data Layer (Tag Manager Developer Guide)"
    url: "https://developers.google.com/tag-platform/tag-manager/datalayer"
  - label: "Simo Ahava — A Simple Guide to the Google Tag Manager Data Layer"
    url: "https://www.simoahava.com/analytics/data-layer/"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/datalayer/plan-de-marquage"
  - "tracking/datalayer/audit-datalayer"
  - "tracking/datalayer/datalayer-ecommerce"
  - "tracking/datalayer/debug-datalayer"
---

## Le problème que le nommage résout

Un dataLayer techniquement fonctionnel peut produire un reporting faux sans qu'aucune erreur ne remonte nulle part — ni dans la console, ni dans GTM, ni dans GA4. La cause la plus fréquente : une clé poussée dans le DL avec une casse ou une orthographe différente de celle lue par la variable GTM correspondante. Une convention de nommage n'est donc pas une question de style : c'est un garde-fou contre une classe entière de bugs silencieux.

`page_type` versus `pageType` versus `Page_Type` sont trois chaînes distinctes pour un navigateur ; une variable GTM mal orientée sur l'une d'elles ne lève pas d'exception, elle renvoie silencieusement `undefined`. Le tag continue de se déclencher, le hit continue de partir, et personne ne remarque que le paramètre censé segmenter le reporting est vide — jusqu'à ce que quelqu'un se demande pourquoi 40% du trafic n'a "aucun" `page_type`.

## La mécanique concrète

**Deux catégories d'events, deux règles distinctes.**

GA4 définit une liste d'[événements recommandés](https://support.google.com/analytics/answer/9267735) (`page_view`, `purchase`, `sign_up`, `login`…) avec un nom et un schéma de paramètres standardisés. Ces noms **ne se renomment jamais** : `page_view` reste `page_view`, jamais `sj_page_view` ni `pageView`. Renommer un event standard casse la reconnaissance automatique des rapports GA4 dédiés (Enhanced Ecommerce, notamment) et oblige à reconstruire à la main ce que GA4 offre nativement.

Pour tout le reste — les concepts propres au site, sans équivalent standard (clic sur un CTA spécifique, étape d'un funnel maison, affichage d'un bandeau CMP) — un **namespace cohérent** évite deux risques : la collision avec un futur event standard GA4, et l'ambiguïté sur l'origine de l'event en lecture de code ou en GTM Preview. Le pattern le plus robuste observé sur des dataLayers en production, largement documenté par des références externes comme le [guide de Simo Ahava sur le dataLayer GTM](https://www.simoahava.com/analytics/data-layer/), est un préfixe fixe et court (ex. `sj_*`) appliqué systématiquement, sans exception non documentée.

**La casse et le séparateur, une fois choisis, ne bougent plus.** `snake_case` est le standard de facto sur les événements et paramètres GA4/GTM (cohérent avec les noms d'événements recommandés eux-mêmes, tous en `snake_case`, comme le confirme la [documentation officielle Data Layer de Google](https://developers.google.com/tag-platform/tag-manager/datalayer)). Le mélanger avec du `camelCase` sur certaines clés custom est la source n°1 des variables GTM mal orientées en audit.

**Les CTA suivent un pattern structurel, pas un nom libre.** `zone_objet_action` (ex. `header_cta_contact`, `footer_cta_newsletter`) permet de segmenter un reporting par zone de page sans dépendre d'un texte de bouton qui change au moindre A/B test. Un identifiant de CTA généré dynamiquement depuis le texte affiché (`"Contactez-nous"` → `contactez-nous`) casse dès que le texte est traduit, raccourci ou testé.

**Les paramètres suivent le nom de leur event, pas l'inverse.** Un paramètre comme `item_id` ou `transaction_id` garde le même nom sur tous les events qui le portent (`view_item`, `add_to_cart`, `purchase`) — le faire varier (`product_id` sur un event, `item_id` sur un autre) oblige à dupliquer la logique de lecture côté GTM pour un même concept.

## Pièges connus

- **Confondre absence de valeur et valeur incorrecte.** Un paramètre `undefined` en GTM Preview peut venir d'une clé qui n'existe simplement pas encore à ce moment du push (timing, voir l'article dédié au debug), pas forcément d'une faute de nommage — les deux se corrigent différemment.
- **Deux équipes, deux conventions.** Sur un site multi-marques ou multi-équipes, un manque de convention documentée produit fréquemment deux namespaces différents pour le même concept (`sj_cta_click` d'un côté, `cta_clicked` de l'autre) — coûteux à réconcilier a posteriori en reporting BigQuery.
- **Renommer un event standard "pour être plus clair".** `sj_purchase` au lieu de `purchase` semble plus explicite en lecture de code, mais désactive silencieusement toute la reconnaissance automatique GA4 associée à l'event standard.
- **Un nom de paramètre qui change de sens entre deux versions du schéma** sans changelog — la clé existe toujours, le type de données change, et rien ne le signale en dehors d'une documentation à jour.

## Ce que Studio Jannah recommande

Fixer la convention (namespace, casse, pattern CTA) dans le plan de marquage avant la première ligne de spécification d'event, pas après. Documenter explicitement les deux exceptions volontaires au namespace custom (`page_view` en nom standard, et le bootstrap interne du conteneur GTM `gtm.js`/`gtm.start`, imposé par la plateforme) pour que toute personne qui reprend le tracking comprenne pourquoi elles dérogent à la règle commune plutôt que de les "corriger" par erreur.
