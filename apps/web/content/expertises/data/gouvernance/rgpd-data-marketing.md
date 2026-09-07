---
title: "RGPD et data marketing : base légale et durée de conservation"
description: "Guide pratique sur les bases légales du RGPD pour le data marketing et les règles de durée de conservation des données."
publishedAt: 2026-09-07
status: published
categoryLabel: "Gouvernance data"
type: "guide"
level: "avance"
tags: ["RGPD", "data marketing", "base légale", "consentement", "intérêt légitime", "durée de conservation", "conformité", "CNIL"]
hook: "Maîtrisez les bases légales du RGPD et définissez des durées de conservation conformes pour vos activités de data marketing."
sources:
  - label: "CNIL - Les bases légales"
    url: "https://www.cnil.fr/fr/les-bases-legales"
  - label: "CNIL - La durée de conservation des données"
    url: "https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees"
  - label: "EDPB - Guidelines on Consent under Regulation 2016/679"
    url: "https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en"
  - label: "CNIL - Finalité d'un traitement"
    url: "https://www.cnil.fr/fr/definition/finalite-dun-traitement"
relatedInsights: []
relatedUseCases: []
relatedExpertises: 
  - "tracking/consentement/audit-cmp"
  - "tracking/consentement/consent-mode-basique-avance"
  - "tracking/consentement/impact-consentement-volume"
  - "tracking/consentement/qa-consentement"
---

Le Règlement Général sur la Protection des Données (RGPD) encadre strictement l'utilisation des données personnelles en data marketing. Comprendre et appliquer les bonnes bases légales ainsi que définir des durées de conservation appropriées est fondamental pour la conformité et la confiance des utilisateurs. Cet article détaille les mécanismes essentiels pour naviguer ces exigences complexes.

## Contexte du problème
Le data marketing, par nature, repose sur la collecte et l'analyse de vastes quantités de données personnelles. Or, le RGPD impose des principes stricts : licéité, loyauté, transparence, [limitation des finalités](https://www.cnil.fr/fr/definition/finalite-dun-traitement), minimisation des données, exactitude, limitation de la conservation, intégrité et confidentialité. Le défi majeur pour les marketeurs est de concilier l'efficacité des campagnes avec le respect de ces principes, notamment en justifiant chaque traitement par une base légale valide et en ne conservant les données que le temps nécessaire à la finalité déclarée. Une non-conformité expose à des sanctions significatives et à une perte de réputation.

## Mécanique concrète : choisir sa base légale et définir la durée
Le RGPD prévoit six bases légales pour le traitement des données personnelles. En data marketing, les plus courantes sont le **consentement**, l'**intérêt légitime** et l'**exécution d'un contrat**.

### 1. Choisir la base légale
*   **Consentement** : C'est la base la plus claire et la plus protectrice. Le consentement doit être [libre, spécifique, éclairé et univoque](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en). Il est requis pour les cookies non essentiels, l'envoi de prospection commerciale par e-mail à des non-clients, ou le partage de données avec des tiers à des fins marketing. Un mécanisme de recueil de consentement (CMP) est indispensable.
*   **Intérêt légitime** : Peut être invoqué si le traitement est nécessaire aux intérêts légitimes du responsable de traitement ou d'un tiers, à condition que ces intérêts ne prévalent pas sur les droits et libertés fondamentaux de la personne concernée. Il nécessite une **balance des intérêts** documentée. Exemples : lutte contre la fraude, personnalisation de l'expérience client sur un site web (sans cookies non essentiels), prospection B2B (sous certaines conditions), ou l'envoi d'e-mails de prospection à des clients existants pour des produits similaires (soft opt-in). La [CNIL détaille les bases légales](https://www.cnil.fr/fr/les-bases-legales).
*   **Exécution d'un contrat** : Lorsque le traitement est nécessaire à l'exécution d'un contrat auquel la personne est partie, ou à l'exécution de mesures précontractuelles. Exemples : gestion d'une commande, livraison d'un produit. Les données collectées pour ces finalités ne peuvent être utilisées à des fins marketing sans une autre base légale.

### 2. Définir la durée de conservation
Le principe de **limitation de la conservation** impose de ne pas conserver les données personnelles au-delà de ce qui est nécessaire aux finalités pour lesquelles elles sont traitées.
*   **Finalité** : La durée doit être proportionnée à la finalité. Par exemple, des données de navigation pour l'analyse d'audience peuvent être conservées moins longtemps que des données clients pour la gestion de la relation commerciale.
*   **Catégorie de données** :
    *   **Données de navigation/analytics** : Souvent 13 ou 25 mois pour les identifiants (cookies, IP anonymisée), conformément aux recommandations de la CNIL pour les statistiques d'audience.
    *   **Données clients (CRM)** : Généralement 3 ans après le dernier contact commercial ou la fin de la relation contractuelle, à des fins de prospection.
    *   **Données transactionnelles** : Peuvent être conservées plus longtemps pour des obligations légales (comptabilité, fiscalité), souvent 5 ou 10 ans.
*   **Politique de conservation** : Chaque organisation doit établir et documenter une politique de conservation claire, précisant les durées pour chaque catégorie de données et les modalités de suppression ou d'anonymisation. La [CNIL fournit des lignes directrices sur la durée de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees).

## Pièges connus et erreurs fréquentes
*   **Abus de l'intérêt légitime** : Utiliser l'intérêt légitime comme base par défaut pour des traitements qui nécessitent un consentement explicite, sans réaliser une balance des intérêts rigoureuse et documentée.
*   **Consentement non conforme** : Recueillir un consentement qui n'est pas libre (cases pré-cochées), spécifique (finalités non détaillées), éclairé (informations manquantes) ou univoque (ambiguïté).
*   **Durées de conservation indéfinies** : Conserver les données "pour toujours" ou sans politique claire, augmentant le risque en cas de violation de données et la non-conformité.
*   **Manque de documentation** : Ne pas pouvoir prouver la base légale du traitement ou la politique de conservation en cas de contrôle.
*   **Ignorer les droits des personnes** : Ne pas prévoir de mécanismes simples pour l'exercice des droits d'accès, de rectification, d'effacement ou d'opposition.

## Ce que Studio Jannah recommande
Studio Jannah préconise une approche proactive et documentée pour la conformité RGPD en data marketing :
*   **Audit et cartographie des traitements** : Identifiez toutes les données personnelles collectées, leurs finalités et les bases légales associées.
*   **Choix éclairé de la base légale** : Pour chaque traitement, évaluez la base légale la plus appropriée. Privilégiez le consentement pour les usages les plus intrusifs ou non essentiels.
*   **Mise en place d'une CMP robuste** : Utilisez une Consent Management Platform (CMP) pour gérer le consentement de manière granulaire et transparente, en lien avec le [Consent Mode](/expertises/tracking/consentement/consent-mode-basique-avance). Un [audit CMP](/expertises/tracking/consentement/audit-cmp) est souvent nécessaire.
*   **Définition et application de politiques de conservation** : Établissez des durées de conservation précises pour chaque catégorie de données, en accord avec les finalités et les obligations légales. Mettez en œuvre des processus d'anonymisation ou de suppression automatique.
*   **Documentation rigoureuse** : Tenez un registre des activités de traitement, des analyses d'impact (AIPD) si nécessaire, et des balances des intérêts pour l'intérêt légitime.
*   **Formation des équipes** : Sensibilisez vos équipes marketing et data aux enjeux du RGPD pour garantir une application cohérente des principes.
*   **Veille réglementaire** : Le paysage réglementaire évolue. Restez informé des dernières recommandations de la CNIL et de l'EDPB.
