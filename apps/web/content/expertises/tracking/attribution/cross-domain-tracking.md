---
title: "Cross-domain tracking : le linker param"
description: "Guide complet sur le linker parameter pour le cross-domain tracking avec GA4 et GTM, essentiel pour une attribution et une continuité de session précises."
publishedAt: 2026-09-06
status: published
categoryLabel: "Attribution & identité"
type: "guide"
level: "avance"
tags: ["tracking", "attribution", "cross-domain", "GA4", "GTM", "server-side"]
hook: "Maîtrisez le linker parameter pour assurer un suivi utilisateur fluide et une attribution juste à travers tous vos domaines, même les plus complexes."
sources:
  - label: "Configurer le suivi cross-domain pour Google Analytics 4"
    url: "https://support.google.com/analytics/answer/10071811"
  - label: "Suivi cross-domain dans Google Tag Manager (tag Linker)"
    url: "https://support.google.com/tagmanager/answer/12131703"
  - label: "Cross-domain tracking with Google Analytics 4"
    url: "https://www.simoahava.com/gtm-tips/cross-domain-tracking-google-analytics-4/"
  - label: "MDN — Same-origin policy"
    url: "https://developer.mozilla.org/fr/docs/Web/Security/Same-origin_policy"
relatedInsights: []
relatedUseCases: []
relatedExpertises:
  - "tracking/attribution/user-id-strategy"
  - "tracking/server-side/architecture-dispatch-client-serveur"
  - "tracking/datalayer/documentation-vivante"
  - "tracking/consentement/consent-mode-basique-avance"
---

Le suivi cross-domain est une mécanique essentielle pour unifier le parcours utilisateur sur plusieurs domaines ou sous-domaines. Le linker parameter, notamment `_gl` pour Google Analytics, permet de maintenir la continuité de la session et l'identité de l'utilisateur en transmettant l'identifiant client d'un domaine à l'autre. Il assure ainsi une attribution précise et une compréhension complète des interactions sur l'ensemble de votre écosystème digital.

## Contexte du problème : Pourquoi le suivi cross-domain est essentiel

Dans un environnement digital fragmenté, les utilisateurs interagissent souvent avec plusieurs domaines appartenant à la même entité (site e-commerce, plateforme de paiement, blog, site de support). Sans une solution de suivi cross-domain, chaque passage d'un domaine à l'autre est perçu comme une nouvelle session et un nouvel utilisateur par les outils d'analyse web. Cela conduit à des données d'attribution erronées, une sous-estimation de la durée de session réelle et une vision parcellaire du parcours client.

Les cookies, fondamentaux pour l'identification des utilisateurs, sont par défaut limités au domaine qui les a créés (principe du [Same-Origin Policy](https://developer.mozilla.org/fr/docs/Web/Security/Same-origin_policy) bien que le linker ne soit pas une exception à cette politique mais un mécanisme de transfert). Le linker parameter résout cette limitation en transférant l'identifiant client via l'URL, permettant au domaine de destination de recréer ou de mettre à jour son propre cookie d'identification.

## Mécanique concrète : Comment fonctionne le linker parameter

Le principe du linker parameter repose sur le transfert d'informations d'identification via les paramètres d'URL lors de la navigation entre domaines. Pour Google Analytics 4 (GA4) et Google Tag Manager (GTM), ce paramètre est généralement `_gl`.

### Implémentation Client-Side via GTM et GA4

1.  **Configuration dans GTM/GA4** : Pour activer le suivi cross-domain, vous devez spécifier la liste des domaines à lier dans la configuration de votre tag Google Analytics 4 (GA4) dans GTM. Dans les champs à définir, la variable `link_domains` doit contenir un tableau des domaines concernés (ex: `['domaine1.com', 'domaine2.com']`). Cette configuration indique à GA4 de générer et de lire le paramètre `_gl`.
    *   Le tag de configuration GA4 dans GTM, via ses paramètres de configuration, gère automatiquement l'ajout du paramètre `_gl` aux liens sortants vers les domaines spécifiés et la lecture de ce paramètre sur le domaine de destination. Vous pouvez consulter la documentation officielle de Google pour [configurer le suivi cross-domain pour Google Analytics 4](https://support.google.com/analytics/answer/10071811).
2.  **Génération du paramètre `_gl`** : Lorsqu'un utilisateur clique sur un lien menant à un domaine listé dans `link_domains`, GTM intercepte le clic et ajoute le paramètre `_gl` à l'URL de destination. Ce paramètre est un identifiant encodé qui contient l'ID client actuel (ClientID) ainsi que des informations de timestamp et de version. La documentation sur le [suivi cross-domain dans Google Tag Manager](https://support.google.com/tagmanager/answer/12131703) détaille le fonctionnement du tag Linker.
3.  **Lecture et utilisation sur le domaine de destination** : À l'arrivée sur le domaine de destination, le code de suivi GA4 (via le tag de configuration GTM) détecte la présence du paramètre `_gl` dans l'URL. Il extrait l'ID client et l'utilise pour définir ou mettre à jour son propre cookie `_ga` (le cookie d'identification de l'utilisateur). Cela permet de lier la session actuelle à l'ID client d'origine, assurant la continuité du parcours.

Simo Ahava propose une analyse approfondie du [cross-domain tracking avec Google Analytics 4](https://www.simoahava.com/gtm-tips/cross-domain-tracking-google-analytics-4/), soulignant les subtilités de cette implémentation.

### Potentiel du Server-Side GTM pour le cross-domain tracking

Le Server-Side GTM (SGTM) offre une approche plus robuste. Au lieu de s'appuyer uniquement sur le navigateur client pour ajouter et lire le `_gl` (ce qui peut être affecté par les bloqueurs de scripts ou les redirections), SGTM peut gérer ce processus côté serveur. Le conteneur serveur peut recevoir le `_gl` du client, le traiter, et potentiellement le réinjecter dans les redirections ou les requêtes serveur, offrant une meilleure résilience et un contrôle accru sur les cookies first-party.

## Pièges connus et erreurs fréquentes

Malgré sa puissance, le linker parameter est source de plusieurs erreurs courantes qui peuvent compromettre la qualité des données :

*   **Configuration incomplète des `link_domains`** : Oublier d'inclure un domaine dans la liste `link_domains` empêche le linker de fonctionner pour ce domaine spécifique, cassant la continuité du parcours.
*   **Redirections intempestives** : Les redirections 301 ou 302 mal configurées peuvent supprimer les paramètres d'URL, y compris `_gl`, avant que la page de destination ne puisse les lire. Il est crucial de s'assurer que les redirections conservent les paramètres d'URL.
*   **Liens générés par JavaScript** : Si les liens sont créés ou modifiés dynamiquement par JavaScript sans passer par le DOM standard ou sans l'intervention du linker GTM, le paramètre `_gl` peut ne pas être ajouté. Une attention particulière doit être portée aux formulaires POST ou aux appels `window.open()`.
*   **Iframes** : Le suivi cross-domain via iframes est notoirement complexe. Le linker param ne fonctionne pas nativement à travers les iframes sans une configuration spécifique de `postMessage` ou un paramétrage `allow-same-origin` pour la communication entre cadres, ce qui est souvent une faille de sécurité.
*   **Impact du Consent Mode** : Si le consentement pour les cookies analytiques est refusé, le mécanisme de lecture/écriture des cookies `_ga` est affecté. Le linker param peut être transmis, mais si le domaine de destination n'est pas autorisé à écrire le cookie, la continuité de session ne sera pas établie. Il est essentiel de bien intégrer le [Consent Mode basique et avancé](/expertises/tracking/consentement/consent-mode-basique-avance).
*   **Problèmes de SameSite cookies** : Bien que le linker résolve le problème cross-domain, les attributs `SameSite` des cookies peuvent influencer leur comportement. Une mauvaise gestion de ces attributs peut entraîner des problèmes de lecture des cookies même après le transfert du `_gl`.

## Ce que Studio Jannah recommande

Pour une implémentation réussie et robuste du suivi cross-domain avec le linker parameter, Studio Jannah préconise une approche méthodique :

*   **Audit exhaustif des parcours utilisateurs** : Identifiez tous les points de passage cross-domain (liens, formulaires, redirections, iframes) et cartographiez-les précisément. Cela inclut les parcours de paiement, les sous-domaines de blog, les portails clients, etc.
*   **Configuration GTM/GA4 rigoureuse** :
    *   **Vérifiez et maintenez à jour la liste `link_domains`** dans votre tag de configuration GA4 dans GTM. Assurez-vous qu'aucun domaine n'est oublié.
    *   **Utilisez le tag Linker** de GTM pour les cas où le tag de configuration GA4 ne suffit pas (ex: formulaires POST).
*   **Tests approfondis et QA continue** :
    *   **Utilisez le mode de prévisualisation GTM** et les outils de développement du navigateur pour vérifier la présence du paramètre `_gl` dans l'URL lors des transitions cross-domain.
    *   **Validez la persistance de l'ID client** (`_ga` cookie) sur le domaine de destination. Vous pouvez vous référer à notre [méthodologie QA tracking](/expertises/tracking/qa/methodologie-qa-tracking).
*   **Considérer le Server-Side GTM (SGTM)** : Pour une gestion plus résiliente et sécurisée du linker parameter, notamment face aux bloqueurs de scripts et aux évolutions des navigateurs. Le SGTM permet de mieux contrôler les cookies first-party et d'optimiser la transmission des données. Découvrez notre expertise sur l'[architecture dispatch client-serveur](/expertises/tracking/server-side/architecture-dispatch-client-serveur).
*   **Documentation vivante** : Maintenez une documentation claire et à jour de tous les domaines impliqués, des configurations GTM/GA4 et des cas d'usage spécifiques. C'est un pilier de notre approche de la [documentation vivante](/expertises/tracking/datalayer/documentation-vivante).
*   **Intégration du Consent Mode** : Assurez-vous que le linker parameter respecte les choix de consentement de l'utilisateur. Le suivi cross-domain ne doit être pleinement fonctionnel que lorsque le consentement pour les cookies analytiques est donné, en lien avec notre expertise sur le [Consent Mode basique et avancé](/expertises/tracking/consentement/consent-mode-basique-avance).
