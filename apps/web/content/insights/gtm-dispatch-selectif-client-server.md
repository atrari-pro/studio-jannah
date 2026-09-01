---
title: "SGTM : router sélectivement pour sécuriser vos conversions"
description: "SGTM vendu comme fiable peut casser vos conversions. Dispatch sélectif, piège d'identité GA4, coût par requête : la mesure décryptée par Studio Jannah."
publishedAt: 2026-09-01
status: draft
tags: ["server-side tagging", "GTM", "GA4", "mesure", "CRO"]
hook: "Router certains events entre client-side et server-side GTM protège vos conversions d'une panne serveur — et peut aussi alléger la facture d'hébergement."
rubrique: "mesure"
format: "text"
featured: false
sources:
  - label: "Simo Ahava — Split GA Events Between Client-Side And Server-Side Dispatch"
    url: "https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/"
  - label: "Google — Server-side tagging avec Google Tag Manager"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side"
---

## Le server-side GTM n'est pas un totem d'invulnérabilité

**Vous avez migré vers un conteneur serveur GTM (SGTM) pour fiabiliser votre mesure — mais avez-vous vérifié ce qui se passe si c'est ce serveur-là qui tombe ?** Router tous les événements par défaut vers le SGTM les rend dépendants d'un seul maillon d'infrastructure. La parade documentée par Simo Ahava, référence reconnue de l'écosystème GTM/GA4, consiste à dispatcher sélectivement les événements les plus critiques (achat, lead, souscription) en direct-to-Google, tandis que le reste continue de transiter par le serveur. Une nuance de configuration, un vrai gain de résilience pour le pilotage business.

## Pourquoi le "tout SGTM par défaut" est un pari risqué

Le server-side tagging a été adopté massivement pour trois promesses : contourner les ad-blockers, prolonger la durée de vie des cookies first-party, et reprendre la main sur l'enrichissement de la donnée avant envoi à GA4 ou aux plateformes ads. Mais cette centralisation a un revers rarement mis en avant dans les argumentaires de migration : **le SGTM devient lui-même un point de panne unique**. Si le conteneur serveur est indisponible, surchargé, ou mal déployé lors d'une mise à jour, ce ne sont pas seulement des événements secondaires qui se perdent — ce sont potentiellement les conversions qui alimentent le reporting business et les décisions CRO.

C'est le point de départ de l'article technique de Simo Ahava publié sur [simoahava.com](https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/) : plutôt que de traiter le SGTM comme un choix binaire ("tout transite par le serveur" ou "rien n'y transite"), il documente comment router événement par événement.

## Comment fonctionne le dispatch sélectif, concrètement

Techniquement, tout se joue sur un seul paramètre du Google Tag dans GTM : `server_container_url`. Le définir au niveau du Google Tag envoie **par défaut** l'ensemble des événements vers le conteneur serveur — y compris, en sécurité, via une Event Settings Variable si un tag venait à se déclencher avant le Google Tag lui-même.

Pour faire passer un événement précis en direct-to-Google (bypasser le SGTM sur ce seul tag), il faut surcharger `server_container_url` **au niveau de ce tag** avec une valeur bien spécifique : une **chaîne vide**, et non `undefined`. La distinction compte : dans l'implémentation de GTM, `undefined` signifie "ignore ce champ, garde l'héritage" — alors qu'une chaîne vide (ou `null`) signifie "réinitialise, ne route pas vers le serveur". Une confusion entre les deux, et le bypass ne se produit tout simplement pas.

Ahava recommande d'encapsuler cette logique dans une **Custom JS Variable nommée explicitement**, du type `Server_Container_URL_Bypass` — pas pour la technique elle-même, mais pour la gouvernance : un nom de variable qui dit clairement son intention évite qu'un collègue, en relisant la configuration plus tard, ne la "corrige" par erreur en pensant réparer un oubli.

## Le piège d'identité GA4 à ne surtout pas rater

C'est la mise en garde la plus importante de tout le dispositif, et celle qui casse silencieusement un reporting sans qu'on comprenne pourquoi au premier regard. Dès qu'un site mélange dispatch direct-to-Google et transit par SGTM vers GA4, **le Client GA4 configuré dans le conteneur serveur doit impérativement être en identity "JavaScript Managed"** — celui qui s'appuie sur le cookie `_ga` partagé avec le client-side — et non en "Server Managed", qui génère son propre cookie `FPID` distinct.

Concrètement : si le Client GA4 est en Server Managed pendant qu'une partie des événements arrive en direct depuis le navigateur, les événements client-side et server-side d'un même visiteur atterrissent dans **deux référentiels utilisateurs différents**. Le symptôme n'est pas une erreur visible dans GTM ou dans GA4 — c'est un utilisateur qui se retrouve dédoublé dans les rapports, une attribution faussée, et des taux de conversion mesurés qui ne reflètent plus la réalité. Un point de vigilance à documenter en interne avant toute mise en production d'un dispatch mixte.

## Le bénéfice caché : la facture d'infra

Au-delà de la résilience, router sélectivement a un second effet, plus rarement anticipé au moment de la migration vers le server-side : **la plupart des hébergements de conteneurs serveur GTM facturent à la requête HTTP**. Envoyer systématiquement tous les événements — y compris ceux à faible valeur analytique — vers le SGTM par défaut, c'est payer pour un volume de trafic qui n'a pas toujours besoin de l'enrichissement ou de la persistance offerts par le serveur. Arbitrer, événement par événement, ce qui justifie le coût du transit serveur (contournement ad-blocker, enrichissement, cookie first-party) et ce qui peut repartir en direct sans perte de valeur, c'est une question de gouvernance de la stack de mesure autant que de résilience technique.

Important : Simo Ahava qualifie lui-même cette approche de **non-standard**. Ce n'est pas un réglage par défaut de GTM, ni une bonne pratique généralisée — c'est une technique de configuration avancée, à documenter clairement dans la configuration du conteneur pour que l'équipe qui reprend le tracking derrière comprenne pourquoi certains tags dérogent à la règle commune.

## Et pour la mesure, le tracking, le CRO ?

Le dispatch sélectif n'est pas un exercice de style GTM : c'est un choix de gouvernance de la donnée business. Protéger les événements de conversion (achat, lead, souscription) d'une panne du conteneur serveur, c'est protéger les métriques sur lesquelles s'appuie le pilotage CRO — taux de conversion, valeur par visite, attribution des campagnes. À l'inverse, laisser le piège d'identité GA4 s'installer silencieusement peut fausser ces mêmes métriques sans qu'aucune alerte technique ne se déclenche. Avant toute migration ou tout arbitrage server-side, la checklist tient en trois questions : quels événements sont réellement critiques pour le business, quel est l'impact d'une panne SGTM sur chacun, et le Client GA4 est-il configuré en JavaScript Managed si du dispatch mixte est en jeu.

## FAQ

**Faut-il envoyer tous les événements GA4 par le conteneur serveur GTM ?**
Non. C'est le réglage par défaut si `server_container_url` est défini sur le Google Tag, mais ce n'est pas obligatoire événement par événement. Les événements business-critiques peuvent être routés en direct-to-Google pour ne pas dépendre de la disponibilité du serveur.

**Comment bypasser le SGTM pour un tag spécifique ?**
En surchargeant `server_container_url` sur ce tag précis avec une chaîne vide (ou `null`) — jamais avec `undefined`, qui ne réinitialise pas le champ mais l'ignore.

**Quel est le principal risque du dispatch mixte client-side / server-side ?**
Un mauvais réglage d'identity sur le Client GA4 dans SGTM (Server Managed au lieu de JavaScript Managed), qui scinde les utilisateurs entre deux cookies différents (`FPID` vs `_ga`) et fausse l'attribution.

**Le server-side GTM coûte-t-il plus cher que le client-side ?**
Cela dépend de l'hébergement, mais la majorité des stacks facturent à la requête HTTP. Router uniquement les événements qui justifient le transit serveur permet de maîtriser ce coût.

---

*Source technique : [Simo Ahava, "Split GA Events Between Client-Side And Server-Side Dispatch"](https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/), simoahava.com — traitement éditorial et angle mesure/CRO par Studio Jannah.*

*Studio Jannah — Mohamed Atrari.*
