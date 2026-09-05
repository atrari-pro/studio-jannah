---
title: 'Citations IA vers Reddit : un signal volatile, pas un KPI'
description: 'La part de Reddit dans les citations ChatGPT a chuté de 86 % en une semaine en août 2026. Ce que cette instabilité change pour le tracking de la notoriété.'
publishedAt: 2026-09-05
status: draft
rubrique: mesure
format: text
featured: false
hook: 'Un rapport dit que Reddit domine les citations IA. Une semaine plus tard, sa part s''effondre de 86 % sur ChatGPT — sans que les marques recommandées changent. Le vrai sujet, ce n''est pas Reddit : c''est la notoriété que plus aucun tracking ne voit.'
tags: ['GEO', 'AEO', 'dark social', 'tracking', 'IA', 'mesure']
sources:
  - label: 'Otterly.ai — The AI Citation Economy: What 1+ Million Data Points Reveal About Visibility in 2026'
    url: 'https://otterly.ai/blog/the-ai-citations-report-2026/'
  - label: 'Mi3 — Reddit, YouTube and TikTok citations collapse, but ChatGPT still recommends the same brands'
    url: 'https://www.mi-3.com.au/21-08-2026/very-rare-and-very-curious-chatgpt-guts-reddit-youtube-and-tiktok-citations-keeps'
  - label: 'Brandlight — The New Dark Funnel: How LLMs Are Hiding Your Customers'' Journey'
    url: 'https://www.brandlight.ai/blog/the-new-dark-funnel-how-llms-are-hiding-your-customers-journey'
---

## Reddit domine les citations IA — jusqu'à ce que sa part s'effondre en une semaine

**Un rapport Otterly.ai portant sur plus d'un million de citations (janvier–février 2026) montre que les plateformes communautaires, Reddit en tête, captent 52,5 % des citations tous moteurs IA confondus, contre 47,5 % pour les domaines de marque — avec de fortes disparités : 59,8 % de citations "marque" chez Google AI Overviews, 44,7 % chez ChatGPT, seulement 28,9 % chez Perplexity.** Un mois plus tard, un tout autre signal : la part de Reddit dans les citations ChatGPT s'effondre de 86 % en quelques jours. Deux données réelles, deux échelles de temps — et une seule vraie question pour le marketing : peut-on piloter quoi que ce soit sur un signal qui bouge autant ?

## Le chiffre qui fait le tour du marketing : Reddit, source n°1 des IA

L'étude Otterly.ai, qui analyse plus d'un million de citations produites par ChatGPT, Perplexity et Google AI Overviews sur janvier–février 2026, positionne Reddit et les forums communautaires comme la source la plus fréquemment citée, devant les sites de marque eux-mêmes sur deux des trois moteurs testés. C'est ce chiffre — "les communautés battent les marques" — qui a alimenté toute une vague de contenus AEO/GEO au premier semestre 2026 : produire sur Reddit et Quora pour espérer être cité, puisque c'est là que les LLM vont chercher leurs réponses.

Le détail par moteur nuance déjà la lecture à gros grain : Google AI Overviews reste nettement plus favorable aux domaines de marque (59,8 % de citations) que ChatGPT (44,7 %) ou Perplexity (28,9 %). Trois moteurs, trois logiques de source — une seule statistique moyenne écrase cette réalité si on ne regarde que le total.

## Le retournement d'août 2026 : Reddit perd 86 % de ses citations ChatGPT en une semaine

Mi3, citant des données Petra Labs, documente un effondrement brutal et daté : la part de Reddit dans les citations de ChatGPT, stable en moyenne à 3,83 % entre le 18 juillet et le 7 août 2026, tombe sous 1 % dès le 14 août — 0,52 % de moyenne sur la période du 14 au 17 août, soit une chute relative de 86,4 % en quelques jours. Les créneaux libérés ne vont pas à d'autres sites de marque : ils vont aux centres d'aide et à la documentation produit, dont la part dans les sources citées passe d'environ 2 % à 32 %. Le mécanisme identifié est un changement dans la façon dont ChatGPT construit ses requêtes de fan-out, avec un recours accru à l'opérateur `site:` pour interroger des domaines précis plutôt que le web ouvert.

Le point le plus contre-intuitif : les marques recommandées par ChatGPT ne changent quasiment pas pendant cet effondrement. Le modèle continue d'aller chercher du contenu sur Reddit en coulisses — il cesse simplement de le citer comme source visible. Mi3 souligne que le même phénomène s'était déjà produit en septembre 2025, avant de se résorber entièrement. Un signal qui s'effondre puis se rétablit sans prévenir n'est pas un signal sur lequel indexer une stratégie de contenu.

## "Fetched" vs "cited" : la distinction qui rend Reddit invisible à votre analytics

Brandlight nomme précisément ce que révèle l'épisode d'août 2026 : le "dark funnel" des LLM. Une marque peut être largement recommandée, mentionnée, "fetched" en coulisses par le modèle — sans jamais apparaître comme lien cité, et donc sans générer le moindre referral traceable dans un outil d'analytics classique. La citation visible n'est qu'une fraction, instable dans le temps, de ce que le modèle consulte réellement pour construire sa réponse. Le trafic issu de ces échanges — quand il existe — ressort le plus souvent en direct ou en dark social, sans paramètre UTM ni referrer exploitable.

Autrement dit : la notoriété qui se construit dans les réponses IA n'est pas seulement difficile à mesurer parce que les citations changent de source d'une semaine à l'autre. Elle est structurellement invisible dès qu'elle ne se traduit pas par un clic sur un lien cité — et ce lien cité, on vient de le voir, peut disparaître à 86 % sans que rien d'autre ne change dans la façon dont votre marque est recommandée.

## Ce qu'il faut vérifier avant de piloter quoi que ce soit sur une part de citations

- **Ne jamais figer un plan de contenu AEO/GEO sur une photo à un instant T** : la part Reddit/forums d'un rapport de janvier peut ne plus rien représenter en août — vérifier la date exacte de la donnée avant de la citer en interne comme un fait stable.
- **Distinguer "être recommandé" de "être cité avec un lien"** : ce sont deux métriques différentes, qui évoluent indépendamment l'une de l'autre, comme le montre l'épisode d'août 2026.
- **Ne pas attendre du referral tracking classique qu'il capture cette notoriété** : un dataLayer bien conçu peut identifier les sessions en provenance de domaines connus (chat.openai.com, perplexity.ai) quand le referrer existe, mais ne verra jamais l'exposition qui ne débouche pas sur un clic.
- **Croiser un signal de présence IA avec des méthodes indépendantes du clic** (mix marketing, tests d'incrémentalité) plutôt que de construire un KPI unique sur une part de citations mesurée par un seul outil à un seul moment.

## FAQ

**Reddit est-il vraiment la source n°1 des citations IA ?**
Selon l'étude Otterly.ai (1M+ citations, janvier–février 2026), les plateformes communautaires captent 52,5 % des citations tous moteurs confondus contre 47,5 % pour les domaines de marque — mais ce ratio varie fortement par moteur (59,8 % de citations "marque" chez Google AI Overviews contre 28,9 % chez Perplexity) et, comme le montre l'épisode d'août 2026, peut se retourner en quelques jours sur un moteur donné.

**Pourquoi la part de Reddit s'est-elle effondrée sur ChatGPT en août 2026 ?**
Petra Labs (données relayées par Mi3) attribue ce recul à un changement dans la construction des requêtes de fan-out de ChatGPT, avec un usage accru de l'opérateur `site:` pour cibler des domaines précis — au profit des centres d'aide et de la documentation produit plutôt que d'autres sites de marque.

**Si les citations Reddit disparaissent, la marque perd-elle en visibilité IA ?**
Pas nécessairement : Mi3 rapporte que les marques recommandées par ChatGPT sont restées quasiment identiques pendant l'effondrement des citations Reddit — le modèle continue de s'appuyer sur ce contenu sans le citer comme source visible.

**Comment le "dark funnel" des LLM se distingue-t-il du dark social classique ?**
Le dark social désigne un partage qui échappe au tracking (message privé, app de messagerie). Le dark funnel des LLM, tel que Brandlight le décrit, ajoute une autre couche : même quand une marque est citée, le lien peut être dépourvu de tracking de référence, et l'essentiel de l'exposition (mention sans lien, réponse consultée sans clic) n'a tout simplement aucune trace côté analytics.

## Et pour la mesure, le tracking, le CRO ?

Le vrai enseignement n'est pas "Reddit compte" ou "Reddit ne compte plus" — c'est qu'un chiffre de part de citations, aussi solide soit la méthodologie qui le produit, décrit un instant précis et peut s'inverser sans préavis. Studio Jannah applique à ce type de signal la même discipline qu'à un dataLayer : vérifier la date et la méthodologie avant de généraliser un chiffre tiers, distinguer ce qui est mesurable (un clic avec referrer) de ce qui ne l'est pas (une mention consultée sans clic), et ne jamais construire un pilotage marketing sur une seule source de vérité instantanée quand le signal sous-jacent a déjà démontré, deux fois en un an, sa capacité à bouger de 86 % en une semaine.

---

*Sources : [Otterly.ai](https://otterly.ai/blog/the-ai-citations-report-2026/), [Mi3](https://www.mi-3.com.au/21-08-2026/very-rare-and-very-curious-chatgpt-guts-reddit-youtube-and-tiktok-citations-keeps), [Brandlight](https://www.brandlight.ai/blog/the-new-dark-funnel-how-llms-are-hiding-your-customers-journey) — traitement éditorial et angle mesure/tracking par Studio Jannah.*

*Studio Jannah — Mohamed Atrari.*
