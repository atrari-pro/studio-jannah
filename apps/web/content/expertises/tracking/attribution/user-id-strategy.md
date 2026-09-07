---
title: "User-ID strategy : stratégie d'identifiant utilisateur"
description: "Guide complet sur la stratégie User-ID pour une mesure unifiée et déterministe des utilisateurs dans Google Analytics 4, optimisant l'attribution et la personnalisation."
publishedAt: 2026-09-06
status: published
categoryLabel: "Attribution & identité"
type: "guide"
level: "avance"
tags: ["tracking", "attribution", "identite", "ga4", "user-id", "datalayer", "gtm"]
hook: "Mettez en place une stratégie User-ID robuste pour obtenir une vue unifiée et précise du parcours de vos utilisateurs sur tous les appareils dans GA4."
sources:
  - label: "À propos de l'identité des utilisateurs dans Google Analytics 4"
    url: "https://support.google.com/analytics/answer/10976610"
  - label: "Measure activity across platforms with User-ID (config + règles PII)"
    url: "https://support.google.com/analytics/answer/9213390"
  - label: "Guide du développeur Google Tag Manager"
    url: "https://developers.google.com/tag-manager/devguide"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/ga4/audit-ga4"
  - "tracking/datalayer/plan-de-marquage"
  - "tracking/consentement/consent-mode-basique-avance"
  - "tracking/gtm/audit-gtm"
---

Une stratégie User-ID permet de relier les interactions d'un même utilisateur à travers différents appareils et sessions, offrant une vue unifiée et déterministe de son parcours. Essentielle pour une mesure précise dans GA4, elle améliore l'attribution, le comptage des utilisateurs uniques et la personnalisation, en surmontant les limites des identifiants basés sur les cookies. Elle est la pierre angulaire d'une analyse client centrée sur l'utilisateur.

## Contexte du problème : Pourquoi une stratégie User-ID est essentielle

Dans un écosystème digital où les utilisateurs interagissent avec une marque via de multiples points de contact (web, mobile, applications, etc.) et sur différents appareils, les identifiants basés sur les cookies tiers ou les Device IDs (ID d'appareil) seuls ne suffisent plus. Ces identifiants sont souvent fragmentés, éphémères et limités à un seul navigateur ou appareil, rendant impossible une vision cohérente du parcours client. La disparition progressive des cookies tiers et les restrictions croissantes en matière de confidentialité accentuent cette problématique.

Google Analytics 4 (GA4) a été conçu pour une mesure centrée sur l'utilisateur, et la stratégie User-ID est le fondement le plus robuste de son modèle d'identité. Elle permet de consolider les données d'un même utilisateur, qu'il navigue sur son smartphone, sa tablette ou son ordinateur, et ce, sur de longues périodes. Cela est crucial pour :

*   **Comptage précis des utilisateurs uniques** : Éviter de compter un même utilisateur plusieurs fois s'il change d'appareil.
*   **Analyse du parcours client** : Comprendre les chemins complexes que les utilisateurs empruntent avant une conversion.
*   **Attribution améliorée** : Allouer correctement le crédit aux points de contact qui ont influencé la conversion.
*   **Personnalisation** : Offrir des expériences plus pertinentes basées sur l'historique complet de l'utilisateur.

GA4 utilise un ordre de résolution d'identité pour déterminer comment les données sont associées à un utilisateur. Le User-ID est la première et la plus fiable de ces méthodes, suivie par Google Signals, puis le Device ID, et enfin la modélisation. Une stratégie User-ID bien implémentée garantit que vous tirez le meilleur parti de ce modèle d'identité, comme expliqué dans la documentation [À propos de l'identité des utilisateurs dans Google Analytics 4](https://support.google.com/analytics/answer/10976610).

## Mécanique concrète : Implémentation du User-ID

L'implémentation d'une stratégie User-ID repose sur la capacité à générer un identifiant unique, persistant et non personnellement identifiable (non-PII) pour chaque utilisateur authentifié, puis à le transmettre systématiquement à Google Analytics 4.

### 1. Génération du User-ID

Le User-ID doit être généré côté serveur, généralement après qu'un utilisateur se soit authentifié sur votre plateforme (connexion, inscription). Cet identifiant doit respecter plusieurs critères :

*   **Unique** : Chaque utilisateur doit avoir un User-ID distinct.
*   **Persistant** : Le même User-ID doit être attribué à un utilisateur à chaque fois qu'il se connecte, quel que soit l'appareil.
*   **Non-PII** : Il est impératif que le User-ID ne contienne aucune information permettant d'identifier directement une personne (nom, email, numéro de téléphone, etc.). Il doit s'agir d'un identifiant interne et anonyme, conformément aux exigences de [Confidentialité des données dans Google Analytics](https://support.google.com/analytics/answer/9213390).

### 2. Transmission du User-ID via le dataLayer

Une fois généré, le User-ID doit être poussé dans le dataLayer de la page. Cela doit se faire sur toutes les pages où l'utilisateur est authentifié, idéalement avant le chargement du conteneur Google Tag Manager (GTM) ou au minimum dès que l'information est disponible. Voici un exemple de code à placer sur la page :

```javascript
dataLayer.push({
  'user_id': 'USER_ID_VALUE' // Remplacez par l'identifiant unique de l'utilisateur
});
```

Il est crucial que ce `dataLayer.push` soit exécuté de manière cohérente sur toutes les pages et pour toutes les interactions pertinentes de l'utilisateur authentifié. Pour plus de détails sur la structure du dataLayer, consultez notre expertise sur le [plan de marquage](/expertises/tracking/datalayer/plan-de-marquage).

### 3. Récupération et envoi à GA4 via GTM

Google Tag Manager est l'outil idéal pour récupérer le User-ID du dataLayer et le transmettre à GA4. Suivez ces étapes :

*   **Créer une variable de couche de données (Data Layer Variable)** : Dans GTM, créez une nouvelle variable de type "Variable de couche de données" et nommez-la `user_id` (en respectant la casse exacte utilisée dans le `dataLayer.push`). Référez-vous au [Guide du développeur Google Tag Manager](https://developers.google.com/tag-manager/devguide) pour la création de variables.
*   **Ajouter le User-ID au tag de configuration GA4** : Dans votre tag de configuration Google Analytics 4 (GA4 Configuration Tag), ajoutez un champ à définir (Field to Set). Le nom du champ doit être `user_id` et sa valeur doit être la variable de couche de données `{{user_id}}` que vous venez de créer.

En procédant ainsi, chaque hit envoyé à GA4 (page_view, events custom `sj_*`, etc.) inclura le User-ID lorsque celui-ci est disponible dans le dataLayer. La documentation officielle de Google explique comment [Collecter des User-ID pour Google Analytics 4](https://support.google.com/analytics/answer/9213390).

### 4. Intégration avec le Consent Mode

Le User-ID étant un identifiant persistant, son envoi à GA4 doit être conditionné par le consentement de l'utilisateur, notamment pour la catégorie "analytics" ou équivalente. Assurez-vous que le `dataLayer.push` du `user_id` et l'envoi du tag GA4 ne se déclenchent que lorsque le consentement approprié est donné. Le [Consent Mode](/expertises/tracking/consentement/consent-mode-basique-avance) de Google est un mécanisme essentiel pour gérer cette conformité.

## Pièges connus et erreurs courantes

Une implémentation défaillante du User-ID peut entraîner des données erronées et fausser vos analyses. Voici les pièges les plus fréquents :

*   **Utiliser des PII comme User-ID** : Envoyer des informations personnelles identifiables (email, nom) comme User-ID est une violation des conditions d'utilisation de Google Analytics et des réglementations comme le RGPD. Le User-ID doit être un identifiant interne et anonyme.
*   **User-ID non persistant ou non unique** : Si le User-ID change pour le même utilisateur ou si plusieurs utilisateurs partagent le même ID, vos données seront incohérentes et inutilisables pour l'analyse cross-device.
*   **Envoi du User-ID avant le consentement** : Transmettre le User-ID sans le consentement explicite de l'utilisateur pour le tracking analytique est une non-conformité majeure.
*   **User-ID manquant sur certains hits** : Si le User-ID n'est pas envoyé sur tous les hits (notamment les `page_view` après connexion ou certains événements clés), le parcours utilisateur sera fragmenté et les bénéfices du User-ID seront perdus.
*   **Dépendance exclusive au User-ID** : Bien que puissant, le User-ID ne couvre que les utilisateurs authentifiés. Il est important de comprendre que GA4 utilise d'autres méthodes d'identification pour les utilisateurs non connectés. Ne pas considérer ces autres signaux peut donner une vue incomplète.
*   **Mauvaise configuration GTM** : Une variable de dataLayer mal nommée, un champ `user_id` oublié dans le tag de configuration GA4, ou des déclencheurs incorrects peuvent empêcher l'envoi correct du User-ID.
*   **Absence de QA rigoureux** : Sans une phase de recette approfondie, il est difficile de détecter les incohérences dans l'envoi du User-ID. Un [audit GTM](/expertises/tracking/gtm/audit-gtm) peut révéler ces erreurs.

## Ce que Studio Jannah recommande

Pour une stratégie User-ID efficace et conforme, Studio Jannah préconise une approche méthodique et rigoureuse :

*   **Conception d'un User-ID robuste** :
    *   **Génération côté serveur** : Assurez-vous que le User-ID est généré par votre backend dès l'authentification de l'utilisateur.
    *   **Non-PII** : L'identifiant doit être un hash ou un ID interne, sans aucune donnée personnelle identifiable.
    *   **Unicité et persistance** : Chaque utilisateur doit avoir un ID unique qui ne change jamais, même sur différents appareils ou sessions.
*   **Implémentation dataLayer systématique** :
    *   **Push conditionnel** : Le `dataLayer.push({'user_id': '...'});` doit être exécuté sur chaque page où l'utilisateur est authentifié, et seulement après que le consentement "analytics" ait été accordé.
    *   **Cohérence** : Veillez à ce que le `user_id` soit disponible dans le dataLayer pour tous les événements et `page_view` d'un utilisateur connecté. Pour une intégration optimale, consultez notre expertise sur l'[audit dataLayer](/expertises/tracking/datalayer/audit-datalayer).
*   **Configuration GTM optimisée** :
    *   **Variable dédiée** : Créez une variable de couche de données `user_id` dans GTM.
    *   **Champ GA4** : Ajoutez systématiquement le champ `user_id` avec cette variable à votre tag de configuration GA4.
    *   **Déclencheurs conditionnels** : Utilisez les déclencheurs GTM pour s'assurer que le tag GA4 ne se déclenche qu'avec le consentement approprié.
*   **Intégration poussée du Consent Mode** :
    *   **Gestion des états** : Assurez-vous que l'état du consentement (`consent_status_analytics`) est correctement géré et que l'envoi du User-ID est conditionné par un consentement positif. Référez-vous à notre guide sur le [Consent Mode basique et avancé](/expertises/tracking/consentement/consent-mode-basique-avance).
*   **Processus de QA et de validation** :
    *   **Tests exhaustifs** : Mettez en place des scénarios de test pour vérifier la persistance, l'unicité et la bonne transmission du User-ID sur différents parcours utilisateurs et appareils.
    *   **Audit régulier** : Réalisez un [audit GA4](/expertises/tracking/ga4/audit-ga4) pour vérifier la qualité des données collectées et l'impact de votre stratégie User-ID sur le comptage des utilisateurs et les rapports.
    *   **Documentation** : Maintenez une documentation claire de la logique de génération et d'implémentation du User-ID, essentielle pour la maintenance et l'évolution de votre plan de marquage.
