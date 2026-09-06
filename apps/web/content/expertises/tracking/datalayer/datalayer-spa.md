---
title: "DataLayer en SPA : timing et race conditions"
description: "Pourquoi un event dataLayer peut partir sans atteindre GA4 en SPA — History Change, virtual pageviews et race conditions, avec les garde-fous concrets."
publishedAt: 2026-09-06
status: published
categoryLabel: "DataLayer"
type: "guide"
level: "avance"
tags: ["dataLayer", "SPA", "timing", "race condition", "GTM"]
hook: "Le guide pour comprendre pourquoi un event dataLayer peut être poussé sans jamais atteindre GA4 en SPA ou app JS, et fiabiliser le timing plutôt que de multiplier les correctifs a posteriori."
sources:
  - label: "Google — Measure single page applications (Google Analytics 4)"
    url: "https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications"
  - label: "MDN — History API"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/History_API"
  - label: "MDN — Navigator: sendBeacon() method"
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/datalayer/debug-datalayer"
  - "tracking/datalayer/migration-datalayer"
  - "tracking/datalayer/documentation-vivante"
  - "tracking/datalayer/plan-de-marquage"
---

## Le problème que ce guide résout

Sur une single-page application, la navigation entre écrans ne recharge pas la page — rien ne réinitialise les scripts de mesure quand l'utilisateur "change de page" côté métier. Le `page_view` par défaut, déclenché au chargement, rate donc la navigation interne sauf signal explicite. Et parce que `dataLayer.push` est synchrone alors que les données qu'il porte ne le sont pas toujours, un event peut partir avec des paramètres vides sans erreur visible — un bug de timing, pas d'orthographe.

Le contrat dataLayer Studio Jannah prévoit un event dédié pour ce cas : `sj_virtual_page_view` (« wizard / SPA step »), distinct de `page_view` qui reste réservé à une navigation réelle avec rechargement.

## La mécanique concrète

**Le trigger History Change de GTM écoute l'API History, pas la navigation "logique".** GTM propose un trigger natif qui se déclenche sur les changements détectés via l'[History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) du navigateur (`pushState`, `replaceState`, `popstate`). Un routeur qui ne manipule pas cette API de façon standard (routage par hash, navigation interne propriétaire à un framework) ne déclenche jamais ce trigger. À l'inverse, un routeur qui appelle `pushState` plusieurs fois pour une seule transition logique (redirection interne, normalisation de query string) peut déclencher le trigger plusieurs fois pour ce que l'utilisateur perçoit comme une seule navigation.

**Pousser un event explicite découple le signal du mécanisme du routeur.** C'est le choix fait par le contrat Studio Jannah avec `sj_virtual_page_view` : l'application pousse l'event elle-même, au moment précis où l'écran change réellement côté métier, plutôt que de dépendre d'un signal générique du navigateur. Cette approche est cohérente avec la recommandation de [Google pour la mesure des SPA en GA4](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications), qui privilégie un déclenchement explicite côté application plutôt qu'une détection générique de changement d'URL.

**La race condition, concrètement.** `dataLayer.push(...)` s'exécute de façon synchrone à l'endroit exact où il est appelé dans le code. S'il est appelé au montage d'un composant avant qu'un appel asynchrone n'ait résolu une donnée nécessaire (un `item_id`, un `page_type` calculé), l'event part quand même — avec des clés `undefined` ou absentes. Rien ne bloque le push, rien ne remonte d'erreur : l'event est visible en Preview mode, mais incomplet.

**Un composant démonté avant qu'un event asynchrone n'ait fini de se résoudre.** Dans les frameworks à réconciliation déclarative, une navigation peut démonter un composant avant qu'un effet asynchrone en cours n'ait eu le temps de pousser son event — l'event prévu ne part tout simplement jamais, sans trace ni erreur.

**Un event poussé juste avant la sortie de page joue sa fiabilité sur le mode d'envoi.** Une requête réseau en cours au moment où le navigateur commence à décharger la page n'est pas garantie d'aboutir selon la méthode utilisée pour l'envoyer — c'est précisément le problème que résout [`navigator.sendBeacon()`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon), conçu par les navigateurs pour survivre à la fermeture ou au déchargement d'une page, contrairement à une requête `fetch`/XHR classique lancée au même instant.

## Pièges connus

- **Pousser l'event avant que les données requises soient résolues** : l'event est visible en Preview mode, avec des paramètres vides — un piège qui se confond facilement avec une erreur de naming si on ne croise pas avec GA4 DebugView (voir l'article dédié au debug).
- **Compter deux fois la même navigation logique** : un routeur qui déclenche plusieurs `pushState` pour une seule transition d'écran, sans logique de dédup côté event, gonfle artificiellement le nombre de vues d'écran.
- **S'appuyer uniquement sur le trigger générique History Change de GTM** pour un routeur qui ne manipule pas l'API History de façon standard — le trigger ne se déclenche jamais, et rien ne le signale autrement qu'en absence totale de données dans le rapport.
- **Perdre un event programmé dans un effet qui ne survit pas au démontage du composant** — navigation plus rapide que la résolution de l'effet, event silencieusement jamais poussé.
- **Ne tester le timing qu'en réseau rapide** (fibre, wifi bureau) : les race conditions liées à la résolution de données asynchrones sont nettement plus visibles sur mobile ou réseau contraint, où le délai entre montage du composant et résolution de l'appel API s'allonge.

## Ce que Studio Jannah recommande

Ne jamais dépendre du seul trigger générique GTM pour une SPA à enjeu — pousser un event explicite (`sj_virtual_page_view` dans le contrat Studio Jannah) au moment où l'écran change réellement côté application, après résolution des données nécessaires, pas au moment où l'URL change côté navigateur. Sur un funnel critique (paiement, formulaire multi-étapes), attendre que toutes les données requises soient disponibles avant de pousser plutôt que de pousser un event partiel complété plus tard : un event tronqué en Preview mode passe souvent inaperçu tant qu'il n'a pas été confronté à GA4 DebugView, et se corrige beaucoup plus cher une fois en prod qu'en recette.
