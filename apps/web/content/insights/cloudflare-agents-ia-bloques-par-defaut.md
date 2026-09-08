---
title: "Cloudflare bloque les agents IA par défaut au 15 septembre : 3 façons dont votre site y répond déjà"
description: "À partir du 15 septembre 2026, Cloudflare bloque par défaut les crawlers catégorie Agent/Training sur les pages avec pub. On a testé comment plusieurs sites e-commerce traitent déjà les agents IA — 3 comportements distincts, pas un seul."
publishedAt: 2026-09-08
status: published
rubrique: agents
format: text
featured: false
hook: "On a testé, avec les vrais user-agents (GPTBot, ClaudeBot, Perplexity), comment plusieurs sites e-commerce français traitent aujourd'hui les agents IA. Aucun des trois ne fait la même erreur — et une seule des trois se corrige en cochant une case."
tags: ['agents IA', 'Cloudflare', 'anti-bot', 'GEO', 'e-commerce', 'sécurité']
sources:
  - label: 'Cloudflare Blog — Your site, your rules: new AI traffic options for all customers'
    url: 'https://blog.cloudflare.com/content-independence-day-ai-options/'
  - label: 'Cloudflare Developers — Changelog: New options to manage AI traffic'
    url: 'https://developers.cloudflare.com/changelog/post/2026-07-01-ai-traffic-options/'
  - label: 'TechCrunch — Cloudflare''s new policy pushes AI companies to pay for publishers'' content'
    url: 'https://techcrunch.com/2026/07/01/cloudflares-new-policy-pushes-ai-companies-to-pay-for-publishers-content/'
relatedExpertises:
  - 'ia/geo-aeo/jsonld-structured-data'
  - 'ia/geo-aeo/indexnow-decouvrabilite'
---

## Ce qui change le 15 septembre, précisément

**Cloudflare classe désormais tout crawler en trois catégories — Search, Agent, Training — et bloque par défaut les deux dernières sur les pages qui affichent de la publicité, pour les nouveaux domaines et tous les comptes gratuits.** Search : "tout comportement qui collecte ou indexe votre contenu pour répondre plus tard à des questions dessus." Agent : "comportement automatisé qui agit, généralement en temps réel, pour le compte d'une personne, pour obtenir quelque chose maintenant." Training : "un crawler qui prend votre contenu pour entraîner ou affiner un modèle." Search reste autorisé par défaut ; Agent et Training basculent en blocage par défaut. Un site qui ne change rien avant le 15 septembre perd, sans action de sa part, l'accès pour les deux catégories qui portent le plus directement du trafic et de la conversion.

## Pourquoi la catégorie "Agent" est celle qui compte le plus

**La catégorie "Agent" couvre exactement le trafic qu'Adobe mesure comme convertissant nettement mieux que la moyenne** (voir notre article sur le [trafic amené par les agents commerce](/blog/agents-ia-shopping-trafic-invisible-tracking)) — un agent qui recherche, compare et parfois prépare un panier en temps réel pour un vrai client, pas un crawler qui indexe pour plus tard. Bloquer "Training" ferme l'accès aux futurs modèles ; bloquer "Agent" ferme l'accès à un client qui essaie d'acheter maintenant.

## Ce qu'on a trouvé en testant, pas en supposant

**On a testé, avec les vraies chaînes de user-agent (GPTBot, ChatGPT-User, ClaudeBot, Claude-User, PerplexityBot, Perplexity-User), comment plusieurs sites e-commerce français répondent aujourd'hui à un agent IA face à un navigateur classique.** Résultat : trois comportements distincts, pas un seul pattern généralisable — ce qui signifie qu'un diagnostic générique ("bloqué"/"pas bloqué") ne suffit pas, il faut regarder site par site.

- **Blocage aveugle** : un site testé bloque le navigateur classique *et* tous les agents IA de façon identique — la protection anti-bot ne fait aucune distinction, elle ferme la porte à tout le monde, y compris au trafic qui convertit le mieux.
- **Confiance non vérifiée** : un autre site bloque le navigateur classique mais laisse passer n'importe quelle requête qui *déclare* être GPTBot ou ClaudeBot dans son en-tête — sans vérification d'IP ni de certificat. N'importe qui peut écrire cette chaîne de caractères pour contourner la protection ; ce n'est pas seulement un problème de trafic manqué, c'est un problème de sécurité.
- **Ciblage de l'automatisation, pas du protocole** : un troisième site laisse passer aussi bien le navigateur classique que les agents IA en requête HTTP simple — sa protection cible spécifiquement les empreintes de navigateur automatisé (Playwright, Puppeteer), pas les requêtes HTTP nues.

## Ce que ça change concrètement pour un site e-commerce

Aucun de ces trois comportements n'est le résultat d'une décision consciente d'octobre 2026 — ce sont des configurations héritées de plusieurs années d'anti-bot pensé pour le scraping malveillant, avant que "agent IA acheteur" existe comme catégorie de trafic légitime. La bascule Cloudflare du 15 septembre ne crée pas le problème, elle le rend visible et daté : à partir de cette date, l'absence de configuration explicite devient elle-même une décision — celle de bloquer.

## Ce qu'il faut vérifier avant le 15 septembre

- **Votre compte Cloudflare (ou équivalent) a-t-il une politique explicite pour Agent/Training**, ou reposez-vous sur un défaut qui va changer sans préavis le 15 septembre ?
- **Un test avec les vraies chaînes de user-agent d'agents connus** donne-t-il le même résultat qu'un navigateur classique — ou une différence, dans un sens ou dans l'autre ?
- **Si un agent passe uniquement parce qu'il déclare son identité sans vérification**, c'est un trou de sécurité à corriger indépendamment de la question du trafic.
- **La protection distingue-t-elle "automatisation de navigateur" et "requête HTTP simple"** — les deux ne se comportent pas pareil face aux mêmes règles.

## Et pour la mesure, le tracking, le GEO ?

C'est la suite naturelle de ce qu'on documente depuis quelques jours sur la lisibilité des catalogues et l'attribution du trafic agent (voir aussi [après le SEO et le GEO, parler aux agents](/blog/agents-ia-acheteurs-catalogue-produit-lisible)) : un catalogue bien balisé ne sert à rien si l'infrastructure anti-bot bloque l'agent avant qu'il n'atteigne la page. La vérification prend quelques minutes par site ; la corriger, quand c'est un problème de configuration plutôt que de dev, encore moins.

## FAQ

**La bascule du 15 septembre touche-t-elle tous les sites Cloudflare ?**
Les nouveaux domaines qui s'installent sur Cloudflare et tous les comptes gratuits, par défaut. Les clients existants peuvent configurer ces réglages dès maintenant, dans un sens ou dans l'autre.

**Bloquer "Training" bloque-t-il aussi Google ou Bing ?**
Cloudflare le signale explicitement : Googlebot, Applebot et Bingbot combinent des fonctions Search et Training — bloquer Training peut donc aussi les affecter, même quand Search reste autorisé.

**Un site qui laisse passer un agent qui déclare "GPTBot" est-il protégé pour autant ?**
Pas nécessairement. Si la vérification repose uniquement sur la chaîne de user-agent déclarée, sans confirmation d'IP ou de certificat, n'importe qui peut se faire passer pour cet agent — un problème de sécurité distinct de la question du trafic légitime bloqué ou non.

---

*Sources : [Cloudflare Blog](https://blog.cloudflare.com/content-independence-day-ai-options/), [Cloudflare Developers — Changelog](https://developers.cloudflare.com/changelog/post/2026-07-01-ai-traffic-options/), [TechCrunch](https://techcrunch.com/2026/07/01/cloudflares-new-policy-pushes-ai-companies-to-pay-for-publishers-content/) — traitement éditorial, angle diagnostic et tests par Studio Jannah. Sites testés anonymisés : les échanges avec leurs propriétaires n'ont pas eu lieu, ils ne sont donc pas nommés ici.*

*Studio Jannah — Mohamed Atrari.*
