---
title: "Migrer de Universal Analytics à GA4 dans GTM"
description: "Universal Analytics a cessé de traiter des données en 2023-2024 : ce qui reste à nettoyer dans un GTM hérité — tags, goals, ecommerce non retraduits."
publishedAt: 2026-09-06
status: published
categoryLabel: "GTM"
type: "guide"
level: "avance"
tags: ["GTM", "GA4", "migration", "Universal Analytics", "legacy"]
hook: "Ce guide ne couvre pas l'activation initiale de GA4 (achevée partout depuis le sunset) mais ce qui reste concrètement à nettoyer dans un conteneur GTM hérité — tags Universal Analytics orphelins, goals jamais remappés en conversions, ecommerce jamais retraduit — pour qu'un audit GTM en 2026 ne tombe plus dessus par surprise."
sources:
  - label: "Google — Universal Analytics is going away"
    url: "https://support.google.com/analytics/answer/12153313"
  - label: "Google — Passer à Google Analytics 4"
    url: "https://support.google.com/analytics/answer/10119380"
  - label: "Google — Configurer les événements Google Analytics 4 dans Tag Manager"
    url: "https://support.google.com/tagmanager/answer/9442095"
  - label: "Google — Tag Manager Developer Guide"
    url: "https://developers.google.com/tag-platform/tag-manager"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/gtm/audit-gtm"
  - "tracking/gtm/architecture-conteneur"
  - "tracking/gtm/gouvernance-gtm"
  - "tracking/datalayer/datalayer-ecommerce"
---

## Le problème que ce guide résout

Universal Analytics a cessé de traiter des données le 1er juillet 2023 (propriétés standard) et le 1er juillet 2024 (GA4 360), comme documenté par [Google sur l'arrêt d'Universal Analytics](https://support.google.com/analytics/answer/12153313). En 2026, la vraie question n'est plus "faut-il migrer" mais ce qui traîne encore d'un conteneur GTM hérité : tags UA jamais supprimés, goals jamais remappés en conversions GA4, enhanced ecommerce jamais retraduit au schéma `ecommerce`/`items[]`. Ce guide couvre ce nettoyage, pas l'activation initiale.

## La mécanique concrète

**GTM ne permet plus de créer un nouveau tag Universal Analytics.** Google a retiré ce type de tag de la liste des tags disponibles à la création après le sunset — seuls les tags UA créés avant cette date persistent dans les conteneurs qui ne les ont jamais nettoyés. Un tag UA laissé actif continue d'envoyer une requête réseau à chaque déclenchement, visible en Preview mode dans "Tags Fired", mais la propriété UA de destination ne traite plus rien depuis les dates de sunset : c'est un coût de performance navigateur pour une donnée qui n'arrive nulle part.

**Le modèle de données change de nature, pas seulement de nom.** UA structurait la mesure en sessions et en hits typés (pageview, event, transaction, social, timing — des types de hits distincts). GA4 aplatit tout en un seul modèle d'events : chaque interaction, y compris la vue de page, est un event, comme le documente [Google sur le passage à Google Analytics 4](https://support.google.com/analytics/answer/10119380). Un goal UA (destination URL, durée de session, pages/session, event) n'a pas d'équivalent automatique côté GA4 : chaque goal doit être retraduit manuellement en un event marqué comme conversion, via la procédure décrite par [Google pour configurer les événements GA4 dans Tag Manager](https://support.google.com/tagmanager/answer/9442095). Un goal "durée de session > 3 minutes" n'a d'ailleurs tout simplement pas de correspondance directe côté GA4 — ce n'est pas une case à cocher, c'est une conversation à avoir avec qui pilotait ce KPI.

**Les custom dimensions/metrics UA ne se remappent pas automatiquement.** UA les scopait en Hit / Session / User / Product. GA4 les scope en event-scoped (portées par une clé dans l'objet event) ou user-scoped (portées par une user property). Le remapping se fait dimension par dimension, pas par migration en masse — voir la [Tag Manager Developer Guide](https://developers.google.com/tag-platform/tag-manager) pour le mécanisme de déclaration des variables GTM qui alimentent ces dimensions.

**L'enhanced ecommerce UA (`ec:addProduct`, `ec:setAction`…) diffère structurellement du schéma ecommerce GA4.** Le schéma cible — objet `ecommerce` et tableau `items[]` — est détaillé dans [DataLayer e-commerce : le schéma GA4 `items[]`](/expertises/tracking/datalayer/datalayer-ecommerce) : ce n'est pas un simple renommage de clés, la structure elle-même change.

## Pièges connus

- **Tags UA laissés actifs "au cas où"**, des années après le sunset — zéro donnée récupérée en contrepartie, juste du bruit réseau et une ligne de plus à expliquer à chaque Preview mode.
- **Croire qu'un goal UA "était équivalent" à un event GA4 déjà présent** sans vérifier la logique de comptage — un goal de destination URL et un event `page_view` GA4 filtré ne comptent pas forcément la même chose selon les conditions posées côté UA.
- **Variables et triggers dédiés UA jamais nettoyés** (ex. variables Custom Dimension UA) qui traînent dans le conteneur, gonflant inutilement l'audit et la surface de confusion pour qui reprend le conteneur.
- **Confondre "propriété UA encore visible dans l'admin" avec "propriété qui mesure encore"** — l'historique reste consultable un temps après le sunset, la mesure active, elle, s'est arrêtée aux dates documentées par Google.
- **Retraduire l'ecommerce en gardant la structure UA** (objets `ec:` recopiés tels quels dans un format GA4) au lieu de reconstruire selon le schéma `ecommerce`/`items[]` réel — génère un ecommerce GA4 qui a l'air de fonctionner en Preview mais dont les rapports détaillés (par produit, par catégorie) restent vides ou incohérents.

## Ce que Studio Jannah recommande

Sur tout conteneur repris en 2026, l'[Audit GTM](/expertises/tracking/gtm/audit-gtm) doit inclure une recherche explicite de résidus Universal Analytics — filtrer la liste des tags par "Universal Analytics" ou par les variables de type Custom Dimension héritées — et les supprimer une fois confirmé qu'aucune propriété UA n'exploite plus la donnée. Documenter le mapping goals UA → conversions GA4 dans le plan de marquage, même a posteriori : c'est la seule façon de répondre sereinement à une question sur une baisse de KPI historique constatée au moment de la bascule. Ne jamais recréer de tag UA — de toute façon impossible depuis le retrait du type de tag — et traiter toute nouvelle mesure directement selon le modèle d'events GA4, sans chercher un équivalent 1:1 avec l'ancien monde.
