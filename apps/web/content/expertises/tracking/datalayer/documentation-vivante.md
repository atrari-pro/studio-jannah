---
title: "Documentation vivante du DataLayer : versioning et changelog"
description: "Méthodologie en 7 étapes pour maintenir un contrat dataLayer à jour : versioning sémantique, changelog daté, fenêtre de dépréciation, audit périodique."
publishedAt: 2026-09-06
status: published
categoryLabel: "DataLayer"
type: "methodologie"
level: "avance"
tags: ["dataLayer", "changelog", "versioning", "documentation", "gouvernance"]
hook: "Une méthodologie en 7 étapes pour qu'un contrat dataLayer reste exploitable deux ans après sa création — pas un fichier qu'on écrit une fois et qui dérive silencieusement de la prod."
sources:
  - label: "Keep a Changelog"
    url: "https://keepachangelog.com/en/1.1.0/"
  - label: "Semantic Versioning 2.0.0"
    url: "https://semver.org/"
  - label: "Google — Data Layer (Tag Manager Developer Guide)"
    url: "https://developers.google.com/tag-platform/tag-manager/datalayer"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/datalayer/plan-de-marquage"
  - "tracking/datalayer/audit-datalayer"
  - "tracking/datalayer/migration-datalayer"
  - "tracking/datalayer/datalayer-spa"
---

## Ce que produit cette méthodologie

Un plan de marquage documente le contrat au moment où il est écrit. Une documentation vivante fait autre chose : elle permet, un an ou deux plus tard, de savoir avec certitude quelle version du schéma tourne en prod, et pourquoi elle a changé. Sans ce mécanisme, la doc et la prod divergent en silence — chaque refonte, chaque ajout d'event creuse l'écart, jusqu'à ce que plus personne ne sache ce qui est vrai. Les 7 étapes ci-dessous cadrent ce mécanisme.

## 1. Choisir une convention de versioning explicite

**Attendu : une règle documentée de ce qui déclenche chaque niveau de version, avant le premier changement de schéma.**

Le principe du [versioning sémantique](https://semver.org/) (MAJOR.MINOR.PATCH), pensé pour les API logicielles, s'applique directement à un contrat dataLayer : MAJOR pour tout changement cassant (clé retirée ou renommée sans rétrocompatibilité), MINOR pour un ajout non cassant (nouvel event, nouvelle clé optionnelle qui n'affecte pas l'existant), PATCH pour une correction d'implémentation qui ne change pas le contrat lui-même. Sans cette règle posée à l'avance, chaque équipe interprète différemment ce qui justifie un changement de version — et `schema_version` perd toute utilité comme signal.

## 2. Choisir un emplacement unique, accessible à toute l'équipe

**Attendu : un seul document faisant autorité, versionné avec le code (pas un fichier local ni une copie wiki qui prend du retard).**

Un contrat dataLayer dupliqué (une version dans un wiki, une autre dans un fichier local d'un ancien contributeur) produit inévitablement deux vérités concurrentes. Le document doit vivre au même endroit que le code qui l'implémente, avec le même historique de versions — c'est la seule façon de garantir qu'une modification du contrat et une modification du code restent visibles côte à côte.

## 3. Documenter l'état courant avant de documenter les changements

**Attendu : une section "contrat actuel" (hit type, table des events) qui reflète l'état présent, distincte du changelog qui raconte l'historique.**

Le changelog explique comment on est arrivé là ; il ne remplace pas la description de l'état présent. Un nouveau contributeur qui doit comprendre le dataLayer aujourd'hui ne devrait pas avoir à reconstituer l'état courant en lisant quinze entrées de changelog dans l'ordre — la structure recommandée par la [documentation officielle Data Layer de Google](https://developers.google.com/tag-platform/tag-manager/datalayer) (hit type, schéma commun, liste des events) sert de socle, le changelog vient en complément.

## 4. Journaliser chaque changement au format changelog daté

**Attendu : chaque entrée porte une date, une version, ce qui change, pourquoi, et l'action à mener côté conteneur GTM.**

Le format popularisé par [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) (catégories Added / Changed / Removed / Deprecated, une entrée par version, la plus récente en premier) s'adapte directement à un contrat dataLayer : chaque révision documente ce qui a été ajouté, modifié ou retiré, la raison business ou technique du changement, et — spécificité tracking — l'action à mener côté conteneur GTM (nouvelle variable à créer, variable à nettoyer, trigger à mettre à jour). Une entrée de changelog sans cette dernière colonne oblige chaque personne qui la lit à redéduire elle-même l'impact GTM.

## 5. Distinguer ajout, retrait et renommage — chacun sa procédure

**Attendu : une checklist différente selon le type de changement, pas un traitement uniforme.**

- **Ajout (MINOR, non cassant)** : documenter la nouvelle clé/event, créer la variable GTM correspondante si elle doit être exploitée — aucune action urgente côté existant.
- **Retrait (MAJOR, cassant)** : lister au préalable toutes les variables GTM qui lisent la clé avant de la retirer côté site — sinon la variable continue de vivre dans le conteneur, silencieusement vide, sans jamais remonter d'erreur.
- **Renommage (MAJOR, cassant — équivalent d'un retrait + un ajout)** : documenter explicitement l'ancien et le nouveau nom en parallèle pendant la fenêtre de bascule si les deux doivent coexister un temps.

## 6. Prévoir une fenêtre de dépréciation avant suppression définitive

**Attendu : un délai documenté et communiqué entre l'annonce du retrait et sa suppression effective — jamais une suppression du jour au lendemain sur une clé encore lue en prod.**

Une clé marquée "Deprecated" dans le changelog, avec une date de suppression effective annoncée à l'avance, laisse le temps à l'équipe GTM de migrer ou nettoyer les variables concernées. Retirer une clé sans préavis transforme un changement planifié en incident découvert a posteriori, en audit ou pire, en reporting silencieusement dégradé.

## 7. Auditer périodiquement que la doc reflète la réalité prod

**Attendu : la checklist d'audit dataLayer rejouée face au changelog en vigueur, à intervalle régulier — pas seulement au moment d'un changement volontaire.**

Toute divergence entre ce que le document annonce comme actif et ce qui est réellement observé en DevTools ou GTM Preview mode est un signal d'alerte, dans un sens comme dans l'autre : soit un changement a été fait en prod sans passer par le changelog, soit une suppression documentée n'a jamais été réellement appliquée côté code.

## Ce que Studio Jannah recommande

Traiter le changelog comme un artefact de production, pas comme une note de bas de page du plan de marquage. Le contrat dataLayer interne de Studio Jannah (`docs/TRACKING_DATALAYER.md`) suit ce principe : chaque révision journalise précisément ce qui a été retiré ou ajouté, la justification, et l'action GTM associée — au point qu'un renommage de cookie CMP fait quatre versions plus tôt reste traçable et compréhensible sans avoir à interroger qui que ce soit. C'est ce critère — "un nouveau contributeur comprend l'historique sans poser de question" — qui distingue une documentation vivante d'un fichier qu'on met à jour de mémoire.
