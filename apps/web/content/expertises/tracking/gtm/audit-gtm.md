---
title: "Audit GTM : structure conteneur, triggers, variables"
description: "Checklist pass/fail pour auditer un conteneur GTM : dossiers, variables, triggers, tags, consentement, versioning — hors contenu dataLayer."
publishedAt: 2026-09-06
status: published
categoryLabel: "GTM"
type: "audit"
level: "fondamentaux"
tags: ["GTM", "audit", "triggers", "variables", "QA"]
hook: "Une checklist à parcourir critère par critère pour auditer la configuration d'un conteneur GTM existant — pas le contenu du dataLayer qu'il lit, mais la façon dont le conteneur l'exploite : variables, triggers, tags, consentement, versioning."
sources:
  - label: "Google — Data Layer (Tag Manager Developer Guide)"
    url: "https://developers.google.com/tag-platform/tag-manager/datalayer"
  - label: "Google — Centre d'aide Tag Manager"
    url: "https://support.google.com/tagmanager/"
  - label: "Simo Ahava — A Simple Guide to the Google Tag Manager Data Layer"
    url: "https://www.simoahava.com/analytics/data-layer/"
  - label: "Google — Tag Assistant"
    url: "https://tagassistant.google.com/"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/gtm/architecture-conteneur"
  - "tracking/gtm/qa-de-tags"
  - "tracking/datalayer/audit-datalayer"
  - "tracking/datalayer/plan-de-marquage"
---

## Comment utiliser cette checklist

Cette checklist audite le **conteneur GTM lui-même** — sa structure, ses variables, ses triggers, ses tags — pas le contenu du dataLayer qu'il lit (voir l'[Audit DataLayer](/expertises/tracking/datalayer/audit-datalayer) dédié). Chaque ligne est un critère observable dans l'[interface GTM](https://support.google.com/tagmanager/) ou en [Tag Assistant](https://tagassistant.google.com/), pass ou fail, sans place pour l'à-peu-près. L'ordre suit celui d'un audit réel : organisation du conteneur, variables, triggers, tags, consentement, puis versioning.

## 1. Structure & organisation du conteneur

- [ ] **Les tags, triggers et variables sont rangés dans des dossiers (Folders) cohérents** — par fonctionnalité de site ou par plateforme de destination (GA4, Ads…), jamais une liste plate de dizaines d'éléments sans classement dès qu'un conteneur dépasse une taille triviale.
- [ ] **Un seul conteneur GTM couvre le périmètre du site**, sauf décision documentée de séparation (multi-domaines, multi-marques) — deux conteneurs qui portent silencieusement la même configuration dupliquée sont une dette, pas une architecture.
- [ ] **Le nom du workspace en cours reflète le changement en cours** (ex. `feat/sj-cta-click-v2`), pas un `Default Workspace` générique réutilisé indéfiniment par toute l'équipe pour des changements sans lien entre eux.
- [ ] **Aucun tag, trigger ou variable "orphelin"** (créé pour un test, jamais nettoyé, non rattaché à un tag actif) ne traîne dans le conteneur — un audit régulier retire ce qui n'est plus utilisé.

## 2. Variables

- [ ] **Les variables Data Layer déclarées dans GTM** (mécanisme documenté par la [Tag Manager Developer Guide de Google](https://developers.google.com/tag-platform/tag-manager/datalayer)) **matchent exactement les clés du dataLayer** — casse et orthographe strictement identiques (`page_type` ≠ `pageType`), sinon la variable renvoie silencieusement `undefined`, un piège documenté par le [guide de Simo Ahava sur le dataLayer GTM](https://www.simoahava.com/analytics/data-layer/).
- [ ] **Les identifiants sensibles (measurement ID GA4, container ID sGTM…) sont centralisés en variables Constant**, jamais recopiés en dur dans chaque tag — un changement d'ID ne doit se faire qu'à un seul endroit.
- [ ] **Les variables intégrées (Built-In Variables) activées correspondent à un usage réel** dans au moins un tag ou trigger — activer toutes les variables intégrées "au cas où" complexifie l'audit sans bénéfice.
- [ ] **Les Lookup Tables et Regex Tables sont documentées** (objet, valeurs attendues) plutôt que remplacées par des Custom JS Variables équivalentes mais illisibles pour qui reprend le conteneur.

## 3. Triggers

- [ ] **Le `page_view` standard GA4 a un trigger Custom Event dédié**, distinct du déclenchement automatique du tag de configuration GA4 — cohérent avec le contrat dataLayer interne (`docs/TRACKING_DATALAYER.md`), qui impose `page_view` en nom standard, jamais renommé.
- [ ] **Les events custom namespacés (`sj_*` ou équivalent) sont couverts par un trigger générique en expression régulière** (`sj_.*`) plutôt qu'un trigger dédié par event, sauf si un tag a besoin d'un filtre plus précis — un trigger par event multiplie la maintenance sans gain.
- [ ] **Aucun trigger "All Pages" ne déclenche un tag qui ne devrait s'exécuter que sur un sous-ensemble de pages** — vérifier qu'un tag scope à une section (ex. page produit) porte bien un trigger filtré, pas un trigger global compensé par une condition dans le tag.
- [ ] **Les exceptions de trigger (blocking triggers) sont documentées** — un tag qui ne se déclenche jamais sur une page donnée doit être un choix explicite, retrouvable dans la configuration, pas une anomalie découverte a posteriori.

## 4. Tags

- [ ] **Le tag de configuration GA4 a "Send a page view event when this configuration loads" désactivé** — sinon double comptage avec le `page_view` poussé explicitement par le dataLayer (point documenté dans `docs/TRACKING_DATALAYER.md`, révision 1.1.0).
- [ ] **Aucun doublon de tag n'envoie le même event vers la même destination** — un tag GA4 Event dupliqué par erreur (copié-collé non nettoyé) gonfle silencieusement les métriques de volume.
- [ ] **La convention de nommage des tags identifie la plateforme et l'objet** (ex. `GA4 - Event - CTA Click`) — un nom générique (`Tag 12`, `nouveau tag`) rend l'audit et la passation impossibles sans ouvrir chaque tag un par un.
- [ ] **Aucun tag de mesure ne se déclenche sur les pushes internes de type `Arguments`** (mécanisme Consent Mode gtag) — ces pushes ne sont pas des events métier et ne doivent jamais servir de déclencheur de tag, conformément au contrat dataLayer interne.

## 5. Consentement

- [ ] **Le Consent Mode par défaut est réglé sur refus (`denied`)** avant tout chargement de tag de mesure, vérifiable en navigation privée sans cookie de consentement préalable.
- [ ] **Les tags qui nécessitent `analytics_storage` portent bien les Additional Consent Checks correspondants** dans GTM, pas seulement une dépendance implicite au trigger de consentement.
- [ ] **Le Consent Overview (dans l'admin GTM) ne remonte aucun tag "sans vérification de consentement" qui devrait en avoir une** — un tag de mesure listé sans check de consentement est un signal d'audit à traiter avant publication.

## 6. Versioning & accès

- [ ] **Chaque publication de version porte une description explicite** (quoi, pourquoi) — un historique de versions avec des descriptions vides interdit tout rollback informé en cas de régression.
- [ ] **Les rôles d'accès séparent Lecture / Édition / Publication**, avec la publication restreinte à un nombre limité de personnes — un accès Publish trop large multiplie le risque de mise en prod non recettée.
- [ ] **Un environnement de test distinct de Live existe** pour recetter une nouvelle version avant sa publication en production, plutôt que de tester directement sur le conteneur live.

## Ce que Studio Jannah recommande

Cette checklist se rejoue avant toute publication de conteneur qui touche triggers ou tags (pas uniquement les grosses refontes), et en routine trimestrielle pour détecter la dette accumulée (tags orphelins, doublons, exceptions non documentées). Elle se combine avec l'[Audit DataLayer](/expertises/tracking/datalayer/audit-datalayer) — l'un valide ce qui est poussé, l'autre valide ce que le conteneur en fait — et précède la recette comportementale détaillée dans [QA de tags GTM](/expertises/tracking/gtm/qa-de-tags).
