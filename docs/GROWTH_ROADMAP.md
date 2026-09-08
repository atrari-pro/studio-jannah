# Growth Roadmap — Studio Jannah

État vivant, tenu par l'agent `.claude/agents/business-owner.md`. Chaque entrée : palier daté, preuve, décision. Pas de ligne "en cours" qui reste en cours indéfiniment — un palier est atteint, manqué (avec raison), ou abandonné (avec raison).

Vision longue : voir l'artifact "Monétiser le signal" (lien dans la mémoire projet). Ce fichier ne couvre que le fil actif du moment.

## Fil actif : diagnostic "agents IA bloqués" (déclencheur Cloudflare 15/09/2026)

**Contexte** : Cloudflare bloque par défaut les crawlers catégorie "Agent"/"Training" sur pages avec pub à partir du 15/09/2026 (nouveaux domaines, comptes gratuits). Adobe Digital Insights mesure une conversion du trafic agent IA en nette hausse en 2026. `scripts/agent-readiness-check.mjs` (mergé) détecte déjà, en HTTP simple sans headless, l'accessibilité réelle d'une page pour un crawler IA.

| Palier | Date cible | Preuve attendue | Statut |
|---|---|---|---|
| M0 — Outil + 3 contenus GEO/agents publiés | 08/09/2026 | PRs #89-93 mergées, live | ✅ Atteint |
| M1 — Script étendu : test par user-agent précis (GPTBot/ClaudeBot/PerplexityBot) | avant le 12/09 | Rapport JSON distinguant blocage par agent, testé sur cas réels | À faire |
| M2 — Contenu daté "Cloudflare 15/09" publié, exemples anonymisés | avant le 13/09 | Article live, `/blog` | À faire |
| M3 — Premier contact chaud (résultat de test personnalisé) envoyé à un vrai prospect | avant le 16/09 | Exécuté par Mohamed — pas automatisable par l'agent (règle : jamais de message à un prospect réel sans confirmation) | À faire |
| M4 — Premier engagement payé signé (forfait fixe diagnostic+correction) | avant le 30/09 | Facture ou accord écrit | À faire |
| M5 — Décision continuer/pivoter/arrêter ce fil | 30/09/2026 | Si M4 manqué : écrire pourquoi, ne pas relancer la même approche sans changement | — |

## Fils clos ou en pause

- **Free-tool `tracking-score` en scan à froid multi-sites** : testé le 08/09, 0/6 sites tiers passent l'anti-bot en headless. Décision : ne pas investir dans du contournement (coût récurrent, zone grise, mauvais ROI sur la cible à forte valeur). Piste retenue à la place : scan côté navigateur du prospect, pas côté serveur — pas commencé. Détail : mémoire `monetisation-au-dela-studio-jannah`.
- **Audit tracking à la valeur (Malt, % du gain)** : idée qualifiée, déjà un canal actif (missions Malt existantes) — pas un nouveau fil à démarrer, un canal à continuer tel quel.
- **Curation produits gagnants MENA (arabe)** : évaluée, mise de côté — nécessite une validation humaine directe (parler à 5-10 prospects réels) avant tout développement ; pas engagée à ce jour.
