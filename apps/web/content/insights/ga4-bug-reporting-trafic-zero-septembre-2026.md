---
title: 'GA4 à zéro depuis le 1er septembre : pourquoi ce n''est (probablement) pas votre tracking'
description: 'Depuis le 1er septembre 2026, les rapports standards GA4 affichent zéro trafic pour de nombreux comptes — un bug de reporting confirmé, pas une panne de collecte. Comment le vérifier avant de toucher au tracking.'
publishedAt: 2026-09-11
status: draft
rubrique: mesure
format: text
featured: false
hook: 'Vos rapports GA4 montrent zéro visiteur depuis le 1er septembre. Le Realtime, lui, continue d''afficher des utilisateurs actifs. Avant de toucher à une seule ligne de tracking, vérifiez lequel des deux ment.'
tags: ['GA4', 'Google Analytics', 'tracking', 'mesure', 'reporting']
sources:
  - label: 'Search Engine Land — Google Analytics showing zero traffic on Sept. 1'
    url: 'https://searchengineland.com/google-analytics-showing-zero-traffic-on-september-1st-486448'
  - label: 'Search Engine Roundtable — Google Analytics Broken Again: September 1 Data Missing'
    url: 'https://www.seroundtable.com/google-analytics-broken-42002.html'
  - label: 'Google Analytics Community — Some of our websites stopped sending data to GA4 starting September 2, 2026'
    url: 'https://support.google.com/analytics/thread/464610251/some-of-our-websites-stopped-sending-data-to-ga4-starting-september-2-2026?hl=en'
---

## Vos rapports GA4 affichent zéro trafic depuis le 1er septembre : c'est un bug, pas une panne de collecte

**Depuis le 1er septembre 2026, de nombreux comptes GA4 voient leurs rapports standards (Active Users, trafic, la plupart des dimensions temporelles) tomber à zéro ou quasi zéro, un incident remonté en masse sur le forum d'aide Google Analytics et confirmé par Google comme un problème de reporting, pas une perte réelle de visiteurs.** Le signal le plus rassurant, mais aussi le plus contre-intuitif : Realtime a continué d'afficher des utilisateurs actifs pendant toute la durée de l'incident, preuve que la collecte de données fonctionnait normalement pendant que la couche qui agrège les rapports standards, elle, était cassée. Le risque n'est donc pas la baisse de trafic — il n'y en a pas — mais la réaction qu'elle déclenche chez qui la découvre en premier.

## Qu'est-ce qui a été touché, et qu'est-ce qui a continué de tourner normalement ?

**Ce sont les rapports standards de l'interface GA4 qui ont cessé d'afficher Active Users et le trafic à partir du 1er septembre ; le Realtime, lui, n'a jamais décroché.** Le fil officiel du support Google Analytics, ouvert par plusieurs propriétaires de sites signalant que "certains de nos sites ont arrêté d'envoyer des données à GA4" à partir du 2 septembre, a été identifié comme le même problème : une panne du pipeline de reporting, pas de la collecte. Autrement dit, les hits partent bien du navigateur, arrivent bien côté Google, mais l'agrégation qui alimente les rapports standards ne les restitue pas correctement sur cette fenêtre.

C'est la troisième fois en quelques mois qu'un incident de ce type touche GA4 sur le volet reporting plutôt que collecte — un rappel que la fiabilité de l'interface Google et la fiabilité de votre dataLayer sont deux choses distinctes, et que confondre les deux coûte cher.

## Pourquoi ce bug est plus dangereux que la panne qu'il imite

**Le vrai risque de cet incident n'est pas le graphique à zéro : c'est la correction en urgence qu'une équipe applique en pensant réparer un tracking cassé, alors que rien ne l'était.** Face à un dashboard qui s'effondre du jour au lendemain, le réflexe naturel est de suspecter la dernière modification en date — un déploiement, une mise à jour de la CMP, un changement de conteneur GTM — et de la défaire ou de la retoucher dans l'urgence. Sur un vrai bug de reporting Google, cette correction ne change rien au symptôme puisque le problème n'est pas côté site ; elle introduit en revanche un vrai risque de régression sur un tracking qui, lui, fonctionnait.

C'est un piège classique de la mesure : optimiser sur un signal cassé produit une décision cassée, même quand l'intention est bonne.

## Comment vérifier avant de toucher au tracking

**Avant de modifier quoi que ce soit sur un dataLayer, un conteneur GTM ou une configuration de consentement suite à une chute de trafic GA4, croisez au moins une source indépendante de l'interface standard GA4.** Concrètement :

- **Realtime GA4** : s'il affiche des utilisateurs actifs pendant que les rapports standards sont à zéro, la collecte fonctionne — c'est un problème de reporting.
- **BigQuery export** (si activé) : interroge les tables `events_*` directement, en amont de la couche d'agrégation des rapports UI.
- **Signaux business indépendants** : commandes, leads entrants (ex. table `leads` côté Supabase pour un site comme le vôtre), appels, réservations — des chiffres qui ne dépendent d'aucun outil Google.
- **Google Search Console** : les clics organiques suivent un pipeline distinct de GA4 ; une chute simultanée sur les deux serait un signal bien plus inquiétant qu'une chute sur GA4 seul.
- **Le fil support officiel Google Analytics Community** : en cas d'incident plateforme, d'autres comptes le signalent généralement en quelques heures, avec parfois une confirmation Google directement dans le fil.

Si ces sources indépendantes montrent une activité normale pendant que GA4 standard affiche zéro, l'explication la plus probable est un bug de reporting — pas une raison de toucher au tracking.

## Et pour la mesure, côté Studio Jannah ?

C'est exactement le genre de situation où un contrat dataLayer versionné et des événements `sj_*` documentés (voir `docs/TRACKING_DATALAYER.md`) font la différence : ils donnent une source de vérité indépendante de l'interface GA4, vérifiable événement par événement, pour confirmer en quelques minutes qu'un incident vient de la plateforme et pas de chez vous — au lieu de perdre une matinée à défaire un tracking qui n'était pas en cause.

## FAQ

**Mes conversions Google Ads sont-elles affectées par ce bug ?**
Les sources disponibles documentent l'incident sur les rapports standards GA4 (Active Users, trafic) et le Realtime, pas directement sur le reporting de conversions Google Ads — mais la prudence reste la même : vérifiez via une source indépendante (BigQuery export, signaux business) avant de modifier une configuration de suivi de conversion sur la seule base d'un dashboard GA4 en berne.

**Le bug est-il résolu ?**
À la date de publication de cet article, aucune date de résolution officielle n'a été communiquée par Google ; le fil support Google Analytics Community reste la référence à suivre pour une mise à jour de statut.
