# Growth Roadmap — Studio Jannah

État vivant, tenu par l'agent `.claude/agents/business-owner.md`. Chaque entrée : palier daté, preuve, décision. Pas de ligne "en cours" qui reste en cours indéfiniment — un palier est atteint, manqué (avec raison), ou abandonné (avec raison).

Vision longue : voir l'artifact "Monétiser le signal" (lien dans la mémoire projet). Ce fichier ne couvre que le fil actif du moment.

## Fil actif : diagnostic "agents IA bloqués" (déclencheur Cloudflare 15/09/2026)

**Contexte** : Cloudflare bloque par défaut les crawlers catégorie "Agent"/"Training" sur pages avec pub à partir du 15/09/2026 (nouveaux domaines, comptes gratuits). Adobe Digital Insights mesure une conversion du trafic agent IA en nette hausse en 2026. `scripts/agent-readiness-check.mjs` (mergé) détecte déjà, en HTTP simple sans headless, l'accessibilité réelle d'une page pour un crawler IA.

| Palier | Date cible | Preuve attendue | Statut |
|---|---|---|---|
| M0 — Outil + 3 contenus GEO/agents publiés | 08/09/2026 | PRs #89-93 mergées, live | ✅ Atteint |
| M1 — Script étendu : test par user-agent précis (GPTBot/ClaudeBot/PerplexityBot) | avant le 12/09 | `scripts/agent-readiness-check.mjs` testé sur 4 sites réels (Studio Jannah, La Redoute, Decathlon, Cdiscount) — 3 comportements distincts trouvés, pas un seul pattern | ✅ Atteint (08/09) |
| M2 — Contenu daté "Cloudflare 15/09" publié, exemples anonymisés | avant le 13/09 | Article "Cloudflare bloque les agents IA par défaut au 15 septembre" publié, 3 diagnostics distincts, sites testés anonymisés | ✅ Atteint (08/09) |
| M3 — Premier contact chaud (résultat de test personnalisé) envoyé à un vrai prospect | avant le 16/09 | **Étape humaine — Mohamed, pas l'agent.** Choisir 1-2 sites réels (avec accord ou sites déjà dans le réseau), lancer `node scripts/agent-readiness-check.mjs <url>`, envoyer le résultat en message chaud personnalisé. Jamais automatisé — règle business-owner.md. Confirmé après scan marché du 08/09 : rester en format service humain forfait fixe, pas produit/outil en libre-service (voir fil clos ci-dessous). | À faire |
| M4 — Premier engagement payé signé (forfait fixe diagnostic+correction) | avant le 30/09 | Facture ou accord écrit | À faire |
| M5 — Décision continuer/pivoter/arrêter ce fil | 30/09/2026 | Si M4 manqué : écrire pourquoi, ne pas relancer la même approche sans changement | — |

## Fils clos ou en pause

- **Idées produit SaaS "Agent Analytics" (lecture de logs serveur pour trafic crawler IA) et "Agent CRO" (scoring priorisé façon audit CRO sur `agent-readiness-check.mjs`)** — évaluées et écartées comme produits/outils autonomes le 08/09/2026. Scan marché réel (18 acteurs vérifiés, sources citées) : le sous-créneau "logs bots IA" est déjà couvert gratuitement en natif par Cloudflare AI Crawl Control (tout site derrière son CDN) et par des SaaS établis (Botify/JetOctopus en enterprise, ClayHog/CiteFlow en SMB) ; le sous-créneau "scoring CRO priorisé" est déjà couvert gratuitement par Google Chrome Lighthouse "Agentic Browsing" (intégré à Chrome DevTools depuis mai 2026) et par aicommerceaudit.com (audit gratuit 82 checks) ; le combo exact des deux idées est déjà vendu par un concurrent français direct, Crawlers.fr (29-79€/mo). Construire un produit ici reviendrait à concurrencer des acteurs financés jusqu'à ~1Md$ (Profound) ou des fonctionnalités gratuites de plateformes mondiales (Cloudflare, Google) — hors de portée solo, dépendance à un terrain qui bouge sans préavis. **Décision : pas d'outil/produit ; le script `agent-readiness-check.mjs` reste un accélérateur interne pour le service humain déjà prévu aux paliers M3-M4 ci-dessus, sans changement de ce plan.** Détail complet, sources et tableau comparatif : `docs/research/agent-analytics-market-scan-2026-09-08.md`.
- **Free-tool `tracking-score` en scan à froid multi-sites** : testé le 08/09, 0/6 sites tiers passent l'anti-bot en headless. Décision : ne pas investir dans du contournement (coût récurrent, zone grise, mauvais ROI sur la cible à forte valeur). Piste retenue à la place : scan côté navigateur du prospect, pas côté serveur — pas commencé. Détail : mémoire `monetisation-au-dela-studio-jannah`.
- **Audit tracking à la valeur (Malt, % du gain)** : idée qualifiée, déjà un canal actif (missions Malt existantes) — pas un nouveau fil à démarrer, un canal à continuer tel quel.
- **Curation produits gagnants MENA (arabe)** : évaluée, mise de côté — nécessite une validation humaine directe (parler à 5-10 prospects réels) avant tout développement ; pas engagée à ce jour.
