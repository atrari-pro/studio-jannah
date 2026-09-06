---
title: "Migrer un DataLayer : refonte de site, v1 vers v2"
description: "Traverser une refonte de site sans casser la mesure : run parallèle, synchro conteneur/code, continuité des identifiants et du consentement."
publishedAt: 2026-09-06
status: published
categoryLabel: "DataLayer"
type: "guide"
level: "expert"
tags: ["dataLayer", "migration", "refonte", "versioning", "GTM"]
hook: "Le guide pour traverser une refonte de site sans perdre la continuité de mesure — fenêtre de run parallèle, bascule conteneur synchronisée, et les pièges qui cassent un historique de reporting sans que personne ne le voie venir."
sources:
  - label: "Google — Data Layer (Tag Manager Developer Guide)"
    url: "https://developers.google.com/tag-platform/tag-manager/datalayer"
  - label: "Google — Passer à Google Analytics 4"
    url: "https://support.google.com/analytics/answer/10119380"
  - label: "Simo Ahava — A Simple Guide to the Google Tag Manager Data Layer"
    url: "https://www.simoahava.com/analytics/data-layer/"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/datalayer/documentation-vivante"
  - "tracking/datalayer/plan-de-marquage"
  - "tracking/datalayer/audit-datalayer"
  - "tracking/datalayer/datalayer-spa"
---

## Le problème que ce guide résout

Une refonte de site (nouveau CMS, nouvelle stack front) est l'un des moments les plus risqués pour la continuité de mesure : l'ancien dataLayer cesse de pousser des events au moment exact où le nouveau code part en prod, et si le nouveau schéma diffère — clé renommée, objet `ecommerce` restructuré — sans plan de bascule, le reporting affiche une rupture nette, un funnel coupé en pleine campagne, sans que personne ne le remarque avant que les chiffres tombent à zéro.

## La mécanique concrète

**Traiter la migration comme une révision du plan de marquage, pas comme une réécriture silencieuse.** Avant d'écrire la moindre ligne de code du nouveau site, documenter le changement de `schema_version` et chaque clé qui évolue dans le changelog du contrat dataLayer (voir l'article dédié à la documentation vivante), sur la structure de référence décrite par la [documentation officielle Data Layer de Google](https://developers.google.com/tag-platform/tag-manager/datalayer) — la migration doit être décrite avant d'être codée, pas reconstituée après coup en comparant deux implémentations.

**Fenêtre de run parallèle.** Déployer le nouveau dataLayer en environnement de préproduction pendant que l'ancien site continue de tourner en production, sur une fenêtre commune suffisante pour comparer directement les deux jeux de données — c'est la seule méthode fiable pour détecter une régression de schéma avant qu'elle n'affecte un rapport en prod, plutôt que de la découvrir a posteriori dans un export BigQuery.

**Synchronisation stricte conteneur / code.** La bascule du conteneur GTM (nouvelles variables, nouveaux triggers pour le schéma v2) doit être déployée exactement au même moment que le code du nouveau site — jamais avant (le conteneur lirait un schéma qui n'existe pas encore côté front), jamais après (le nouveau site pousse un schéma que rien n'exploite encore côté conteneur, créant un trou de données pendant l'écart). Cette logique de bascule synchronisée rejoint les recommandations de [Google sur les migrations de mesure](https://support.google.com/analytics/answer/10119380) : traiter le changement de schéma comme un cutover planifié, pas comme une transition progressive incontrôlée.

**Continuité des identifiants.** `transaction_id`, `item_id`, `user_id` (ou équivalents documentés dans le plan de marquage) doivent garder une structure identique entre v1 et v2 — un identifiant reconstruit différemment côté nouveau front (format, casse, source de génération) casse silencieusement toute jointure BigQuery entre les données d'avant et d'après bascule, une classe d'erreur détaillée dans le [guide de Simo Ahava sur le dataLayer GTM](https://www.simoahava.com/analytics/data-layer/), qui insiste sur la stabilité de structure des identifiants portés par le dataLayer.

**Redirections et paramètres de campagne.** Toute redirection mise en place lors de la refonte (nouvelles URLs, arborescence changée) doit impérativement préserver les paramètres UTM — un redirect qui droppe la query string casse l'attribution des campagnes actives au moment précis de la bascule. Dans le contrat dataLayer Studio Jannah, l'event `sj_campaign_land` dépend directement de la préservation de ces paramètres sur les entrées `/go/*`.

**Continuité du consentement.** Si le nom ou le domaine du cookie CMP change lors de la refonte, tout visiteur ayant déjà consenti se retrouve traité comme un nouveau visiteur non consentant. Le contrat dataLayer Studio Jannah documente un cas réel de cette classe de bug (révision 1.1.0, renommage du cookie CMP à l'introduction d'une nouvelle plateforme de consentement) : deux cookies au nom proche coexistant sur des périmètres différents, dont l'ordre de lecture par `document.cookie` n'est pas garanti par la spécification navigateur — le bandeau se réaffichait à chaque page pour les visiteurs concernés.

## Pièges connus

- **Bascule "big bang" sans fenêtre de recouvrement** — aucune donnée comparative disponible pour confirmer que le nouveau schéma capture bien ce que l'ancien capturait, la régression n'est détectée qu'après coup.
- **Conteneur GTM mis à jour avant ou après le déploiement du nouveau code** — trou de données le temps de l'écart, ou variables orientées vers des clés qui n'existent pas encore côté site.
- **Décommissionner l'ancien site ou l'ancien dataLayer avant d'avoir recetté le nouveau avec la checklist d'audit complète** — la tentation d'aller vite en fin de projet est justement le moment où le risque est le plus élevé.
- **Changer la structure d'un identifiant (format de `transaction_id`, casse d'une clé) sans le documenter comme changement MAJOR dans le changelog** — casse une jointure historique sans qu'aucune alerte ne le signale avant l'analyse suivante.
- **Oublier de vérifier la continuité du cookie de consentement** au changement de domaine, sous-domaine ou nom de cookie CMP.
- **Ne pas communiquer la date exacte de bascule aux équipes qui exploitent le reporting** — un changement de tendance dans un dashboard, sans contexte de date de coupure, est systématiquement interprété comme une baisse de performance plutôt que comme une rupture de mesure.

## Ce que Studio Jannah recommande

Documenter la date de bascule et la liste précise des changements de schéma dans le changelog du plan de marquage avant la mise en prod — jamais après, jamais "on verra ce qui a changé une fois en ligne". Faire tourner ancien et nouveau dataLayer en parallèle sur une fenêtre de quelques jours minimum si l'infrastructure le permet, et ne jamais décommissionner l'ancien site tant que le nouveau n'a pas passé l'intégralité de la checklist d'audit dataLayer sur son propre environnement, en conditions réelles.
