---
title: 'Après le SEO et le GEO : le catalogue produit doit maintenant parler aux agents'
description: "Les agents commerce IA (Claude, ChatGPT, Perplexity) ne lisent pas votre site comme un humain — ils lisent des champs structurés, sans exécuter le JavaScript. Ce qui rend un catalogue produit visible, ou invisible, pour eux."
publishedAt: 2026-09-08
status: draft
rubrique: agents
format: text
featured: false
hook: "GTIN, disponibilité, politique de retour, avis — les agents IA acheteurs ne regardent pas votre page produit, ils parsent des champs. Un catalogue qui répond bien à un humain peut être totalement invisible pour un agent."
tags: ['agents IA', 'commerce agents', 'structured data', 'schema.org', 'GEO', 'e-commerce']
sources:
  - label: 'Anthropic — GitHub anthropics/commerce-agents (blueprint agents commerce, backend produit)'
    url: 'https://github.com/anthropics/commerce-agents'
  - label: 'Anthropic (Claude) — Building Commerce Agents with Claude'
    url: 'https://claude.com/blog/claude-for-commerce-agents'
  - label: 'Google — Structured data pour les produits (documentation Search)'
    url: 'https://developers.google.com/search/docs/appearance/structured-data/product'
relatedExpertises:
  - 'ia/geo-aeo/jsonld-structured-data'
  - 'ia/geo-aeo/ecrire-citation-ready'
---

## Deux couches distinctes, et la plupart des sites n'en ont ni l'une ni l'autre

**Être visible pour un agent IA acheteur recouvre deux besoins techniques différents, pas un seul.** Le premier : être *cité et recommandé* quand un agent (ChatGPT, Perplexity, Google AI Mode) compare des produits pour répondre à une question — ça dépend de données structurées correctement balisées sur vos pages produit. Le second : être *transactionnable* par un agent commerce spécifique comme celui qu'Anthropic vient d'ouvrir en open source — ça dépend d'une intégration backend dédiée, pas d'un simple balisage. Confondre les deux mène soit à sous-investir (croire qu'un peu de JSON-LD suffit à tout), soit à sur-investir (lancer un chantier d'intégration API alors qu'un audit de structured data réglerait déjà l'essentiel).

## Ce que les agents lisent réellement sur une page produit

**Un agent IA acheteur ne lit pas votre page comme un visiteur : il parse des champs, et il n'exécute pas de JavaScript.** Les crawlers derrière ces agents (GPTBot, ClaudeBot, PerplexityBot) récupèrent le HTML brut servi par le serveur — tout balisage produit injecté côté client après coup est simplement invisible pour eux. Les champs qui comptent pour la logique de recommandation d'un agent : GTIN/MPN, marque, prix et prix promotionnel, disponibilité, état du produit, note et nombre d'avis, politique de retour, délai et coût de livraison. Un thème e-commerce standard (Shopify, PrestaShop, etc.) génère souvent un schema Product basique par défaut — mais laisse justement de côté les champs qui pèsent le plus dans la décision d'un agent : GTIN, avis agrégés, politique de retour, délais.

## Pourquoi ça devient un sujet business, pas juste technique

**Selon des prévisions Gartner reprises par plusieurs analyses sectorielles, les assistants d'achat IA pourraient intervenir dans environ 25 % des transactions e-commerce en ligne d'ici la fin 2026** — un chiffre de prévision, à traiter comme un ordre de grandeur, pas une mesure déjà constatée. Ce qui est mesuré, en revanche (voir notre article sur le [trafic amené par les agents commerce](/blog/agents-ia-shopping-trafic-invisible-tracking)) : ce trafic convertit déjà nettement mieux que le trafic classique quand il arrive sur le site. Un catalogue illisible pour les agents ne perd donc pas qu'une visibilité abstraite — il ferme l'accès à un segment de trafic qui, une fois sur le site, achète plus volontiers que la moyenne.

## Ce qui différencie un backend "citable" d'un backend "transactionnable"

**Le blueprint commerce agents d'Anthropic, publié en open source début septembre, n'impose aucun format de données figé côté catalogue : il attend une implémentation backend (`StorefrontBackend`) qui expose vos données existantes à l'agent, quel que soit votre système sous-jacent.** C'est un vrai chantier d'intégration, pas un ajout de balisage — mais il ne se substitue pas au premier niveau : sans structured data propre, votre catalogue reste de toute façon invisible pour les agents qui *comparent* avant de transiger (ChatGPT, Perplexity), même si vous intégrez un jour un backend commerce dédié.

## Ce qu'il faut vérifier en premier, avant tout chantier d'intégration

- **Le JSON-LD Product est-il rendu côté serveur**, présent dans le HTML brut reçu par un client sans JavaScript — pas injecté après coup par un script ?
- **Les champs à forte valeur de décision sont-ils remplis** : GTIN/MPN, disponibilité en temps réel, politique de retour, délai de livraison, note agrégée — pas seulement titre/prix/image ?
- **`robots.txt` autorise-t-il les crawlers IA connus** (GPTBot, Google-Extended, PerplexityBot, ClaudeBot) à accéder aux pages produit ?
- **Le checkout ou la page produit bloquent-ils un accès non-humain** de façon si stricte qu'un crawler légitime se fait aussi rejeter que du trafic malveillant ?

## Et pour la mesure, le tracking, le GEO ?

C'est la suite logique du travail GEO que Studio Jannah applique déjà à ses propres pages (JSON-LD entité, `llms.txt`, blocs de réponse extractibles) — appliqué cette fois au catalogue produit plutôt qu'à des articles. La bonne nouvelle : l'essentiel de l'écart entre un catalogue "citable" et un catalogue invisible se règle par un audit de structured data, pas par un chantier d'intégration lourd. Le second niveau — l'intégration transactionnelle à un agent commerce précis — ne se justifie qu'une fois le premier acquis.

## FAQ

**Faut-il intégrer le blueprint commerce agents d'Anthropic pour être visible par les agents IA ?**
Non, pas pour le premier niveau. Être cité et recommandé par un agent qui compare des produits dépend de données structurées correctement balisées, pas d'une intégration backend. L'intégration à un agent commerce spécifique est un chantier séparé, à envisager une fois le premier niveau acquis.

**Un thème e-commerce standard suffit-il pour le balisage produit ?**
Le schema Product généré par défaut couvre souvent titre, prix, image et disponibilité de base, mais omet fréquemment les champs qui comptent le plus pour la logique de recommandation d'un agent : GTIN/MPN, avis agrégés, politique de retour, délais de livraison.

**Comment savoir si mon catalogue est déjà lisible par un agent IA ?**
En vérifiant que le JSON-LD Product apparaît dans le HTML brut (pas seulement après exécution du JavaScript) et que les champs à forte valeur de décision sont remplis — un contrôle qui peut se faire page par page sans attendre un audit complet.

---

*Sources : [Anthropic — GitHub anthropics/commerce-agents](https://github.com/anthropics/commerce-agents), [Anthropic — Building Commerce Agents with Claude](https://claude.com/blog/claude-for-commerce-agents), [Google — Structured data pour les produits](https://developers.google.com/search/docs/appearance/structured-data/product) — traitement éditorial et angle GEO/structured data par Studio Jannah.*

*Studio Jannah — Mohamed Atrari.*
