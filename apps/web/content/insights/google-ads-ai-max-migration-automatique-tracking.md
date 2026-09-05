---
title: 'AI Max Google Ads : la bascule automatique qui teste votre tracking'
description: 'Dès le 1er septembre, Google migre vos campagnes Broad Match et ACA vers AI Max sans opt-in. Ce que ça change pour votre tracking de conversion.'
publishedAt: 2026-09-05
status: draft
rubrique: mesure
format: text
featured: false
hook: 'Google annonce +7 % de conversions avec AI Max. Un audit indépendant sur 30 000 termes de recherche trouve 99 % d''impressions sans la moindre conversion. La différence, c''est votre tracking.'
tags: ['Google Ads', 'AI Max', 'tracking', 'conversion', 'CRO', 'mesure']
sources:
  - label: 'Google Ads Developer Blog — Migrate Campaign-level Broad Match and Automatically Created Assets to AI Max'
    url: 'https://ads-developers.googleblog.com/2026/08/migrate-campaign-level-broad-match-and.html'
  - label: 'Search Engine Land — Google sets AI Max migration timeline for Search campaigns'
    url: 'https://searchengineland.com/google-sets-ai-max-migration-timeline-for-search-campaigns-485006'
  - label: 'NateCue — Google Ads AI Max Mandatory on Sep 1: What to Do'
    url: 'https://www.natecue.com/en/news/google-ads-ai-max-september-deadline/'
---

## Google Ads bascule vos campagnes vers AI Max sans vous demander votre avis

**Depuis le 1er septembre 2026, Google migre automatiquement — par vagues, jusqu'à fin septembre — toute campagne Search qui utilise le réglage Campaign-level Broad Match ou les Automatically Created Assets (ACA) vers AI Max, sans opt-in et sans option de retour en arrière.** Le vrai sujet n'est pas la nouveauté du produit : c'est que la qualité de votre tracking de conversion décide seule si cette bascule améliore vos résultats ou les dégrade silencieusement.

## Ce qui change concrètement dans vos comptes

La chronologie a été resserrée en quelques mois. AI Max est sorti de bêta le 15 avril 2026, avec une migration combinée initialement prévue en septembre pour Dynamic Search Ads (DSA), ACA et Broad Match. Le 3 août, Google a fermé la création de nouveaux réglages Campaign-level Broad Match et ACA "legacy" dans l'UI, Ads Editor et l'API. Le 11 juin, sous la pression des annonceurs inquiets d'un changement en pleine planification Q4, DSA a obtenu un sursis : sa propre migration a été repoussée à février 2027, publiée sur le Google Ads Developer Blog. ACA et Broad Match, eux, n'ont pas eu ce sursis.

Concrètement, à partir du 1er septembre : les campagnes en ACA reçoivent Search Term Matching et Text Customization activés par défaut ; les campagnes en Broad Match au niveau campagne reçoivent uniquement Search Term Matching, sans Text Customization ni Final URL Expansion automatiques. Les inclusions et exclusions de marque déjà configurées sont conservées telles quelles. La migration se fait "en place" : aucune nouvelle campagne à créer, aucune validation à cocher — le changement de comportement algorithmique arrive dans une campagne dont l'ID, le budget et l'historique restent identiques.

## L'écart entre le chiffre officiel et les audits indépendants

Google communique sur un gain moyen de +7 % de conversions à CPA équivalent. Ce chiffre est agrégé sur l'ensemble de 2026, exclut le retail, et mesure des campagnes où la suite complète de fonctionnalités AI Max est active — donc des comptes avec du volume de données et de la marge de budget.

Les audits indépendants racontent une autre histoire selon le terrain : une analyse portant sur 30 000 termes de recherche a trouvé que 99 % des impressions générées par AI Max n'avaient produit aucune conversion ; une autre étude, menée sur plus de 250 comptes retail, a mesuré un ROAS inférieur de 35 % par rapport aux réglages de correspondance traditionnels. La différence ne tient pas à un bug : Search Term Matching élargit le pool de requêtes éligibles, et cet élargissement ne vaut que si le signal de conversion qui guide l'algorithme est propre. Sur un compte à budget contraint ou au tracking imprécis, élargir le pool de requêtes revient simplement à dépenser plus sur du trafic de moins bonne qualité.

## Pourquoi la qualité du tracking de conversion est l'unique variable qui compte

AI Max optimise sur les signaux de conversion que vous lui envoyez — rien d'autre. Si les événements de conversion remontés depuis GA4 vers Google Ads sont dupliqués, mal valorisés, ou si les Enhanced Conversions ne sont pas actives avec des identifiants hashés à jour, l'algorithme explore plus large avec un signal qui ne s'améliore pas en retour. Et comme la migration ne s'accompagne d'aucun point de contrôle manuel, la dette de tracking déjà présente dans un compte se retrouve amplifiée automatiquement, au moment précis où la campagne bascule — sans alerte, sans écran de confirmation.

## Ce qu'il faut vérifier avant que l'automatisation ne prenne le relai

- **Auditer ce qui remonte réellement**, pas ce qui est "configuré" : les événements de conversion GA4 sont-ils reçus par Google Ads avec une valeur et une déduplication propres, ou seulement déclarés dans l'interface ?
- **Vérifier l'activation des Enhanced Conversions** et la fraîcheur des identifiants hashés transmis — un signal dégradé pénalise doublement une automatisation qui explore plus large.
- **Identifier avant le 30 septembre** les campagnes concernées (ACA ou Broad Match au niveau campagne) et documenter leur configuration actuelle, pour disposer d'un avant/après comparable une fois la bascule effective.
- **Revoir les exclusions et négatifs** : ils sont conservés automatiquement, mais ne couvrent pas les nouveaux types de requêtes que Search Term Matching va faire remonter.

## Et pour la mesure, le tracking, le CRO ?

C'est exactement le point que Studio Jannah défend dans son travail sur le contrat dataLayer : une automatisation publicitaire n'est jamais meilleure que le signal qu'on lui donne à manger. AI Max ne "répare" pas un tracking de conversion approximatif — il l'expose, à plus grande échelle et sans intervention humaine possible le jour de la bascule. Avant le 30 septembre, la priorité n'est pas de débattre du bien-fondé d'AI Max : c'est de vérifier que les événements de conversion qui vont désormais piloter des décisions algorithmiques automatiques reflètent fidèlement l'activité business réelle.

## FAQ

**Puis-je éviter la migration vers AI Max ?**
Non, pas après le 1er septembre. La seule façon d'y échapper était de désactiver Campaign-level Broad Match ou ACA avant cette date. Une fois la campagne migrée, il n'existe pas d'option pour revenir aux réglages précédents.

**Quelles campagnes sont concernées ?**
Les campagnes Search utilisant le réglage Campaign-level Broad Match ou les Automatically Created Assets (ACA). Dynamic Search Ads (DSA) suit un calendrier séparé, repoussé à février 2027.

**Le +7 % de conversions annoncé par Google est-il fiable ?**
C'est une moyenne agrégée sur 2026, hors retail, mesurée sur des comptes avec la suite complète AI Max active et du volume de données suffisant. Les audits indépendants montrent des résultats très variables selon la qualité du tracking de conversion en place.

**Que change Search Term Matching concrètement ?**
Ce réglage élargit l'éventail de requêtes de recherche sur lesquelles une annonce peut se déclencher, au-delà de la correspondance de mots-clés classique — d'où l'importance d'un signal de conversion propre pour que cet élargissement profite à la performance plutôt qu'au volume de dépense.

---

*Sources : [Google Ads Developer Blog](https://ads-developers.googleblog.com/2026/08/migrate-campaign-level-broad-match-and.html), [Search Engine Land](https://searchengineland.com/google-sets-ai-max-migration-timeline-for-search-campaigns-485006), [NateCue](https://www.natecue.com/en/news/google-ads-ai-max-september-deadline/) — traitement éditorial et angle mesure/tracking par Studio Jannah.*

*Studio Jannah — Mohamed Atrari.*
