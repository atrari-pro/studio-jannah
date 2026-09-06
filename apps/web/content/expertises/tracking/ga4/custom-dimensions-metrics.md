---
title: "Custom dimensions et metrics GA4 : scope et limites"
description: "Event-scoped, user-scoped, item-scoped : pourquoi une custom dimension GA4 n'est jamais rétroactive, et les limites de quota à anticiper."
publishedAt: 2026-09-06
status: published
categoryLabel: "GA4 & mesure produit"
type: "guide"
level: "avance"
tags: ["GA4", "custom dimensions", "custom metrics", "scope", "quota"]
hook: "Pourquoi un paramètre déjà présent dans le dataLayer depuis des mois peut rester invisible dans les rapports GA4 tant qu'il n'a pas été explicitement enregistré comme custom dimension — et pourquoi cet enregistrement ne récupère jamais l'historique déjà collecté."
sources:
  - label: "Google Analytics Help — Create and edit custom dimensions and metrics"
    url: "https://support.google.com/analytics/answer/10075209"
  - label: "Google — Measure ecommerce (Google Analytics 4)"
    url: "https://developers.google.com/analytics/devguides/collection/ga4/ecommerce"
  - label: "Google Analytics Help — BigQuery Export overview"
    url: "https://support.google.com/analytics/answer/9358801"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/ga4/audit-ga4"
  - "tracking/ga4/bigquery-export-ga4"
  - "tracking/datalayer/plan-de-marquage"
  - "tracking/datalayer/conventions-de-nommage"
---

## Le problème que ce guide résout

Un paramètre poussé dans un event dataLayer (`item_variant`, `user_tier`, `content_group`…) est reçu par GA4 dès le premier hit — mais il n'apparaît dans aucun rapport standard, aucun tableau, aucune exploration tant qu'il n'a pas été explicitement enregistré comme custom dimension ou custom metric dans l'Admin GA4. La confusion la plus fréquente en audit : "le paramètre est bien dans l'event, pourquoi rien ne s'affiche ?" La réponse est presque toujours la même — le paramètre existe côté collecte, mais n'a jamais été enregistré comme définition personnalisée côté propriété, ou l'a été trop tard pour couvrir la période analysée.

## La mécanique concrète

**Trois scopes distincts, trois usages.** GA4 distingue, dans la [définition des dimensions et metrics personnalisées de Google](https://support.google.com/analytics/answer/10075209), le scope **event** (la valeur du paramètre est propre à chaque event, ex. `page_type` sur `page_view`), le scope **user** (la valeur est attachée à l'utilisateur et persiste across sessions, portée via une user property plutôt qu'un paramètre d'event) et le scope **item** (la valeur est portée par une entrée du tableau `items[]` d'un event e-commerce, ex. un attribut produit custom, cohérent avec le schéma décrit dans le [guide officiel de mesure e-commerce GA4](https://developers.google.com/analytics/devguides/collection/ga4/ecommerce)). Enregistrer un paramètre event-scoped comme s'il était item-scoped (ou l'inverse) produit une dimension qui reste vide dans les rapports, alors que la donnée brute est bien présente côté collecte.

**L'enregistrement n'est jamais rétroactif.** Une custom dimension ou metric commence à peupler les rapports **à partir de la date de son enregistrement**, jamais avant — les events déjà collectés avant cette date, même s'ils portaient déjà le paramètre concerné, restent invisibles pour cette dimension dans les rapports standards et les explorations. La seule façon de retrouver cette donnée historique est de l'interroger directement dans le [BigQuery Export](/expertises/tracking/ga4/bigquery-export-ga4) — documenté par l'[aperçu du BigQuery Export de Google](https://support.google.com/analytics/answer/9358801) —, qui conserve chaque paramètre brut d'un event indépendamment de son statut d'enregistrement côté Admin.

**Un délai de propagation existe après l'enregistrement.** Après la création d'une nouvelle définition, un délai (de l'ordre de plusieurs heures) est nécessaire avant que la dimension commence effectivement à apparaître peuplée dans les rapports — une dimension qui semble "vide" dans l'heure qui suit sa création n'est pas nécessairement mal configurée, elle n'a simplement pas encore fini de se propager.

**Des quotas limitent le nombre de définitions par propriété.** GA4 impose un nombre maximal de custom dimensions et de custom metrics par propriété, différencié par scope (event, user, item), documenté par Google comme évolutif selon le type de propriété (standard vs GA4 360) — la limite précise doit être vérifiée dans l'Admin GA4 au moment de l'audit plutôt que supposée fixe, Google faisant évoluer ces quotas dans le temps. Ce plafond n'est pas théorique : une propriété qui accumule des définitions sans jamais en retirer d'obsolètes finit par bloquer l'enregistrement d'un paramètre réellement nécessaire.

## Pièges connus

- **Confondre "le paramètre est dans le dataLayer" et "le paramètre est exploitable en rapport".** Le premier se vérifie en DevTools ou GTM Preview mode, le second uniquement dans l'Admin GA4 (liste des définitions personnalisées) — les deux audits sont distincts et doivent être menés séparément.
- **Enregistrer une dimension des semaines après la mise en prod de l'event correspondant.** Toute la période antérieure à l'enregistrement reste durablement invisible dans les rapports standards, même si la donnée existe bel et bien côté collecte brute.
- **Choisir le mauvais scope au moment de l'enregistrement** (event-scoped pour un paramètre en réalité item-scoped, typiquement un attribut produit) — la dimension existe, apparaît dans la liste, mais reste vide en rapport parce qu'elle cherche la valeur au mauvais niveau de la structure d'event.
- **Saturer le quota de définitions avec des dimensions de test jamais nettoyées** — chaque expérimentation ou variante testée qui laisse une définition orpheline réduit la marge disponible pour un besoin business réel découvert plus tard.
- **Multiplier les custom dimensions pour un besoin d'analyse ad hoc ponctuel**, alors qu'une requête [BigQuery Export](/expertises/tracking/ga4/bigquery-export-ga4) sur le paramètre brut, déjà présent dans l'export sans enregistrement préalable requis, répond au même besoin sans consommer de quota ni attendre la propagation.

## Ce que Studio Jannah recommande

Enregistrer chaque custom dimension et metric prévue dès l'étape de définition du schéma d'événements dans le [plan de marquage](/expertises/tracking/datalayer/plan-de-marquage), pas après la mise en prod du paramètre côté dataLayer — l'écart entre les deux dates est exactement la période qui restera invisible en rapport. Réserver le BigQuery Export aux besoins d'analyse ponctuels ou rétroactifs sur un paramètre qui n'a pas vocation à être exploité en routine dans l'interface GA4, pour ne pas saturer un quota limité avec des définitions à usage unique. Auditer trimestriellement la liste des définitions personnalisées actives face à celles réellement utilisées dans des rapports ou des explorations, au même titre que le nettoyage périodique recommandé côté conteneur GTM.
