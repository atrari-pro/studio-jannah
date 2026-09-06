---
title: "Plan de marquage : la méthodologie de référence"
description: "8 étapes dans l'ordre d'exécution réel pour produire un plan de marquage exploitable — du cadrage business au versioning, avec l'attendu de chaque étape."
publishedAt: 2026-09-06
status: published
categoryLabel: "DataLayer"
type: "methodologie"
level: "avance"
tags: ["plan de marquage", "dataLayer", "GTM", "méthodologie", "gouvernance"]
hook: "Une méthodologie en 8 étapes, dans l'ordre où elles se jouent réellement sur une mission — chacune avec son livrable attendu, pas une liste de bonnes intentions."
sources:
  - label: "Google — Data Layer (Tag Manager Developer Guide)"
    url: "https://developers.google.com/tag-platform/tag-manager/datalayer"
  - label: "Simo Ahava — A Simple Guide to the Google Tag Manager Data Layer"
    url: "https://www.simoahava.com/analytics/data-layer/"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/datalayer/audit-datalayer"
  - "tracking/datalayer/conventions-de-nommage"
  - "tracking/datalayer/datalayer-ecommerce"
  - "tracking/datalayer/debug-datalayer"
---

## Ce que produit cette méthodologie

Un plan de marquage (PDM) est le document qui traduit une question business en implémentation technique : un event, ses paramètres, son déclencheur. Les 8 étapes ci-dessous suivent l'ordre réel constaté en mission (création, refonte, migration UA→GA4) — sauter une étape ou l'inverser est la cause la plus fréquente d'un PDM qui ne survit pas à sa première mise en prod.

Ce n'est pas un tableau Excel qu'on remplit une fois puis qu'on oublie : c'est le document de référence qui fait le pont entre une question business ("combien de leads viennent de la page tarifs ?") et une implémentation technique, sur une mission de création comme sur une reprise d'existant multi-marques.

## 1. Cadrage business

**Attendu : une liste de questions business traduites en indicateurs, validée par les parties prenantes métier (pas seulement par l'équipe tech).**

Avant tout schéma d'event, lister les décisions que le futur reporting doit permettre : suivre un funnel d'achat, mesurer l'impact d'un CTA, isoler la performance d'une nouvelle fonctionnalité. Une question business mal formulée ("on veut tout tracker") produit un PDM surdimensionné et inexploitable — chaque event doit répondre à une question précise, sinon il ne doit pas exister.

## 2. Inventaire de l'existant

**Attendu : un audit de ce qui est déjà poussé en prod (si migration ou refonte), avec un gap analysis entre l'existant et le cadrage business de l'étape 1.**

Sur une reprise d'existant, ouvrir les DevTools et le GTM Preview mode avant d'écrire la moindre ligne de spécification. L'objectif est de savoir ce qui fonctionne, ce qui est mort (event documenté mais jamais déclenché), et ce qui manque. Cette étape peut réutiliser directement la checklist d'audit dataLayer plutôt que de repartir de zéro.

## 3. Définition du schéma d'événements

**Attendu : un tableau event / déclencheur / paramètres / type / exemple de valeur, un event par ligne, aucune ambiguïté de nommage.**

C'est le cœur du PDM. Chaque event métier custom suit une convention de nommage stable (voir l'article dédié aux conventions de nommage), et chaque paramètre a un type explicite (string, number, boolean) et un exemple concret, sur le modèle de structure décrit dans la [documentation officielle Data Layer de Google](https://developers.google.com/tag-platform/tag-manager/datalayer). Les events standard GA4 (`page_view`, `purchase`…) gardent leur nom standard, non renommés — c'est un choix documenté, pas un oubli.

## 4. Définition des page types et de la taxonomie de contenu

**Attendu : une liste fermée de valeurs possibles pour `page_type` (et équivalents), pas une chaîne libre.**

`page_type` (ou toute variable de segmentation de contenu portée par `page_view`) doit avoir un nombre fini et documenté de valeurs possibles (`home`, `product`, `blog_hub`, `checkout`…). Une valeur libre, générée dynamiquement depuis un CMS sans validation, produit à terme des dizaines de variantes incohérentes en reporting.

## 5. Spécification technique

**Attendu : un document dev-ready qui précise, pour chaque event, le déclencheur exact (clic, chargement de page, changement d'état SPA), le timing, et les dépendances (le consentement doit-il être acquis avant ? un autre event doit-il être poussé avant ?).**

C'est l'étape où le PDM business devient exploitable par un développeur qui n'a pas participé au cadrage. Une spécification incomplète sur le timing (ex. "event poussé au clic" sans préciser si c'est avant ou après la navigation) est la cause la plus fréquente de events manquants en recette, particulièrement sur SPA où la page peut changer avant que l'event n'ait fini de partir — un piège de timing détaillé dans le [guide de Simo Ahava sur le dataLayer GTM](https://www.simoahava.com/analytics/data-layer/).

## 6. Validation croisée avec les développeurs

**Attendu : un sign-off technique explicite — chaque event est confirmé faisable tel que spécifié, ou renvoyé en étape 5 avec la contrainte technique qui bloque.**

Ne jamais considérer un PDM comme figé avant ce passage. Un event qui suppose une donnée non disponible côté front au moment du déclenchement (ex. un `item_id` qui n'existe qu'après un appel API asynchrone) doit être identifié ici, pas découvert en recette.

## 7. Implémentation et recette

**Attendu : chaque ligne du PDM cochée pass/fail, observée en GTM Preview mode et/ou DevTools, pas supposée fonctionnelle parce que le code a été livré.**

La recette suit la checklist d'audit dataLayer dédiée. Aucun event n'est considéré "en prod" tant qu'il n'a pas été observé réellement, avec ses paramètres attendus, dans l'environnement cible.

## 8. Documentation vivante et versioning

**Attendu : un document accessible à toute l'équipe (pas un fichier local), avec un numéro de version et un historique de changement à chaque évolution du schéma.**

Un PDM qui n'évolue pas devient obsolète au premier changement de site. La pratique de référence est un changelog daté par version (`schema_version`), qui documente précisément ce qui change, pourquoi, et ce qu'il faut vérifier côté conteneur GTM à chaque bascule — sur le principe illustré par le contrat dataLayer interne de Studio Jannah (`docs/TRACKING_DATALAYER.md`), qui journalise chaque révision (ajout, retrait ou renommage de clé) avec la justification et l'action GTM associée.

## Ce que Studio Jannah recommande

Les étapes 1 à 4 se jouent en atelier avec le métier, les étapes 5 à 7 avec la tech — mais aucune des deux ne doit être menée en silo complet : le sign-off de l'étape 6 échoue systématiquement quand le cadrage business n'a jamais consulté personne côté implémentation. L'étape 8 (documentation vivante) est celle qui distingue un PDM qui survit deux ans d'un PDM qu'on refait à zéro à chaque refonte : sans changelog versionné, aucune équipe qui reprend un tracking existant ne peut savoir avec certitude quelle version du schéma tourne réellement en prod.
