---
title: "Event Match Quality (EMQ) : audit et amélioration"
description: "Guide d'audit détaillé pour évaluer et améliorer l'Event Match Quality (EMQ) de vos événements Meta."
publishedAt: 2026-09-07
status: published
categoryLabel: "Meta Ads"
type: "audit"
level: "avance"
tags: ["Meta Ads", "EMQ", "Qualité des données", "Tracking", "Audit"]
hook: "Auditez et optimisez l'Event Match Quality (EMQ) de vos données Meta pour maximiser la performance de vos campagnes publicitaires."
sources:
  - label: "Améliorer la qualité de la correspondance des événements"
    url: "https://www.facebook.com/business/help/765081237991954"
  - label: "À propos de l’API Conversions"
    url: "https://www.facebook.com/business/help/2041148702652965"
  - label: "Hacher les données client pour l’API Conversions"
    url: "https://www.facebook.com/business/help/112061095610075"
relatedInsights: []
relatedUseCases: []
relatedExpertises: 
  - "marketing/meta-ads/capi-setup"
  - "marketing/google-ads/enhanced-conversions"
  - "tracking/datalayer/audit-datalayer"
  - "tracking/qa/checklist-recette-prod"
---

L'Event Match Quality (EMQ) est un indicateur clé de la précision avec laquelle Meta peut attribuer les conversions à vos publicités. Un EMQ élevé signifie que Meta reçoit suffisamment d'informations pour faire correspondre les événements de conversion avec les utilisateurs exposés à vos campagnes. Un audit régulier est essentiel pour maintenir et améliorer ce score, garantissant une meilleure optimisation et attribution.

## Audit de l'implémentation de la Conversions API (CAPI)

*   - [ ] **La CAPI est-elle implémentée et active ?** : Vérifier la présence et l'activité de la Conversions API dans le Gestionnaire d'Événements Meta, comme décrit dans la documentation [À propos de l’API Conversions](https://www.facebook.com/business/help/2041148702652965).
*   - [ ] **La déduplication des événements est-elle correcte ?** : Chaque événement envoyé via la CAPI et le Pixel Meta doit avoir un `event_id` unique et identique pour éviter le double comptage. Vérifier le paramètre `event_id` et la logique de déduplication dans le Gestionnaire d'Événements.
*   - [ ] **Les événements CAPI sont-ils envoyés en temps réel ?** : La latence entre l'événement sur le site et l'envoi via CAPI doit être minimale pour une attribution précise.
*   - [ ] **Le `pixel_id` est-il correctement configuré ?** : S'assurer que le bon `pixel_id` est associé aux événements CAPI pour le bon compte publicitaire.

## Audit des paramètres `user_data`

*   - [ ] **L'adresse e-mail hachée (`em`) est-elle envoyée ?** : Vérifier que l'adresse e-mail de l'utilisateur est collectée, hachée en SHA256, et transmise pour tous les événements pertinents (ex: `Purchase`, `Lead`, `CompleteRegistration). La méthode de hachage est détaillée [ici](https://www.facebook.com/business/help/112061095610075).
*   - [ ] **Le numéro de téléphone haché (`ph`) est-il envoyé ?** : Vérifier que le numéro de téléphone est collecté, formaté (E.164), haché en SHA256, et transmis.
*   - [ ] **Le prénom haché (`fn`) et le nom haché (`ln`) sont-ils envoyés ?** : Vérifier la collecte, le hachage SHA256 et la transmission de ces informations.
*   - [ ] **L'adresse IP (`fbc` / `fbp` ou `client_ip_address`) est-elle envoyée ?** : S'assurer que l'adresse IP de l'utilisateur est transmise (si le consentement le permet) pour aider à l'identification.
*   - [ ] **Le user agent (`client_user_agent`) est-il envoyé ?** : Vérifier la transmission du user agent du navigateur de l'utilisateur.
*   - [ ] **Les autres données d'adresse (`ct`, `st`, `zp`, `country`) sont-elles envoyées ?** : Vérifier la collecte et la transmission de la ville, de l'état/région, du code postal et du pays, lorsque disponibles.
*   - [ ] **Toutes les données `user_data` sont-elles hachées en SHA256 ?** : Confirmer que toutes les informations personnelles identifiables (PII) sont correctement hachées avant l'envoi à Meta, comme recommandé pour [améliorer la qualité de la correspondance des événements](https://www.facebook.com/business/help/765081237991954).

## Audit des paramètres `custom_data` et `event_id`

*   - [ ] **Le `value` et `currency` sont-ils envoyés pour les événements de valeur ?** : Pour les événements comme `Purchase`, vérifier que la valeur de la conversion et la devise sont transmises.
*   - [ ] **Les `content_ids` et `content_type` sont-ils envoyés pour les événements e-commerce ?** : S'assurer que les identifiants de produits et le type de contenu (ex: `product`, `product_group`) sont transmis pour les événements `AddToCart`, `ViewContent`, `Purchase`.
*   - [ ] **Un `event_id` unique est-il généré pour chaque événement ?** : Confirmer que chaque événement possède un identifiant unique pour la déduplication et le suivi.
*   - [ ] **Les noms d'événements sont-ils conformes aux standards Meta ?** : Utiliser les noms d'événements standards de Meta (ex: `PageView`, `AddToCart`, `Purchase`) et des noms personnalisés clairs si nécessaire.

## Audit du consentement et de la conformité

*   - [ ] **Le consentement est-il géré pour l'envoi des données CAPI ?** : Vérifier que l'envoi des données `user_data` via la CAPI est conditionné par le consentement de l'utilisateur, conformément au RGPD et autres réglementations.
*   - [ ] **Le `Consent Mode` est-il intégré (si applicable) ?** : Si Google Consent Mode est utilisé, vérifier son intégration pour gérer le comportement de la CAPI en fonction du consentement.

## Audit de la qualité des données du dataLayer

*   - [ ] **Le dataLayer fournit-il toutes les informations nécessaires ?** : Vérifier que le [plan de marquage](/expertises/tracking/datalayer/plan-de-marquage) et l'implémentation du dataLayer fournissent tous les paramètres requis pour l'EMQ.
*   - [ ] **La qualité des données du dataLayer est-elle fiable ?** : Mettre en place des contrôles qualité pour s'assurer que les valeurs des paramètres (email, téléphone, ID produit) sont propres et correctement formatées.

## Ce que Studio Jannah recommande :

*   **Prioriser l'envoi de `user_data` hachées** : Concentrez-vous sur la collecte et l'envoi des adresses e-mail et numéros de téléphone hachés, car ce sont les paramètres les plus impactants pour l'EMQ.
*   **Utiliser un `event_id` unique et persistant** : Assurez-vous que l'`event_id` est unique pour chaque événement et qu'il est utilisé de manière cohérente par le pixel et la CAPI pour une déduplication parfaite.
*   **Implémenter via GTM Server-side** : Le [setup de la CAPI via GTM Server-side](/expertises/marketing/meta-ads/capi-setup) offre un contrôle accru sur la transformation et l'envoi des données, y compris le hachage.
*   **Vérifier régulièrement le score EMQ** : Utilisez l'outil "Event Match Quality" dans le Gestionnaire d'Événements de Meta pour suivre l'évolution de votre score et identifier les opportunités d'amélioration.
*   **Documenter les mappings** : Maintenez une documentation claire des mappings entre les données de votre dataLayer et les paramètres envoyés à Meta pour faciliter la maintenance et le débogage.
*   **Respecter le consentement** : Intégrez toujours la gestion du consentement dans votre stratégie d'envoi de données, en vous assurant que seules les données consenties sont utilisées pour l'amélioration de l'EMQ.
