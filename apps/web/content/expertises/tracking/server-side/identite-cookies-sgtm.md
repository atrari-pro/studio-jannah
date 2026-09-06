---
title: "Identité et cookies en sGTM : FPID vs _ga"
description: "Server Managed ou JavaScript Managed : comment le Client GA4 gère l'identité en server-side, et pourquoi un mauvais choix scinde vos utilisateurs."
publishedAt: 2026-09-06
status: published
categoryLabel: "Server-side (sGTM)"
type: "guide"
level: "avance"
tags: ["sGTM", "GA4", "identité", "cookies", "server-side tagging"]
hook: "Comprendre pourquoi le Client GA4 en server-side tagging peut générer soit le cookie `_ga` habituel, soit un cookie `FPID` distinct — et savoir lequel choisir selon l'architecture de dispatch retenue."
sources:
  - label: "Google — Server-side tagging avec Google Tag Manager"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side"
  - label: "Google — Set up your own domain for the tagging server"
    url: "https://developers.google.com/tag-platform/tag-manager/server-side/domains"
  - label: "Simo Ahava — Split GA Events Between Client-Side And Server-Side Dispatch"
    url: "https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/"
relatedInsights:
  - "gtm-dispatch-selectif-client-server"
relatedUseCases: []
relatedExpertises:
  - "tracking/server-side/architecture-dispatch-client-serveur"
  - "tracking/server-side/audit-sgtm"
  - "tracking/server-side/securite-conformite-sgtm"
  - "tracking/gtm/audit-gtm"
---

## Le problème que l'identité serveur résout, et celui qu'elle peut créer

En client-side pur, l'identité d'un visiteur GA4 repose sur un mécanisme connu : le cookie first-party `_ga`, posé par `gtag.js` (ou par le tag GA4 dans GTM), lu et réécrit à chaque visite. En passant par un conteneur server-side, cette responsabilité peut être déplacée : c'est le **Client GA4** configuré côté serveur qui décide comment identifier le visiteur, et il propose deux mécanismes distincts, documentés dans la [documentation server-side de Google](https://developers.google.com/tag-platform/tag-manager/server-side). Le mauvais choix ne produit aucune erreur visible — il produit un utilisateur dédoublé dans les rapports, sans qu'aucune alerte ne se déclenche.

## La mécanique concrète : deux modes d'identité

**JavaScript Managed.** Le Client GA4 côté serveur lit et respecte le cookie `_ga` déjà posé par le tag GA4 côté client (via `gtag.js` ou le tag GTM standard). L'identité reste continue entre ce qui part en direct-to-Google depuis le navigateur et ce qui transite par le serveur : les deux chemins alimentent le même référentiel utilisateur, parce qu'ils partagent le même cookie.

**Server Managed.** Le Client GA4 génère et gère lui-même son propre cookie first-party, distinct de `_ga` — un cookie nommé `FPID`. Ce mode a un intérêt réel : il ne dépend d'aucun script côté navigateur pour exister, ce qui le rend plus robuste face aux restrictions de cookies tiers ou aux blocages agressifs. Mais il crée un référentiel d'identité **séparé** de celui utilisé par `_ga`.

Le point de bascule qui compte : ces deux modes ne sont interchangeables sans risque que si **tout** le trafic emprunte le même chemin (tout-client ou tout-serveur, sans mélange). Dès qu'une partie des événements part en direct-to-Google côté navigateur pendant qu'une autre transite par le serveur — un dispatch mixte, cadré dans le [framework de décision dispatch client/serveur](/expertises/tracking/server-side/architecture-dispatch-client-serveur) — le choix du mode d'identité cesse d'être un détail de configuration.

## Le piège d'identité, en détail

Si le Client GA4 est réglé en Server Managed pendant qu'une partie des événements d'un même visiteur arrive en direct depuis le navigateur (donc porteuse du cookie `_ga`), les deux flux atterrissent dans **deux référentiels utilisateurs différents** : `FPID` d'un côté, `_ga` de l'autre. GA4 ne les réconcilie pas automatiquement. Le symptôme, documenté par [Simo Ahava](https://www.simoahava.com/gtmtips/split-ga-events-between-client-side-server-side-dispatch/), n'est ni une erreur GTM ni un message d'alerte GA4 : c'est un même visiteur compté comme deux utilisateurs distincts, une attribution qui se fausse silencieusement, et un taux de conversion mesuré qui ne reflète plus la réalité du parcours.

La règle qui en découle est simple à énoncer, moins évidente à appliquer sans discipline : **dès qu'un dispatch mixte est en jeu, le Client GA4 côté serveur doit être en JavaScript Managed**, pour que le référentiel `_ga` reste la source d'identité commune aux deux chemins. Le mode Server Managed n'est un choix sûr que dans une architecture 100% server-side, où aucun événement ne part jamais en direct depuis le navigateur.

## Le rôle du domaine dans l'équation

Le mode d'identité ne fonctionne correctement que si le conteneur serveur répond sur un sous-domaine propre au site, configuré selon le [guide officiel de domaine](https://developers.google.com/tag-platform/tag-manager/server-side/domains) — pas sur l'URL brute de l'hébergement cloud. Un Set-Cookie émis depuis un domaine tiers (l'URL d'hébergement générique) perd le contexte first-party que l'ensemble du dispositif d'identité est censé préserver, quel que soit le mode choisi.

## Pièges connus

- **Changer de mode d'identité après la mise en production sans plan de migration.** Basculer de Server Managed à JavaScript Managed (ou l'inverse) rompt la continuité d'identité pour les visiteurs déjà porteurs de l'ancien cookie — un changement à documenter et à anticiper, pas à faire à la légère sur un site avec de l'historique de mesure.
- **Supposer qu'un dispatch "quasi tout-serveur" avec une exception ponctuelle échappe à la règle.** Une seule exception suffit à créer un dispatch mixte au sens de ce piège — la proportion d'événements concernés ne change rien à la mécanique de scission d'identité.
- **Confondre expiration du cookie côté client et côté serveur.** Les deux paramètres se règlent indépendamment ; une divergence non documentée entre les deux produit des durées de session ou de reconnaissance différentes selon le chemin emprunté par l'événement.
- **Ne jamais vérifier le mode réellement actif en configuration.** Le mode d'identité du Client GA4 se règle une fois, souvent à la migration, et n'est ensuite jamais revérifié — un audit régulier (voir l'[Audit sGTM](/expertises/tracking/server-side/audit-sgtm)) doit inclure ce point explicitement.

## Ce que Studio Jannah recommande

Trancher le mode d'identité au moment où l'architecture de dispatch est décidée, pas après coup en découvrant l'anomalie dans les rapports. Documenter explicitement le mode retenu et la raison du choix (dispatch mixte ou non) dans la même table de décision que celle recommandée dans le [framework de décision dispatch client/serveur](/expertises/tracking/server-side/architecture-dispatch-client-serveur), pour que ce choix reste traçable au-delà de la personne qui a fait la migration.
