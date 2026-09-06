---
title: "Checklist de recette avant mise en production"
description: "Assurez la fiabilité de votre tracking avant le déploiement. Cette checklist couvre GTM, Data Layer, GA4, Consent Mode et sGTM pour une mise en production sereine."
publishedAt: 2026-09-06
status: published
categoryLabel: "QA & fiabilité"
type: "checklist"
level: "fondamentaux"
tags: ["QA", "Tracking", "GTM", "GA4", "Data Layer", "Consent Mode", "Server-Side Tagging", "Recette"]
hook: "Appliquez cette checklist de recette pour garantir l'exactitude et la conformité de vos données de tracking avant chaque mise en production."
sources:
  - label: "Google Developers - Data Layer"
    url: "https://developers.google.com/tag-platform/tag-manager/datalayer"
  - label: "Google Analytics 4 - DebugView"
    url: "https://support.google.com/analytics/answer/7201382"
  - label: "Google Tag Platform - Consent Mode v2"
    url: "https://developers.google.com/tag-platform/security/guides/consent"
  - label: "CNIL - Cookies et autres traceurs"
    url: "https://www.cnil.fr/fr/cookies-et-autres-traceurs"
  - label: "Google Tag Manager - Server-side Tagging Overview"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side"
relatedInsights: []
relatedUseCases: []
relatedExpertises: 
  - "tracking/qa/methodologie-qa-tracking"
  - "tracking/datalayer/audit-datalayer"
  - "tracking/consentement/qa-consentement"
  - "tracking/gtm/audit-gtm"
---

La phase de recette avant une mise en production est cruciale pour garantir l'intégrité et la conformité de vos données de tracking. Une validation rigoureuse permet d'éviter les erreurs coûteuses, d'assurer la fiabilité des rapports et de maintenir la confiance dans vos insights. Cette checklist fournit un cadre structuré pour une vérification exhaustive de votre implémentation.

## Configuration du conteneur GTM
*   **Le snippet GTM est correctement implémenté** sur toutes les pages, idéalement juste après la balise `<head>` d'ouverture.
*   **Les environnements GTM (Production, Staging, Dev)** sont configurés et utilisés de manière appropriée pour les tests.
*   **Les conventions de nommage** pour les variables, déclencheurs et balises sont respectées et cohérentes.
*   **Les variables intégrées de GTM** sont utilisées lorsque pertinent pour simplifier la gestion.
*   **Les éléments inutilisés (variables, déclencheurs, balises)** sont supprimés ou archivés pour maintenir la propreté du conteneur.
*   **Le processus de publication** (versions, notes de version) est documenté et suivi.

## Implémentation du Data Layer
*   **Le `dataLayer` est initialisé** avant le chargement du conteneur GTM sur toutes les pages.
*   **Tous les événements requis** (ex: `page_view`, événements métier `sj_*`) sont poussés au `dataLayer`.
*   **Les événements métier custom** respectent la structure de base `event_id` (unique), `event_ts` (epoch ms) et `schema_version`.
*   **Les événements GA4 standards** (`view_item`, `add_to_cart`, `purchase`, etc.) sont correctement implémentés avec tous les paramètres requis (ex: `items` pour l'e-commerce).
*   **Les paramètres spécifiques** pour les dimensions et métriques personnalisées sont correctement poussés.
*   **Aucune donnée personnelle identifiable (PII)** n'est transmise au `dataLayer` sans anonymisation ou consentement explicite et conforme.
*   **La convention de nommage `zone_objet_action`** est appliquée pour le tracking des CTA via des attributs `data-track-cta`.
*   **Les champs `brand`, `surface`, `content_group`, `consent_analytics`** ne sont plus présents, conformément au contrat dataLayer v1.3.0 de Studio Jannah.
*   **Le `dataLayer` est validé** à l'aide de l'extension Google Tag Assistant ou de la console développeur pour s'assurer que les données sont poussées correctement et au bon moment. Pour une vérification approfondie, consultez notre expertise sur la [réalisation d'un audit de Data Layer](/expertises/tracking/datalayer/audit-datalayer).
*   Pour plus de détails sur les bonnes pratiques, référez-vous à la documentation officielle de [Google Developers sur le Data Layer](https://developers.google.com/tag-platform/tag-manager/datalayer).

## Tagging et configuration GA4
*   **La balise de configuration GA4** se déclenche sur toutes les pages, avec `send_page_view` défini sur `false` si l'événement `page_view` est explicitement poussé via le `dataLayer`.
*   **Tous les événements personnalisés** (custom events) sont déclenchés correctement avec les paramètres attendus.
*   **La mesure améliorée (Enhanced Measurement)** est configurée comme prévu ou désactivée si des événements personnalisés sont utilisés pour éviter la duplication.
*   **Les dimensions et métriques personnalisées** sont correctement mappées dans l'interface GA4 et reçoivent les données attendues.
*   **Le [DebugView de Google Analytics 4](https://support.google.com/analytics/answer/7201382)** est utilisé pour valider le flux de données en temps réel.
*   Pour une analyse complète, n'hésitez pas à consulter notre guide sur l'[audit GA4](/expertises/tracking/ga4/audit-ga4).

## Gestion du consentement et Consent Mode
*   **La CMP (Consent Management Platform)** se charge avant le conteneur GTM pour garantir la collecte du consentement dès le début.
*   **Le statut du consentement** est poussé au `dataLayer` par catégorie (ex: `consent_status_analytics`, `consent_status_ad_storage`).
*   **Le Consent Mode v2 de Google** est correctement implémenté, avec les paramètres `ad_storage`, `analytics_storage`, `functionality_storage`, `personalization_storage`, `security_storage` définis.
*   **Un statut de consentement par défaut** est configuré et mis à jour dynamiquement en fonction des choix de l'utilisateur.
*   **Les balises GTM respectent les signaux de consentement** et ne se déclenchent que lorsque les catégories de consentement requises sont accordées.
*   **Les triggers de consentement** (`first_choice`, `revisit`, `panel_update`) sont correctement gérés.
*   Pour une implémentation conforme, consultez la documentation de [Google Tag Platform sur le Consent Mode v2](https://developers.google.com/tag-platform/security/guides/consent) et les recommandations de la [CNIL sur les cookies et traceurs](https://www.cnil.fr/fr/cookies-et-autres-traceurs).
*   Notre expertise sur la [QA du consentement](/expertises/tracking/consentement/qa-consentement) offre des pistes supplémentaires.

## Server-Side Tagging (si applicable)
*   **Le conteneur sGTM** est déployé et accessible via un endpoint de tracking personnalisé (ex: `stats.votredomaine.com`).
*   **Le GTM client-side** envoie correctement les requêtes au conteneur sGTM.
*   **Les clients sGTM** (ex: GA4 Client) sont configurés pour interpréter les requêtes entrantes.
*   **Les balises sGTM** (ex: GA4, Google Ads) se déclenchent correctement et transmettent les données aux destinations finales.
*   **Les règles de transformation de données** sont appliquées comme prévu pour nettoyer ou enrichir les informations.
*   **Un système de monitoring** est en place pour surveiller la santé et les performances du sGTM.
*   Pour une vue d'ensemble, consultez le [Server-side Tagging Overview de Google Tag Manager](https://developers.google.com/tag-platform/tag-manager/server-side).
*   Nous détaillons l'audit de ce type d'architecture dans notre expertise sur l'[audit sGTM](/expertises/tracking/server-side/audit-sgtm).

## Compatibilité inter-navigateurs et inter-appareils
*   **Le tracking est testé** sur les principaux navigateurs (Chrome, Firefox, Safari, Edge) et leurs versions récentes.
*   **La collecte de données est validée** sur différents types d'appareils (desktop, mobile, tablette) et systèmes d'exploitation.
*   **Le design responsive** du site n'impacte pas négativement l'implémentation du tracking.

## Performance et sécurité
*   **Le nombre de requêtes réseau** générées par le tracking est optimisé pour minimiser l'impact sur les performances du site.
*   **La taille du conteneur GTM** est maintenue à un niveau raisonnable.
*   **Aucune PII** n'est collectée par inadvertance ou de manière non conforme.
*   **Les en-têtes de sécurité** (CSP, HSTS) sont correctement configurés pour l'endpoint sGTM (si utilisé).

## Ce que Studio Jannah recommande
Studio Jannah insiste sur l'importance d'une méthodologie de QA robuste et continue. Au-delà de cette checklist ponctuelle, nous préconisons l'établissement d'un [plan de marquage](/expertises/tracking/datalayer/plan-de-marquage) détaillé, une documentation vivante du `dataLayer`, et l'intégration de la QA à chaque étape du cycle de développement. Une [méthodologie de QA tracking](/expertises/tracking/qa/methodologie-qa-tracking) proactive est la clé pour des données fiables et exploitables sur le long terme.
